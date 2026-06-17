# 住好房展示平台 V1.1 — 开发计划

> **版本**: V1.1.0  
> **日期**: 2026-06-12  
> **基准文档**: [zhf-v1.1-prd.md](./zhf-v1.1-prd.md)  
> **开发周期**: 30 个自然日  

---

## 📊 进度总览

| 阶段 | 天数 | 状态 | 完成率 |
|------|:---:|:---:|:---:|
| 第1阶段 · 需求评审 & 数据库设计 | Day 1-3 | ✅ 已完成 | 3/3 |
| 第2阶段 · 后端接口开发 | Day 4-12 | ✅ 已完成 | 9/9 |
| 第3阶段 · 前端开发 | Day 13-22 | ✅ 已完成 | 10/10 |
| 第4阶段 · 联调测试 | Day 23-27 | ✅ 已完成 | 5/5 |
| 第5阶段 · 部署回归 | Day 28-29 | ✅ 已完成 | 2/2 |
| 第6阶段 · 版本交付 | Day 30 | ✅ 已完成 | 1/1 |

| 天 | 内容 | 状态 |
|:--:|------|:---:|
| 1 | PRD 评审 + 技术方案 | ✅ |
| 2 | 数据库 Migration 编写 | ✅ |
| 3 | Seed 数据 + 接口契约确认 | ✅ |
| 4 | 楼盘管理 Service + Routes | ✅ |
| 5 | 材料分类管理 Service + Routes | ✅ |
| 6 | 材料管理 Service + Routes（上） | ✅ |
| 7 | 材料公开接口 + 按楼盘分组查询 | ✅ |
| 8 | 选材申请 — 用户端提交接口 | ✅ |
| 9 | 选材申请 — 用户端我的申请接口 | ✅ |
| 10 | 选材管理 — Admin 列表 + 详情 | ✅ |
| 11 | 选材管理 — Admin 审核 + 分配接口 | ✅ |
| 12 | 人员管理接口修改 + 全量自测 | ✅ |
| 13 | 小程序框架调整 + 楼盘筛选页 | ✅ |
| 14 | 楼盘专属选材页面 | ✅ |
| 15 | 申请提交页 + 提交成功页 | ✅ |
| 16 | 我的申请列表 + 详情页 | ✅ |
| 17 | 小程序全流程联调 + 自测 | ✅ |
| 18 | 管理后台 — 人员管理升级 + 楼盘管理 | ✅ |
| 19 | 管理后台 — 楼盘管理 + 材料分类管理 | ✅ |
| 20 | 管理后台 — 材料管理页面 | ✅ |
| 21 | 管理后台 — 选材管理（列表 + 详情面板） | ✅ |
| 22 | 管理后台 — 审核弹窗 + 分配弹窗 + 订单完成 | ✅ |
| 23 | 小程序 ↔ 后端全流程联调 | ✅ |
| 24 | 管理后台 ↔ 后端全流程联调 | ✅ |
| 25 | 两端交叉验证 | ✅ |
| 26 | 功能测试 | ✅ |
| 27 | Bug 修复收尾 | ✅ |
| 28 | 测试环境部署 | ✅ |
| 29 | 全功能回归 | ✅ |
| 30 | 文档 + 交付 | ✅ |

> **图例**：⬜ 待开始 ｜ 🔄 进行中 ｜ ✅ 已完成 ｜ ❌ 已跳过

---

## CAPABILITY

业主在微信小程序中按楼盘浏览硬装材料、按分类单选后提交选材申请；管理员在 React 管理后台审核申请、分配设计师与监理。交付后系统新增 5 张数据库表、25 个 API 端点、5 个小程序页面、4 个管理后台页面、1 个模块升级。

---

## CONSTRAINTS

| 约束 | 类型 | 说明 |
|------|------|------|
| 后端优先 | 固定 | API 先完成再写前端，每步有可测产出 |
| 现有接口零破坏 | 不变式 | V1.0 的 ~50 个 API 响应格式不变 |
| 两套分类体系隔离 | 不变式 | `categories`（作品分类）与 `material_categories`（材料分类）互不干扰 |
| 人员复用 designers 表 | 架构 | 通过 `personnel_type` 字段区分，不新建表 |
| SQLite 兼容 | 固定 | migration 语句须兼容 SQLite（无 AFTER、无存储过程） |
| 选材模块独立回滚 | 架构 | 5 张新表与 V1.0 6 张表无外键依赖 |

---

## IMPLEMENTATION CONTRACT

### Actors
- **小程序用户**（guest/designer/supervisor）— 浏览材料、提交申请、查看申请
- **管理员**（admin）— 管理楼盘/材料/分类、审核申请、分配人员
- **后端服务** — Express 5 + Knex.js + SQLite，JWT 认证
- **管理后台 SPA** — React 19 + TailwindCSS 4 + React Router 7

