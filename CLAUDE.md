# 住好房展示平台 (ZHFPro) — V1.3

## 项目概述

装修展示平台：C端小程序 + B端管理后台。V1.3 已完整实现「设计审核→施工管理→业主验收」全流程闭环。

> 📂 [PROJECT_MAP.md](PROJECT_MAP.md) — 文件/API/数据库表/组件索引。开发前先查。

## 与用户协作的准则

用户是不懂技术的业务老板，以产品经理视角理解需求，将业务语言翻译为技术方案。如果用户描述的方式有更优方案，主动提出并解释利弊。**每个改动都要能解释业务价值。**

---

## 技术栈

| 端 | 技术 |
|---|------|
| 后端 | Express 5 + Knex.js + better-sqlite3 (SQLite) |
| 管理后台 | React 19 + TailwindCSS 4 + Vite 8 + React Router 7 |
| 小程序 | 微信原生框架 (4 tab: 首页→分类→在线选材→我的) |

---

## 环境配置（⚠️ 唯一入口）

**所有环境相关配置集中在根目录 `env.config.json`**，切换环境只改 `active` 字段：

```json
{
  "server": { "ip": "43.136.71.64", "ssh": "root@43.136.71.64" },
  "environments": {
    "test": { "port": 8081, "backend_port": 3001, "pm2_name": "zhf-server-test", "project_path": "/root/Zhf-Pro-test" },
    "prod": { "port": 8080, "backend_port": 3000, "pm2_name": "zhf-server", "project_path": "/root/Zhf-Pro" }
  },
  "active": "test"
}
```

| 模块 | 读取方式 | 说明 |
|------|---------|------|
| 小程序 | `constants.js` 读取 `miniprogram/env.js`（项目目录内） | 切换环境后需重新编译 |
| deploy.sh | 通过 `node -e "require('./env.config.json')"` 读取 | `./deploy.sh`=test，`./deploy.sh prod`=prod |
| 本地开发 | `start.sh` 生成 `miniprogram/env.local.js`（gitignored），`constants.js` 优先读取它 | 退出自动清理 |

**关键规则**：
- 小程序 `BASE_URL` **只有一处**：`miniprogram/utils/constants.js`，它从 `../env.js` 读取
- ⚠️ 小程序 `require()` 不能引用 miniprogram 目录外的文件，所以 env 配置在 `miniprogram/env.js`，不能放根目录
- 小程序其他文件（`request.js`、`api.js`、`util.js`、`app.js`）都从 `constants.js` 或 `app.globalData.baseUrl` 获取，**不要硬编码**
- Admin/H5 的 API 客户端使用相对路径 `/api/v1`，不依赖环境配置
- 改 IP 或端口 → 改 `env.config.json`（服务端）+ `miniprogram/env.js`（小程序端）
- 不要在小程序代码中写 `192.168.x.x` 或 `43.136.71.64` 等 IP 地址

---

## 用户体系（关键 — 两个独立维度）

`designers` 表存储所有用户：

| 维度 | 字段 | 取值 |
|------|------|------|
| **角色** | `role` | `admin` / `designer`(员工) / `owner`(业主) / `guest`(游客) |
| **人员类型** | `personnel_type` | `designer` / `design_director` / `engineer` / `engineering_director`（仅员工） |

**代码中的判断**：
- `app.isDesigner()` = `role === 'designer'` → **所有员工**（含设计师/总监/工程师）
- `app.isDesignerPersonnel()` = `personnel_type === 'designer'` → 仅设计师岗位
- `app.isOwner()` = `role === 'owner'` → 业主

**登录路由优先级**：`role === 'owner'` 最先判断，防止 personnel_type 误设时业主被当作员工。

---

## 施工流程（V1.3 核心）

5 阶段：**打拆 → 水电 → 油工 → 主材安装 → 竣工**

**完整业务链路**：
```
管理员派单 → 设计师提交整屋设计图 → 设计总监审核 → 管理员审核
→ 业主审核通过 → 派工(分配工程师+工程总监) → 5阶段施工
→ 每阶段完工 → 业主验收 → 下一阶段 → 竣工闭环
```

- **设计阶段独立于施工**：整屋设计由设计师完成，不等同于打拆阶段
- 阶段状态机 17 状态；驳回只回退当前阶段，不跨阶段
- **角色分离**：设计师≠设计总监，工程师≠工程总监
- 小程序 subscribeMessage 推送（模板 ID 在 `constants.js` 的 `TEMPLATE_IDS`）

---

## 后端速查

```
server/src/
├── app.js          # Express 应用 + 路由注册
├── index.js        # 启动入口
├── config/index.js # JWT_SECRET, PORT
├── db/ (connection + migrations + seeds)
├── middleware/ (auth.js + upload.js + validate.js)
├── routes/         # 仅参数校验和响应格式化
├── services/       # 业务逻辑
```

