# 住好房展示平台 (ZHFPro)

## 项目概述

装修展示平台 V1.1：C端小程序展示装修作品 + 在线选材预约；B端管理后台审核作品、管理楼盘材料、处理选材订单。

> **📂 项目地图**：[PROJECT_MAP.md](PROJECT_MAP.md) — 所有文件、API、数据库表、组件的完整索引。开发新功能前先查此文件定位要改的文件。

## 与用户协作的准则

**用户是一位不懂技术的业务老板**，需求描述往往是业务场景而非技术术语。你必须以产品经理的视角理解用户意图，将业务语言翻译为技术方案——用户说的是"做什么"（What），你负责判断"怎么做"（How）。如果用户描述的方式有更好的替代方案，主动提出并解释利弊。

**核心铁律：每个改动都要能解释业务价值** — 改了一段代码却说不清它给业务带来什么好处，就是没理解到位。

> 通用编码行为准则（不臆测、不曲解、改动最小化、先确认再动手）见文末 Behavioral Guidelines。

---

## 技术栈

| 端 | 技术 |
|---|------|
| 后端 | Express 5 + Knex.js + better-sqlite3 (SQLite) |
| 管理后台 | React 19 + TailwindCSS 4 + Vite 8 + React Router 7 |
| 小程序 | 微信原生框架 (4 tab: 首页→分类→在线选材→我的) |

---

## 后端规范

### 目录结构
```
server/src/
├── app.js              # Express 应用 + 路由注册 + 全局错误处理
├── index.js            # 启动入口
├── config/index.js     # 配置（JWT_SECRET, PORT 等）
├── db/
│   ├── connection.js    # Knex 连接
│   ├── migrations/      # 数据库迁移文件
│   └── seeds/           # 种子数据
├── middleware/
│   ├── auth.js          # authenticate + requireRole
│   ├── upload.js        # multer 文件上传
│   └── validate.js      # 请求参数校验
├── routes/              # 路由层（仅参数校验和响应格式化）
├── services/            # 业务逻辑层（数据库操作）
```

### 路由注册（app.js）
- **公开接口**：`/api/v1/<resource>`
- **管理端接口**：`/api/v1/admin/<resource>`，必须使用 `authenticate` + `requireRole('admin')` 中间件

### 响应格式
```js
// 成功
res.json({ success: true, data: result });
res.status(201).json({ success: true, data: { id: ... } });

// 分页列表
res.json({ success: true, data: { list: [...], pagination: { page, page_size, total, total_pages } } });

// 错误（通过 next(err) 抛给全局错误处理器）
res.status(400).json({ error: { message: '...', status: 400 } });
```

### Service 层规范
- 命名：`<resource>Service.js`，导出对象字面量 `{ async method1(), async method2() }`
- 业务校验抛错：`throw Object.assign(new Error('消息'), { status: 400 })`
- 分页默认值：`page = Math.max(1, parseInt(p) || 1)`，`pageSize = Math.min(50, Math.max(1, parseInt(ps) || 20))`
- 关联计数使用子查询：`db.raw('(SELECT COUNT(*) FROM ... WHERE ...) as count')`
- 排序：`orderBy('created_at', 'desc')`
- 软更新 updated_at：`updates.updated_at = db.fn.now()`

### 数据库
- 表名和字段名：`snake_case`
- 主键：自增 `id`
- 时间戳：`created_at`, `updated_at`
- **重要**：`designers` 表是用户表（含 `role`, `personnel_type`, `status`, `employee_id` 等字段）
- 两套独立的分类系统：
  - `categories` 表 — 作品分类（house_type/area/style），由 `分类字典管理` 页面管理
  - `material_categories` 表 — 材料分类（地板/墙面/卫浴等），由 `材料分类管理` 页面管理

### 认证与权限
- JWT token，密钥在 `config.jwtSecret`
- `authenticate`：从 `Authorization: Bearer <token>` 提取 token，挂载 `req.user`（含 `personnel_type`）
- `requireRole(...roles)`：RBAC 工厂函数
- `requirePersonnelType(...types)`：人员类型校验（V1.3 新增）
- Admin 用户：`role = 'admin'`；designer 用户：`role = 'designer'`
- `personnel_type` 可选值：`designer` / `supervisor` / `engineer` / `design_director` / `engineering_director`
- 施工阶段权限：业务层校验 `phase.designer_id === userId` 等

