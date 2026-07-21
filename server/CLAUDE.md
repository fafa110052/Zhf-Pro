# 后端速查 (server)

## 架构

Express 5 + Knex + better-sqlite3。三层：`routes → services → db`。
启动：`cd server && npm run dev`（nodemon），监听 `0.0.0.0:3000`。

```
server/src/
├── app.js              # 中间件栈 + 路由注册
├── index.js            # 启动入口
├── config/index.js     # JWT_SECRET, PORT, uploadDir, wechat
├── db/connection.js    # Knex + better-sqlite3
├── db/migrations/      # 迁移文件
├── middleware/          # auth, upload, validate
├── routes/             # 20 个路由模块
└── services/           # 业务逻辑
```

## 中间件栈

`cors → json → urlencoded → morgan → static(/uploads) → static(admin/dist) → 路由 → 404 → 全局错误`

## 路由速查

| 文件 | 路径 | 关键功能 |
|------|------|---------|
| `auth.js` | `/api/v1/auth` | 登录、获取用户 |
| `cases.js` | `/api/v1` | 作品 CRUD、审核、VR |
| `designers.js` | `/api/v1` | 人员管理、头像审核 |
| `categories.js` | `/api/v1` | 分类管理 |
| `images.js` | `/api/v1/admin` | 图片库 |
| `upload.js` | `/api/v1` | 文件上传 |
| `properties.js` | `/api/v1` | 楼盘、材料查询 |
| `materials.js` | `/api/v1/admin` | 材料 CRUD |
| `material-orders.js` | `/api/v1` | 选材申请流程 |
| `construction-phases.js` | `/api/v1` | 施工 5 阶段 23 状态 |
| `measurement-appointments.js` | `/api/v1` | 量房预约 |
| `lottery.js` | `/api/v1` | 抽奖 |
| `dashboard.js` | `/api/v1/admin` | 仪表盘 |
| `settings.js` | `/api/v1` | 首页配置 |
| `style-wizard.js` | `/api/v1` | 风格选材：品类/材料/门/灯具/草稿/选材单 |
| `reports.js` | `/api/v1` | 作品举报 |
| `design-team.js` | `/api/v1` | 设计团队 |
| `accounts.js` | `/api/v1/admin` | 账号管理 |

风格选材重名路径加 `style-` 前缀：`/style-categories`、`/admin/style-materials`。

## 数据库核心表

| 表 | 用途 |
|---|------|
| `designers` | 用户表（role + personnel_type） |
| `cases` + `case_images` | 作品 + 图片关联 |
| `properties` | 楼盘 |
| `materials` + `material_categories` | 材料 + 分类 |
| `material_orders` + `material_order_items` | 选材单 + 项目（价格快照） |
| `construction_phases` | 施工阶段（5 阶段 23 状态） |
| `styles` / `style_categories` / `style_subcategories` / `style_materials` | 风格选材核心 |
| `door_series` / `door_colors` / `door_materials` | 门系列 × 颜色 × 风格 |
| `lighting_packages` / `lighting_package_items` | 灯具套餐 |
| `selection_drafts` / `selection_orders` | 选材草稿 + 选材单 |

## Service 规范

- 导出 `{ method1, method2 }`
- 错误：`throw Object.assign(new Error('中文'), { status: 400 })`
- 分页：默认 page=1, pageSize=20, 上限 50
- 响应：`{ success: true, data }` 或 `{ list, pagination }`

## 认证

- `authenticate` — JWT → req.user
- `requireRole('admin')` — RBAC
- `requirePersonnelType('designer')` — 人员类型

## 上传

- 磁盘：`uploads/originals/{设计师}-{日期}-{8hex}.{ext}`
- 缩略图：`uploads/thumbnails/thumb_{原文件}`（400px 宽）
- original_name：`{设计师}-{作品名}-{日期}.{ext}`