### Surfaces

| Surface | 新建/修改 | 说明 |
|---------|:---:|------|
| `server/src/routes/properties.js` | 新建 | 楼盘 CRUD（admin + public） |
| `server/src/routes/material-categories.js` | 新建 | 材料分类 CRUD |
| `server/src/routes/materials.js` | 新建 | 材料 CRUD |
| `server/src/routes/material-orders.js` | 新建 | 选材申请（用户端 + admin 端） |
| `server/src/services/propertyService.js` | 新建 | 楼盘业务逻辑 |
| `server/src/services/materialService.js` | 新建 | 材料+分类业务逻辑 |
| `server/src/services/materialOrderService.js` | 新建 | 申请+订单号生成+日志 |
| `server/src/db/migrations/002_add_material_tables.js` | 新建 | 6 张新表 + designers ALTER |
| `server/src/db/seeds/002_material_seed.js` | 新建 | 材料分类 + 示例数据 |
| `server/src/routes/designers.js` | 修改 | 新增 personnel_type/employee_id |
| `server/src/services/designerService.js` | 修改 | 同上 |
| `server/src/app.js` | 修改 | 注册 4 条新路由 |
| `admin/src/pages/Properties.jsx` | 新建 | 楼盘管理页 |
| `admin/src/pages/MaterialCategories.jsx` | 新建 | 材料分类管理页 |
| `admin/src/pages/Materials.jsx` | 新建 | 材料管理页 |
| `admin/src/pages/MaterialOrders.jsx` | 新建 | 选材管理页（含审核面板） |
| `admin/src/pages/Designers.jsx` | 修改 | 新增 personnel_type/employee_id |
| `admin/src/components/Sidebar.jsx` | 修改 | 菜单重命名+新增项 |
| `admin/src/router/index.jsx` | 修改 | 新增 4 条路由 |
| `miniprogram/pages/material-properties/index.*` | 新建 | 楼盘筛选页 (js/wxml/wxss/json) |
| `miniprogram/pages/material-selection/index.*` | 新建 | 楼盘专属选材页 |
| `miniprogram/pages/material-submit/index.*` | 新建 | 申请提交页 |
| `miniprogram/pages/material-success/index.*` | 新建 | 提交成功页 |
| `miniprogram/pages/material-orders/index.*` | 新建 | 我的申请列表页 |
| `miniprogram/pages/material-order-detail/index.*` | 新建 | 申请详情页 |
| `miniprogram/pages/mine/index.*` | 修改 | 新增"我的选材申请"入口 |
| `miniprogram/app.json` | 修改 | 新增页面注册 + Tab 配置 |
| `miniprogram/utils/api.js` | 修改 | 新增 API 函数 |
| `miniprogram/utils/constants.js` | 修改 | 新增订单状态映射 |

### States and Transitions

```
material_orders.status:
  pending ──approve──▶ approved ──complete──▶ completed
     │                      │
     └──reject──▶ rejected  │
                             │
                (管理员手动变更 complete)
```

### Interface Summary

| 类别 | 新增 | 修改 | 端点总数 |
|------|:---:|:---:|:---:|
| 楼盘 | 6 | 0 | 6 |
| 材料分类 | 4 | 0 | 4 |
| 材料 | 6 | 0 | 6 |
| 选材申请 | 9 | 0 | 9 |
| 人员管理 | 0 | 3 | 3 |
| **合计** | **25** | **3** | **28** |

---

## NON-GOALS

- 不实现材料库存/采购/物流
- 不实现在线支付
- 不实现 IM 通讯
- 不修改现有作品（cases）核心逻辑
- 不部署生产环境（待经费到位）

---

## OPEN QUESTIONS

| # | 问题 | 状态 | 阻塞 |
|---|------|:---:|:---:|
| 1 | 微信模板消息权限 | 未申请 | 审核通知降级为小程序内展示 |
| 2 | 楼盘小区编号规则 | 待运营确认 | 不阻塞（可后续修改） |
| 3 | Tab 图标资源（选材 icon） | 待设计 | 不阻塞（可用临时图标） |

---

## HANDOFF

**状态**: ready for direct implementation

**执行顺序**: `database-migration` → `api-connector-builder` → `dashboard-builder` → `miniprogram` → `verification-loop`

---

## 开发计划：30 天每日任务分解

### 第 1 阶段：需求评审 · 技术方案 · 数据库设计（Day 1-3）

#### Day 1 — PRD 评审 + 技术方案

| 项目 | 内容 |
|------|------|
| **任务** | 1. 通读 PRD，确认需求理解一致<br>2. 确认技术方案：路由结构、服务层设计、前端组件树<br>3. 明确接口契约（请求/响应格式、错误码） |
| **验收** | 技术方案无歧义，团队对需求理解一致 |
| **产出** | 接口文档骨架（Markdown） |