### 施工流程（V1.3）
- 5 阶段：打拆→水电→油工→主材安装→竣工
- 阶段状态机：`assigned → design_uploaded → design_director_approved → design_admin_approved → construction_confirmed → construction_uploaded → engineering_director_approved → construction_admin_approved → owner_accepted`
- 驳回只回退当前阶段，不跨阶段
- 设计师≠设计总监，工程师≠工程总监（同一阶段角色分离）
- 总监驳回留痕（`construction_phase_logs` 表）
- 数据表：`construction_phases`（14 字段）、`construction_phase_logs`（action + detail）
- 小程序订阅消息：`wechatService.sendSubscribeMessage()`

---

## 管理后台规范

### 目录结构
```
admin/src/
├── main.jsx            # 入口
├── App.jsx             # AuthProvider + RouterProvider
├── index.css           # TailwindCSS 导入 + 全局字体
├── api/
│   └── client.js       # Axios 实例（baseURL=/api/v1, JWT 拦截器）
├── contexts/
│   └── AuthContext.jsx  # 认证状态管理（login/logout/user/token）
├── components/          # 可复用组件
│   ├── Layout.jsx       # 主布局（Sidebar + HeaderBar + Outlet）
│   ├── ProtectedLayout.jsx  # 认证守卫
│   ├── Sidebar.jsx      # 左侧导航菜单
│   ├── HeaderBar.jsx    # 顶部栏（面包屑 + 用户菜单）
│   ├── Modal.jsx        # 通用弹窗
│   ├── ConfirmDialog.jsx # 确认对话框
│   ├── EmptyState.jsx   # 空状态占位
│   ├── ErrorState.jsx   # 错误状态 + 重试
│   └── Toast.jsx        # Toast 通知（ToastProvider + useToast）
├── pages/               # 页面组件
├── hooks/
│   └── useKeyboardNav.js
└── router/
    └── index.jsx        # React Router 路由配置
```

### 组件 API 契约

**Modal** — 必须显式传入 `open` 属性！
```jsx
<Modal open={modalOpen} title="标题" onClose={closeFn} size="sm|md">
  {children}
</Modal>
```
注意：`open` 是必需的。组件内部判断 `if (!open) return null`。

**ConfirmDialog**
```jsx
<ConfirmDialog open={open} onClose={fn} onConfirm={fn}
  title="标题" message="描述" variant="danger|warning|default"
  confirmText="按钮文字" loading={false} />
```

**EmptyState** — prop 名是 `description`，不是 `desc`！
```jsx
<EmptyState icon="📦" title="标题" description="描述文字" size="sm|md" action={<btn/>} />
```

**ErrorState**
```jsx
<ErrorState message="错误消息" onRetry={retryFn} size="sm|md" />
```

**Toast** — 必须在 ToastProvider 内使用
```jsx
const toast = useToast();
toast.success('消息');
toast.error('消息');
```

### 页面结构模板（严格遵循 Works.jsx 标准）