- 公开接口：`/api/v1/<resource>`
- 管理端：`/api/v1/admin/<resource>` + `authenticate` + `requireRole('admin')`
- `requireRole(...roles)` — RBAC；`requirePersonnelType(...types)` — 人员类型校验
- 响应格式：`{ success: true, data }` / 分页 `{ list, pagination: { page, page_size, total, total_pages } }` / 错误 `{ error: { message, status } }`
- Service 命名：`<resource>Service.js`，导出 `{ method1, method2 }`
- 分页默认：page=1, pageSize=20，上限 50

---

## 小程序关键模式

### onReady 防闪烁（navigateTo 进入的页面必须用）
```js
Page({
  data: { ready: false, loading: true, error: false },
  onLoad(options) { this.loadData(); },
  onReady() {
    this._readyFired = true;
    if (this._pageData) { this.setData(Object.assign({ ready: true }, this._pageData)); this._pageData = null; }
  },
  async loadData() {
    this.setData({ loading: true, error: false, ready: false });
    try {
      const result = await api.xxx();
      const pageData = { /* data */, loading: false };
      if (this._readyFired) this.setData(Object.assign({ ready: true }, pageData));
      else this._pageData = pageData;
    } catch (err) { this.setData({ loading: false, error: true, ready: true }); }
  },
});
```
WXML：`<block wx:if="{{ready}}">` 包裹所有内容，ready 前只显示背景色。

### request.js silent 模式
`http.get(url, data, { auth: true, silent: true })` — 静默请求：不弹 toast、401 不触发 clearLogin。用于 mine 页面 refreshState 等后台刷新场景。

### 竞态条件防范（app.js onLaunch）
`checkLogin()` 必须用 `silent: true` + 保存 `tokenAtCheck` 比对——旧校验结果返回时若 token 已被新登录替换，不能清登录态。

---

## 管理后台规范

### 新增页面检查清单
1. `router/index.jsx` — 路由
2. `Sidebar.jsx` — MENU_ITEMS
3. `HeaderBar.jsx` — BREADCRUMB_MAP
4. `cd admin && npx vite build` — 验证构建

### 组件陷阱
- **Modal**：必须显式传 `open` 属性
- **EmptyState**：prop 名是 `description`，不是 `desc`
- React 中不用 `<text>`，用 `<span>`

### 设计 Token（TailwindCSS）
| 用途 | Class |
|------|-------|
| 页面外层 | `p-4 lg:p-6 space-y-4` |
| 卡片 | `bg-white rounded-xl shadow-sm border border-gray-100 p-4` |
| 主按钮 | `bg-slate-900 text-white hover:bg-slate-800` |
| 次按钮 | `bg-white border border-gray-300 text-gray-600 hover:bg-gray-50` |
| 危险按钮 | `bg-red-600 text-white hover:bg-red-700` |
| 表头行/文字 | `border-b border-gray-100 bg-gray-50/50` + `text-gray-500 font-medium text-xs` |
| 数据行 | `border-b border-gray-50 hover:bg-gray-50/50 transition-colors` |
| 状态标签 | `inline-flex px-2 py-0.5 rounded-full text-xs font-medium` |
| 输入框 | `px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent` |
| 分页按钮 | `px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed` |
- 颜色：主色 `slate-900`，成功 `green-*`，危险 `red-*`，信息 `blue-*`
- API 调用：`const res = await client.get('/admin/xxx');` — 已解包，`res.data.list` 即数据

### 页面模板
参照 `Works.jsx`：外层 `p-4 lg:p-6 space-y-4` → 顶部操作栏卡片（标题+按钮+筛选）→ 错误区 → 数据表格卡片（loading/empty/table/pagination）

---

## 业务规则
- 订单号 10 位 = YYYYMMDD(6) + property_code(2) + daily_sequence(2)
- 手机号脱敏：中间 4 位 `****`；价格快照下单时存储
- 选材订单：pending → approved → completed / rejected
- 施工列表状态：`design_phase` + phase1 `owner_design_reviewed` → "待施工"，否则"设计阶段"

---

## 当前功能状态

**小程序**：
- 首页作品浏览+筛选、作品详情、热门推荐
- 在线选材（楼盘→材料→申请→进度跟踪）
- 设计师中心（个人信息+数据统计+作品管理）
- 施工全流程：设计提交→总监审→管理员审→业主审→派工→5阶段施工→验收
- 业主申请详情：设计阶段独立展示+设计图预览；施工进度仅进入施工后显示
- 各阶段人员信息：设计阶段显示设计师+设计总监，施工阶段显示工程师+工程总监，"暂无分配"明确提示
- 角色菜单：设计师/设计总监/工程师/工程总监各有对应功能入口，施工任务/全部项目分离

**管理后台**：
- 作品审核、人员管理、分类字典（作品/材料两套独立分类）
- 楼盘管理、材料管理、头像审核、图片管理
- 工程管理（MaterialOrders）：订单审核→开启施工→设计审核→派工→施工跟踪
- 详情侧边栏：设计管理 tab + 施工管理 tab（5阶段进度条+各阶段完工图+操作日志）
- 施工状态列表：设计阶段(紫) / 待施工(绿) / X/5施工中(蓝) / 已竣工(绿)

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