#### Day 2 — 数据库 Migration 编写

| 项目 | 内容 |
|------|------|
| **任务** | 1. 编写 `server/src/db/migrations/002_add_material_tables.js`<br>2. 包含 5 张新表（properties / material_categories / materials / material_orders / material_order_items / material_order_logs）<br>3. ALTER TABLE designers 新增 personnel_type + employee_id<br>4. 本地执行 migration 验证 |
| **关键文件** | `server/src/db/migrations/002_add_material_tables.js` |
| **验收** | `npm run migrate` 成功，DB Browser 查看 12 张表结构正确 |

**Migration 建表顺序**（按外键依赖）:
```
1. ALTER TABLE designers (ADD personnel_type, employee_id)
2. CREATE TABLE properties
3. CREATE TABLE material_categories
4. CREATE TABLE materials (FK → material_categories + properties)
5. CREATE TABLE material_orders (FK → properties + designers)
6. CREATE TABLE material_order_items (FK → material_orders + materials)
7. CREATE TABLE material_order_logs (FK → material_orders + designers)
```

#### Day 3 — Seed 数据 + 接口契约确认

| 项目 | 内容 |
|------|------|
| **任务** | 1. 编写 `server/src/db/seeds/002_material_seed.js`<br>   - 预置 7 个材料分类（地板/墙面/天花板/瓷砖/卫浴/橱柜/门窗）<br>   - 预置 2 个示例楼盘<br>   - 预置若干示例材料<br>2. 执行 seed 验证<br>3. 确认 28 个接口的请求/响应格式 |
| **关键文件** | `server/src/db/seeds/002_material_seed.js` |
| **验收** | seed 执行成功，DB 中有预置数据；接口文档定稿 |

---

### 第 2 阶段：后端接口开发（Day 4-12）

#### Day 4 — 楼盘管理 Service + Routes

| 项目 | 内容 |
|------|------|
| **任务** | 1. 创建 `server/src/services/propertyService.js`<br>2. 创建 `server/src/routes/properties.js`<br>3. 实现 6 个接口：list / detail / create / update / delete（admin） + list（public）<br>4. 在 `app.js` 注册路由<br>5. 删除前检查：关联材料时返回 409 |
| **关键文件** | `server/src/services/propertyService.js`<br>`server/src/routes/properties.js`<br>`server/src/app.js`（修改） |
| **验收** | curl 测试 6 个接口全部返回正确 JSON；含关联材料时 DELETE 返回 409 |

#### Day 5 — 材料分类管理 Service + Routes

| 项目 | 内容 |
|------|------|
| **任务** | 1. 在 `server/src/services/materialService.js` 中实现分类 CRUD<br>2. 创建 `server/src/routes/material-categories.js`<br>3. 实现 4 个接口：list / create / update / delete（admin）<br>4. 删除前检查：关联材料时返回 409 |
| **关键文件** | `server/src/services/materialService.js`<br>`server/src/routes/material-categories.js` |
| **验收** | curl 测试 4 个接口；DELETE 含材料分类时 409 |

#### Day 6 — 材料管理 Service + Routes（Day 1/2）

| 项目 | 内容 |
|------|------|
| **任务** | 1. 在 `server/src/services/materialService.js` 中实现材料 CRUD<br>2. 创建 `server/src/routes/materials.js`<br>3. 实现 admin 端 5 个接口：list（支持 property_id/category_id/keyword 筛选）/ detail / create / update / delete<br>4. 删除前检查：被申请引用时返回 409 |
| **关键文件** | `server/src/services/materialService.js`（追加）<br>`server/src/routes/materials.js` |
| **验收** | curl + 筛选参数测试通过 |

#### Day 7 — 材料公开接口 + 按楼盘分组查询

| 项目 | 内容 |
|------|------|
| **任务** | 1. 实现 public 接口：`GET /api/v1/properties/:propertyId/materials`<br>2. 返回数据按分类分组（供小程序选材页面使用）<br>3. 支持 keyword 搜索<br>4. 健全的 materialService 代码 |
| **关键文件** | `server/src/routes/materials.js`（追加 public 路由）<br>`server/src/services/materialService.js` |
| **验收** | `curl /api/v1/properties/1/materials` 返回按 category_id 分组数据；keyword 搜索正常 |

#### Day 8 — 选材申请 — 用户端提交接口

| 项目 | 内容 |
|------|------|
| **任务** | 1. 创建 `server/src/services/materialOrderService.js`<br>2. 创建 `server/src/routes/material-orders.js`<br>3. 实现 `POST /api/v1/material-orders`：<br>   - 校验 items 非空<br>   - 校验每类材料单选<br>   - **生成订单号**：10位 = 日期6位 + 小区编号2位 + 当日自增2位<br>   - 事务内写入：material_orders + material_order_items + material_order_logs<br>   - UNIQUE 约束 + 重试机制（最多 3 次） |
| **关键文件** | `server/src/services/materialOrderService.js`<br>`server/src/routes/material-orders.js` |
| **验收** | curl POST 返回 10 位订单号；同一小区同日提交第二个申请序号 +1；并发提交不重复 |