```jsx
export default function PageName() {
  // ... state, fetch logic ...

  return (
    <div className="p-4 lg:p-6 space-y-4">                    {/* 1. 外层容器 — 必须有 p-4 lg:p-6 */}

      {/* 2. 顶部操作栏 — 白色卡片包裹 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">页面标题</h2>
            <p className="text-sm text-gray-500 mt-0.5">页面说明</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg>...</svg> 操作按钮
          </button>
        </div>
        {/* 筛选栏（如有）*/}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <input className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* 3. 错误提示 */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={refetch} />
        </div>
      )}

      {/* 4. 数据表格 — 白色卡片包裹 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon="📋" title="暂无数据" description="点击上方按钮添加" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['列1', '列2', '操作'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 ...">...</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                          <button className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 分页 */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>共 {pagination.total} 条</span>
                <div className="flex items-center space-x-1">
                  <button onClick={prevPage} disabled={page <= 1}
                    className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">上一页</button>
                  <span className="px-3 py-1 text-xs text-gray-600">{page}/{totalPages}</span>
                  <button onClick={nextPage} disabled={page >= totalPages}
                    className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">下一页</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

### 设计 Token（TailwindCSS Class 速查）

| 用途 | Class |
|------|-------|
| 页面外层 | `p-4 lg:p-6 space-y-4` |
| 卡片容器 | `bg-white rounded-xl shadow-sm border border-gray-100` |
| 卡片内边距 | `p-4` |
| 页面标题 | `text-lg font-bold text-gray-900` |
| 页面副标题 | `text-sm text-gray-500 mt-0.5` |
| 主操作按钮（深色） | `bg-slate-900 text-white hover:bg-slate-800` |
| 次要按钮（边框） | `bg-white border border-gray-300 text-gray-600 hover:bg-gray-50` |
| 危险按钮 | `bg-red-600 text-white hover:bg-red-700` |
| 表头行 | `border-b border-gray-100 bg-gray-50/50` |
| 表头文字 | `text-gray-500 font-medium text-xs` |
| 数据行 | `border-b border-gray-50 hover:bg-gray-50/50 transition-colors` |
| 数据主文字 | `font-medium text-gray-900` |
| 数据次文字 | `text-gray-500` 或 `text-gray-600` |
| 输入框 | `px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent` |
| 下拉框 | `px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500` |
| 状态标签 | `inline-flex px-2 py-0.5 rounded-full text-xs font-medium` |
| 加载动画 | `w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin` |
| 分页容器 | `border-t border-gray-100 text-sm text-gray-500` |
| 分页按钮 | `px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors` |

### 关键规则

1. **新增页面时，必须同步更新以下文件：**
   - `router/index.jsx` — 添加路由
   - `Sidebar.jsx` — 添加菜单项（`MENU_ITEMS` 数组）
   - `HeaderBar.jsx` — 添加 `BREADCRUMB_MAP` 条目

2. **Modal 组件必须传 `open` 属性**，否则弹窗不会显示。

3. **EmptyState 描述文字 prop 名是 `description`**，不是 `desc`。

4. **表格表头列数必须与数据列数一致**，`colSpan` 值需匹配。

5. **不要使用 `<text>` 元素**，React 中应使用 `<span>`。

6. **颜色系统**：
   - 主色调：`slate-900`（按钮/选中态），非蓝色
   - 边框：`gray-100`（卡片内）、`gray-200`（全局边框）
   - 背景：`gray-50`（页面/表头）
   - 成功：`green-*`，危险：`red-*`，信息：`blue-*`

7. **API 调用**：通过 `client` (axios) 调用，响应拦截器已解包 `response.data`。
   ```js
   const res = await client.get('/admin/properties', { params });
   setData(res.data.list);        // res 已经是 response.data
   setPagination(res.data.pagination);
   ```

---

## 小程序规范

### 页面跳转防闪烁模式

**所有通过 `navigateTo` 进入的页面必须使用 `onReady + ready` 模式**：

**JS 文件：**
```js
Page({
  data: { ready: false, loading: true, error: false, /* ... */ },

  onLoad(options) {
    // 解析参数，发起数据请求
    this.loadData();
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  async loadData() {
    this.setData({ loading: true, error: false, ready: false });
    try {
      const result = await api.xxx();
      const pageData = { /* data */, loading: false };
      if (this._readyFired) {
        this.setData(Object.assign({ ready: true }, pageData));
      } else {
        this._pageData = pageData;
      }
    } catch (err) {
      this.setData({ loading: false, error: true, ready: true });
    }
  },
});
```

**WXML 文件：**
```html
<view class="page">
  <!-- ready 之前只显示背景色，不渲染任何内容 -->
  <block wx:if="{{ready}}">
    <view wx:if="{{loading}}" class="page-loading">...</view>
    <view wx:elif="{{error}}" class="page-error">...</view>
    <block wx:else><!-- 实际内容 --></block>
  </block>
</view>
```

### 目录结构
```
miniprogram/
├── app.js / app.json / app.wxss
├── utils/
│   ├── api.js       # API 请求封装
│   ├── request.js   # wx.request 封装（JWT 注入）
│   └── constants.js # 状态映射常量
├── components/      # 可复用组件（swiper-banner, work-card, empty-state, loading-more）
└── pages/           # 页面
```

### Tab 顺序
首页 → 分类 → 在线选材 → 我的（选材在第 3 位）

---

## 业务规则摘要

- **订单号**：10位 = YYYYMMDD(6) + property_code(2) + daily_sequence(2)
- **价格快照**：`material_order_items.price_snapshot` 在下单时存储
- **操作日志**：`material_order_logs` 表记录订单状态变更
- **电话号码脱敏**：管理后台列表中对手机号中间4位显示 `****`
- **选材订单状态流转**：pending → approved → completed 或 pending → rejected

---

## 开发流程

1. **后端优先** → 管理后台 → 小程序
2. 新增功能需同步更新：
   - 后端：migration + route + service + app.js 路由注册
   - 管理后台：page + router + Sidebar + HeaderBar (BREADCRUMB_MAP)
   - 小程序：page + app.json 页面注册
3. **每次改动后验证构建**：`cd admin && npx vite build`
4. **保持 UI 一致性**：新增管理后台页面必须参照 Works.jsx 作为模板

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