**订单号生成核心逻辑**:
```js
async function generateOrderNo(propertyCode) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // 20260612
  const prefix = today + propertyCode; // 2026061201
  // 查询当日该小区最大序号
  const last = await knex('material_orders')
    .where('order_no', 'like', prefix + '%')
    .orderBy('order_no', 'desc')
    .first();
  const seq = last ? parseInt(last.order_no.slice(-2)) + 1 : 1;
  if (seq > 99) throw new Error('当日申请已满');
  return prefix + String(seq).padStart(2, '0');
}
```

#### Day 9 — 选材申请 — 用户端我的申请接口

| 项目 | 内容 |
|------|------|
| **任务** | 1. `GET /api/v1/material-orders/my` — 我的申请列表（分页，按时间倒序）<br>2. `GET /api/v1/material-orders/detail/:orderNo` — 详情（含材料清单、人员信息、操作日志）<br>3. 数据隔离：只能查 `user_id === req.user.id` 的数据 |
| **关键文件** | `server/src/services/materialOrderService.js`（追加） |
| **验收** | 用户 A 查不到用户 B 的申请；详情返回 materials + designers + logs |

#### Day 10 — 选材管理 — Admin 列表 + 详情

| 项目 | 内容 |
|------|------|
| **任务** | 1. `GET /api/v1/admin/material-orders` — 申请列表<br>   - 支持筛选：property_id / order_no / status / date_range<br>   - 分页，每页 20 条<br>   - 手机号脱敏（138****8888）<br>2. `GET /api/v1/admin/material-orders/:orderNo` — 详情<br>   - 含材料清单、人员信息、操作日志 |
| **关键文件** | `server/src/services/materialOrderService.js`（追加）<br>`server/src/routes/material-orders.js`（追加 admin 路由） |
| **验收** | curl 按状态筛选正确；手机号中间 4 位显示为 **** |

#### Day 11 — 选材管理 — Admin 审核+人员分配接口

| 项目 | 内容 |
|------|------|
| **任务** | 1. `POST /api/v1/admin/material-orders/:orderNo/approve`<br>   - body: `{ designer_id, supervisor_id }`<br>   - 校验 designer/supervisor 存在且 personnel_type 正确<br>   - 更新 status→approved，记录 designer_id/supervisor_id/reviewed_by/reviewed_at<br>   - 写入操作日志<br>2. `POST /api/v1/admin/material-orders/:orderNo/reject`<br>   - body: `{ reason }`<br>   - 更新 status→rejected，记录 reject_reason<br>   - 写入操作日志<br>3. `PATCH /api/v1/admin/material-orders/:orderNo/complete`<br>   - status: approved → completed<br>4. `DELETE /api/v1/admin/material-orders/:orderNo` |
| **关键文件** | `server/src/services/materialOrderService.js`（追加） |
| **验收** | approve 后 status=approved/reviewed_at 非空；reject 后 status=rejected/reject_reason 非空；日志表有对应记录 |

#### Day 12 — 人员管理接口修改 + 全量自测

| 项目 | 内容 |
|------|------|
| **任务** | 1. 修改 `GET /api/v1/admin/designers` — 新增 personnel_type 筛选参数 + 响应字段<br>2. 修改 `POST /api/v1/admin/designers` — 支持 personnel_type, employee_id<br>3. 修改 `PUT /api/v1/admin/designers/:id` — 支持 personnel_type, employee_id<br>4. 全量 28 个接口 curl 回归测试<br>5. 边界测试：空列表、非法参数、未登录、权限不足 |
| **关键文件** | `server/src/routes/designers.js`（修改）<br>`server/src/services/designerService.js`（修改） |
| **验收** | Postman/Bruno 全量测试集通过 |

---

### 第 3 阶段：前端开发（Day 13-22）

#### 小程序端（Day 13-17）

#### Day 13 — 小程序框架调整 + 楼盘筛选页

| 项目 | 内容 |
|------|------|
| **任务** | 1. 修改 `app.json`：<br>   - 注册 6 个新页面路径<br>   - Tab 改为 4 个：首页/分类/在线选材/我的<br>   - 选材 Tab 图标（先用临时图标占位）<br>2. 在 `utils/api.js` 新增 6 个 API 函数<br>3. 在 `utils/constants.js` 新增订单状态映射<br>4. 创建楼盘筛选页 `pages/material-properties/index.*`<br>   - 搜索栏 + 楼盘卡片列表<br>   - 下拉刷新、空状态 |
| **关键文件** | `miniprogram/app.json`（修改）<br>`miniprogram/utils/api.js`（修改）<br>`miniprogram/utils/constants.js`（修改）<br>`miniprogram/pages/material-properties/index.{js,wxml,wxss,json}`（新建） |
| **验收** | 微信开发者工具中显示 4 个 Tab；选材 Tab 进入楼盘列表；搜索/点击跳转正常 |

**API 函数新增清单**:
```js
getProperties(keyword)           // GET /api/v1/properties
getPropertyMaterials(pid, kw)    // GET /api/v1/properties/:pid/materials
submitMaterialOrder(data)        // POST /api/v1/material-orders
getMyMaterialOrders(params)      // GET /api/v1/material-orders/my
getMaterialOrderDetail(orderNo)  // GET /api/v1/material-orders/detail/:orderNo
```

#### Day 14 — 楼盘专属选材页面

| 项目 | 内容 |
|------|------|
| **任务** | 1. 创建 `pages/material-selection/index.*`<br>2. 实现：<br>   - 顶部楼盘名 + 搜索图标（展开/收起搜索框）<br>   - 左侧分类导航（`scroll-view`，固定悬浮，高亮当前分类）<br>   - 右侧材料卡片两列网格<br>   - 每类单选逻辑（选中蓝色边框+勾）<br>   - 底部悬浮栏（已选数+总价+"下一步"按钮禁用态）<br>3. 材料搜索保留分类结构 |
| **关键文件** | `miniprogram/pages/material-selection/index.{js,wxml,wxss,json}`（新建） |
| **验收** | 分类切换正常；同分类单选逻辑正确；取消选中正常；底部栏实时更新；至少选 1 种后才可点下一步 |

**选材页面核心数据结构**:
```js
data: {
  propertyId: '',
  propertyName: '',
  categories: [],          // [{id, name, materials:[...]}]
  selectedMap: {},         // { categoryId: materialItem }
  searchKeyword: '',
  showSearch: false,
}
```

#### Day 15 — 申请提交页 + 提交成功页

| 项目 | 内容 |
|------|------|
| **任务** | 1. 创建 `pages/material-submit/index.*`<br>   - 已选材料清单展示<br>   - 表单：房号/联系人/电话（自动填充）/备注<br>   - 提交校验 + 登录检测<br>   - 调用 `submitMaterialOrder` API<br>2. 创建 `pages/material-success/index.*`<br>   - 显示订单号、状态、预计响应时间<br>   - "查看我的申请"按钮 → `pages/material-orders/index`<br>   - "返回首页"按钮 → `wx.switchTab('/pages/index/index')` |
| **关键文件** | `miniprogram/pages/material-submit/index.{js,wxml,wxss,json}`（新建）<br>`miniprogram/pages/material-success/index.{js,wxml,wxss,json}`（新建） |
| **验收** | 表单校验正确；提交后订单号显示正确；成功页跳转正常 |

#### Day 16 — 我的申请列表 + 详情页

| 项目 | 内容 |
|------|------|
| **任务** | 1. 创建 `pages/material-orders/index.*`<br>   - 申请列表（分页、下拉刷新、状态标签、空状态）<br>2. 创建 `pages/material-order-detail/index.*`<br>   - 材料清单 + 申请信息 + 服务人员（条件显示）+ 审核信息<br>   - 驳回原因红色显示<br>3. 修改 `pages/mine/index.*`<br>   - 新增"我的选材申请"菜单项<br>   - 所有登录用户可见 |
| **关键文件** | `miniprogram/pages/material-orders/index.{js,wxml,wxss,json}`（新建）<br>`miniprogram/pages/material-order-detail/index.{js,wxml,wxss,json}`（新建）<br>`miniprogram/pages/mine/index.{js,wxml}`（修改） |
| **验收** | 列表分页正常；详情各区块正确显示；已通过状态显示设计师和监理信息；已驳回显示原因 |

**Mine 页面菜单新增位置**:
```
设计师功能
  ├── 我的作品          （已有）
  └── 我的选材申请       （新增 ← 这里）
其他
  ├── 联系客服
  └── 退出登录
```

#### Day 17 — 小程序全流程联调 + 自测

| 项目 | 内容 |
|------|------|
| **任务** | 1. 完整流程走查：选材 Tab → 楼盘列表 → 选材页 → 提交申请 → 成功页 → 我的申请 → 详情<br>2. 边界测试：<br>   - 未登录提交 → 自动登录<br>   - 搜索无结果 → 空状态<br>   - 某分类无材料 → 空状态<br>   - 表单校验失败 → 错误提示<br>   - 网络断开 → 错误提示<br>3. 样式调整：对齐、间距、Tab 图标 |
| **验收** | 全流程无报错；所有状态正确展示；UI 对齐 PRD 原型 |

---

#### 管理后台端（Day 18-22）

#### Day 18 — 人员管理升级

| 项目 | 内容 |
|------|------|
| **任务** | 1. 修改 `admin/src/components/Sidebar.jsx`：<br>   - 菜单 "设计师管理" → "人员管理"<br>   - 新增菜单 "楼盘管理" `/properties`<br>   - 新增菜单 "材料分类" `/material-categories`<br>   - 新增菜单 "材料管理" `/materials`<br>   - 新增菜单 "选材管理" `/material-orders`<br>2. 修改 `admin/src/router/index.jsx`：新增 4 条路由<br>3. 修改 `admin/src/pages/Designers.jsx`：<br>   - 筛选栏新增 personnel_type 下拉<br>   - 表格列新增 personnel_type / employee_id<br>   - 新增/编辑弹窗新增 personnel_type / employee_id |
| **关键文件** | `admin/src/components/Sidebar.jsx`（修改）<br>`admin/src/router/index.jsx`（修改）<br>`admin/src/pages/Designers.jsx`（修改） |
| **验收** | 菜单正确显示 12 项；路由跳转正常；人员管理可筛选/创建/编辑 personnel_type |

**侧边栏新菜单顺序**:
```
仪表盘 > 作品管理 > 头像审核 > 人员管理 > 分类字典 > 用户管理 > 图片库 > 系统设置 > 楼盘管理 > 材料分类 > 材料管理 > 选材管理
```

#### Day 19 — 楼盘管理 + 材料分类管理页面

| 项目 | 内容 |
|------|------|
| **任务** | 1. 创建 `admin/src/pages/Properties.jsx`<br>   - DataTable：ID/名称/地址/封面图/选材功能/创建时间/操作<br>   - 筛选：关键词 + 选材功能状态<br>   - Modal：新增/编辑（含图片上传、小区编号、开通开关）<br>   - 删除前检查关联材料<br>2. 创建 `admin/src/pages/MaterialCategories.jsx`<br>   - DataTable：ID/名称/排序/材料数/创建时间/操作<br>   - Modal：新增/编辑（名称 + 排序）<br>   - 删除前检查关联材料 |
| **关键文件** | `admin/src/pages/Properties.jsx`（新建）<br>`admin/src/pages/MaterialCategories.jsx`（新建） |
| **验收** | 楼盘 CRUD 完整可用；选材开关切换正常；分类 CRUD 完整可用；删除保护生效 |

#### Day 20 — 材料管理页面

| 项目 | 内容 |
|------|------|
| **任务** | 1. 创建 `admin/src/pages/Materials.jsx`<br>   - DataTable：ID/缩略图/名称/品牌/楼盘/分类/单价/创建时间/操作<br>   - 筛选：楼盘下拉 + 分类下拉 + 关键词搜索<br>   - Modal：新增/编辑（楼盘选择 + 分类选择 + 图片上传 + 计价单位选择）<br>   - 删除前检查引用 |
| **关键文件** | `admin/src/pages/Materials.jsx`（新建） |
| **验收** | 材料 CRUD 完整可用；联动筛选（选楼盘→加载该楼盘分类的材料）正确 |

#### Day 21 — 选材管理页面（列表 + 详情面板）

| 项目 | 内容 |
|------|------|
| **任务** | 1. 创建 `admin/src/pages/MaterialOrders.jsx`<br>2. 实现申请列表：<br>   - 筛选栏：小区下拉 / 订单号输入 / 状态下拉 / 日期范围<br>   - 表格：订单号(可点击) / 楼盘 / 房号 / 申请人 / 电话(脱敏) / 时间 / 状态标签 / 操作<br>3. 实现详情侧边面板（slide-in panel）：<br>   - 材料清单表格<br>   - 申请信息区<br>   - 服务人员区（待审核时显示"待分配"）<br>   - 操作日志时间线<br>   - 底部操作按钮（待审核：审核通过 + 驳回申请） |
| **关键文件** | `admin/src/pages/MaterialOrders.jsx`（新建） |
| **验收** | 列表筛选正确；详情面板信息完整；操作日志按时间排序 |

#### Day 22 — 审核弹窗 + 分配人员弹窗 + 订单完成操作

| 项目 | 内容 |
|------|------|
| **任务** | 1. 审核通过弹窗：<br>   - 设计师下拉（筛选 personnel_type=designer，支持搜索）<br>   - 监理下拉（筛选 personnel_type=supervisor，支持搜索）<br>   - 确认按钮 → 调用 approve API<br>2. 驳回弹窗：<br>   - 预定义原因下拉<br>   - 自定义原因 textarea（必填，max 500）<br>   - 确认按钮 → 调用 reject API<br>3. 已完成操作：<br>   - 已通过订单显示"标记完成"按钮 → 调用 complete API<br>4. 删除操作：<br>   - ConfirmDialog → 调用 delete API |
| **关键文件** | `admin/src/pages/MaterialOrders.jsx`（追加） |
| **验收** | 审核通过后可查看分配的人员；驳回后列表状态更新；标记完成正常；操作日志追加 |

---

### 第 4 阶段：联调测试（Day 23-27）

#### Day 23 — 小程序 ↔ 后端全流程联调

| 项目 | 内容 |
|------|------|
| **任务** | 1. 选材浏览 → 分类选择 → 搜索 → 下一步（全路径）<br>2. 提交申请 → 订单号生成 → 成功页展示<br>3. 我的申请 → 列表 → 详情<br>4. 修复联调中发现的接口问题<br>5. 真机预览测试（微信开发者工具扫码） |
| **验收** | 小程序全流程无报错；真机预览正常 |

#### Day 24 — 管理后台 ↔ 后端全流程联调

| 项目 | 内容 |
|------|------|
| **任务** | 1. 楼盘管理 → 材料分类 → 材料管理（数据准备）<br>2. 选材管理列表 → 查看详情 → 审核通过(分配人员) → 列表刷新<br>3. 驳回 → 驳回原因同步<br>4. 订单完成 → 操作日志 |
| **验收** | 管理后台全流程无报错；数据在前后端一致 |

#### Day 25 — 两端交叉验证

| 项目 | 内容 |
|------|------|
| **任务** | 1. 小程序提交申请 → 管理后台立即可见<br>2. 管理后台审核通过 → 小程序申请详情更新<br>3. 管理后台驳回 → 小程序显示驳回原因<br>4. 管理后台标记完成 → 小程序状态更新 |
| **验收** | 两端数据实时同步；状态流转正确 |

#### Day 26 — 功能测试

| 项目 | 内容 |
|------|------|
| **任务** | 1. 按 PRD 逐一验证所有功能点<br>2. 记录 Bug 并修复<br>3. 测试用例执行：<br>   - 正向流程 10+ 条<br>   - 边界条件 15+ 条<br>   - 异常场景 10+ 条 |
| **验收** | 功能测试用例通过率 ≥ 95% |

**关键测试用例**:
| # | 场景 | 预期 |
|---|------|------|
| TC01 | 楼盘列表为空 | 显示空状态 |
| TC02 | 某分类无材料 | 显示"该分类暂无可用材料" |
| TC03 | 未选择材料点下一步 | 按钮灰色不可点 |
| TC04 | 同分类选第2个材料 | 自动取消第1个 |
| TC05 | 房号为空提交 | 红色错误提示 |
| TC06 | 订单号序号超99 | "今日申请已满" |
| TC07 | 审核分配不存在的设计师 | 后端返回 400 |
| TC08 | 删除有关联材料的楼盘 | 后端返回 409 |
| TC09 | 未登录访问我的申请 | 跳转登录页 |
| TC10 | 用户A查用户B的申请详情 | 后端返回 403/404 |

#### Day 27 — Bug 修复收尾

| 项目 | 内容 |
|------|------|
| **任务** | 1. Day 26 发现的所有 Bug 修复<br>2. 回归测试（修复后重新测试）<br>3. 边界情况完善<br>4. 样式细节调整 |
| **验收** | 零已知 Bug；回归测试通过 |

---

### 第 5 阶段：测试环境部署 · 回归测试（Day 28-29）

#### Day 28 — 测试环境部署

| 项目 | 内容 |
|------|------|
| **任务** | 1. 部署后端服务（本地/内网环境）<br>2. 执行 `npm run migrate` + `npm run seed`<br>3. 构建管理后台 `cd admin && npm run build`<br>4. 配置 Nginx/静态文件托管<br>5. 小程序真机调试模式连接测试环境 |
| **验收** | 三端（后端/管理后台/小程序）均可访问测试环境 |

#### Day 29 — 全功能回归

| 项目 | 内容 |
|------|------|
| **任务** | 1. 全功能回归测试（所有用例）<br>2. 性能验证：<br>   - 材料列表 API 响应 ≤ 500ms<br>   - 选材申请列表 API 响应 ≤ 1s<br>   - 小程序页面首屏 ≤ 2s<br>3. 兼容性验证：<br>   - 微信开发者工具模拟器<br>   - iOS 真机预览<br>   - Android 真机预览（如有条件）<br>   - Chrome + Edge 浏览器 |
| **验收** | 回归测试全通过；性能指标达标 |

---

### 第 6 阶段：版本交付（Day 30）

#### Day 30 — 文档 + 交付

| 项目 | 内容 |
|------|------|
| **任务** | 1. 输出测试报告<br>2. 输出上线文档（含部署步骤、环境配置、数据库迁移说明）<br>3. 更新 API 文档<br>4. Git 打 Tag：`v1.1.0`<br>5. 归档 PRD + 开发计划 + 测试报告 |
| **产出** | 测试报告、上线文档、API 文档、Git Tag |
| **验收** | 所有文档齐全；代码已 Tag |

---

## 关键文件总清单

### 新建文件（35 个）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `server/src/db/migrations/002_add_material_tables.js` | 数据库迁移 |
| 2 | `server/src/db/seeds/002_material_seed.js` | 种子数据 |
| 3 | `server/src/services/propertyService.js` | 楼盘服务 |
| 4 | `server/src/services/materialService.js` | 材料+分类服务 |
| 5 | `server/src/services/materialOrderService.js` | 选材申请+订单号+日志 |
| 6 | `server/src/routes/properties.js` | 楼盘路由 |
| 7 | `server/src/routes/material-categories.js` | 材料分类路由 |
| 8 | `server/src/routes/materials.js` | 材料路由 |
| 9 | `server/src/routes/material-orders.js` | 选材申请路由 |
| 10 | `admin/src/pages/Properties.jsx` | 楼盘管理页 |
| 11 | `admin/src/pages/MaterialCategories.jsx` | 材料分类管理页 |
| 12 | `admin/src/pages/Materials.jsx` | 材料管理页 |
| 13 | `admin/src/pages/MaterialOrders.jsx` | 选材管理页 |
| 14-17 | `miniprogram/pages/material-properties/index.{js,wxml,wxss,json}` | 楼盘筛选页 |
| 18-21 | `miniprogram/pages/material-selection/index.{js,wxml,wxss,json}` | 选材页 |
| 22-25 | `miniprogram/pages/material-submit/index.{js,wxml,wxss,json}` | 提交页 |
| 26-29 | `miniprogram/pages/material-success/index.{js,wxml,wxss,json}` | 成功页 |
| 30-33 | `miniprogram/pages/material-orders/index.{js,wxml,wxss,json}` | 申请列表页 |
| 34-37 | `miniprogram/pages/material-order-detail/index.{js,wxml,wxss,json}` | 申请详情页 |

### 修改文件（13 个）

| # | 文件 | 变更内容 |
|---|------|------|
| 1 | `server/src/app.js` | 注册 4 条新路由 |
| 2 | `server/src/routes/designers.js` | personnel_type/employee_id |
| 3 | `server/src/services/designerService.js` | personnel_type/employee_id |
| 4 | `admin/src/components/Sidebar.jsx` | 菜单重命名+5个新菜单项 |
| 5 | `admin/src/router/index.jsx` | 新增 4 条路由 |
| 6 | `admin/src/pages/Designers.jsx` | personnel_type/employee_id |
| 7 | `miniprogram/app.json` | 6个新页面 + Tab 改为 4 个 |
| 8 | `miniprogram/utils/api.js` | 6 个新 API 函数 |
| 9 | `miniprogram/utils/constants.js` | 订单状态映射 |
| 10-12 | `miniprogram/pages/mine/index.{js,wxml,wxss}` | 新增"我的选材申请"入口 |

---

## 风险点与应对方案

| 风险 | 概率 | 影响 | 发生阶段 | 应对 |
|------|:---:|:---:|:---:|------|
| 订单号并发重复 | 低 | 高 | Day 8 | DB UNIQUE 约束 + 3 次重试 + 事务 |
| 小程序第4个Tab过密 | 中 | 低 | Day 13 | 真机预览验证；必要时缩小图标尺寸 |
| SQLite ALTER TABLE 不兼容 | 低 | 中 | Day 2 | SQLite 只支持 ADD COLUMN（不支持 AFTER/MODIFY）；本 migration 仅 ADD，兼容 |
| 前后端联调发现接口设计缺陷 | 中 | 中 | Day 23-25 | 预留 3 天联调缓冲；关键接口先在 Day 12 自测 |
| 30 天周期不够 | 中 | 高 | — | Day 1-3 砍掉低优先级（material_order_logs 表可后加）；管理后台可复用现有组件加速 |

---

## 测试策略

| 层级 | 工具 | 方法 | 阶段 |
|------|------|------|:---:|
| 数据库 | DB Browser for SQLite | 建表后直接查看；seed 后验证数据 | Day 2-3 |
| 后端 API | curl / Bruno | 每个接口开发完即手动测试；Day 12 全量回归 | Day 4-12 |
| 管理后台 | Chrome DevTools | Network 面板看请求；React DevTools 看状态 | Day 18-22 |
| 小程序 | 微信开发者工具 | 模拟器 + 真机预览 + Console 日志 | Day 13-17 |
| 联调 | 真机 + Chrome | 两端数据同步验证 | Day 23-25 |
| 功能测试 | 测试用例清单 | 正向 + 边界 + 异常 | Day 26-27 |
| 回归测试 | 全用例 | 部署后完整验证 | Day 29 |

---

> **下一步**：进入 Day 1 — 通读 PRD，确认技术方案，准备开始编码。
