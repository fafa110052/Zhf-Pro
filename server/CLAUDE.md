# 后端速查 (server)

## 架构

Express 5 + Knex.js + better-sqlite3 (SQLite)，三层模式：**routes（参数校验+响应格式化）→ services（业务逻辑）→ db（Knex 查询）**。

```
server/src/
├── app.js              # Express 应用 + 中间件 + 路由注册
├── index.js            # 启动入口（0.0.0.0 监听，打印局域网 IP）
├── config/index.js     # JWT_SECRET, PORT(3000), uploadDir, wechat
├── db/
│   ├── connection.js   # Knex + better-sqlite3 实例
│   └── migrations/     # 6 个迁移文件（001-006）
├── middleware/
│   ├── auth.js         # authenticate + requireRole + requirePersonnelType
│   ├── upload.js       # Multer 配置（存储+过滤+文件命名）
│   └── validate.js     # requireFields / idParam / pagination
├── routes/             # 15 个路由模块
└── services/           # 14 个 Service 文件
```

## 中间件栈（app.js 顺序）

`cors → express.json(10mb) → express.urlencoded → morgan → static(/uploads) → static(admin/dist) → 路由 → 404 → 全局错误处理`

## 路由规范

- **公开**：`/api/v1/<resource>`
- **管理端**：`/api/v1/admin/<resource>` + `authenticate` + `requireRole('admin')`
- **角色接口**：`/api/v1/designer/...` 或 `/api/v1/engineer/...` + `requirePersonnelType(...)`

### 路由文件速查

| 文件 | 挂载路径 | 主要功能 |
|------|---------|---------|
| `auth.js` | `/api/v1/auth` | 登录（admin/designer/dev/wechat-phone）、获取当前用户 |
| `cases.js` | `/api/v1` | 公开作品列表+详情、设计师 CRUD、管理员审核+上下架+热门 |
| `categories.js` | `/api/v1` | 公开/管理分类（户型/部位/风格），含启用/禁用 |
| `designers.js` | `/api/v1` | 人员管理、设计师 CRUD、头像审核、个人资料编辑 |
| `images.js` | `/api/v1/admin` | 图片库列表+删除（force）+引用查询+批量删除 |
| `upload.js` | `/api/v1` | 单/多文件上传，支持 work_name+uploaded_by |
| `dashboard.js` | `/api/v1/admin` | 仪表盘概览/趋势/分布 |
| `settings.js` | `/api/v1` | 首页配置（banner+热门推荐） |
| `accounts.js` | `/api/v1/admin` | 账号列表+角色变更 |
| `properties.js` | `/api/v1` | 楼盘管理+公开列表+材料查询+业主检查 |
| `material-categories.js` | `/api/v1/admin` | 材料分类 CRUD |
| `materials.js` | `/api/v1/admin` | 材料 CRUD |
| `material-orders.js` | `/api/v1` | 选材申请：提交+我的列表+详情+管理审核+派单 |
| `construction-phases.js` | `/api/v1` | 施工阶段：派单→设计审核→施工审核→业主验收，全流程 23 状态 |
| `reviews.js` | — | 已弃用，空文件占位 |

## Service 规范

- 命名：`<resource>Service.js`，导出 `{ method1, method2 }`
- 错误：`throw Object.assign(new Error('中文消息'), { status: 400 })`
- SQLite 错误映射（app.js）：UNIQUE → "已存在"，FOREIGNKEY → "被引用无法删除"

## 数据库（14 张表）

| 表 | 用途 |
|---|------|
| `designers` | 统一用户表（含 role + personnel_type） |
| `categories` | 分类字典（house_type/area/style） |
| `image_library` | 全局图片库（original_name 格式：设计师-作品名-日期） |
| `cases` | 装修作品（review_status 状态机） |
| `case_images` | 作品-图片关联 |
| `homepage_config` | 首页配置（banner/hot_works） |
| `properties` | 楼盘（property_code 2位唯一码） |
| `material_categories` | 材料分类 |
| `materials` | 材料（含库存 quantity） |
| `material_orders` | 选材申请（order_no 10位生成规则） |
| `material_order_items` | 申请材料项（价格快照） |
| `material_order_logs` | 订单操作日志 |
| `construction_phases` | 施工阶段（5阶段，23状态） |
| `construction_phase_logs` | 阶段操作日志 |

## 响应格式

- 成功：`{ success: true, data }`
- 分页：`{ list, pagination: { page, page_size, total, total_pages } }`
- 错误：`{ error: { message, status } }`

## 分页

默认 page=1，pageSize=20，上限 50。

## 认证中间件

- `authenticate` — 从 `Authorization: Bearer <token>` 提取 JWT，查 designers 表，挂载 `req.user`
- `requireRole(...roles)` — RBAC，传入角色数组
- `requirePersonnelType(...types)` — 人员类型校验

## 上传命名

`original_name`：`{设计师名}-{作品名称}-{YYYYMMDD}.{ext}`（work_name 优先，category 备用）
磁盘文件：`{设计师名}-{YYYYMMDD}-{8位随机hex}.{ext}`（存储于 uploads/originals/）
缩略图：`thumb_{原文件名}`，宽度 400px（存储于 uploads/thumbnails/）

## 开发

```bash
cd server && npm run dev   # nodemon 热重载
```

## 用户体系（两个独立维度）

| 维度 | 字段 | 取值 |
|------|------|------|
| **角色** | `role` | `admin` / `designer`(员工) / `owner`(业主) / `guest`(游客) |
| **人员类型** | `personnel_type` | `designer` / `design_director` / `engineer` / `engineering_director` |

- `app.isDesigner()` = `role === 'designer'` → **所有员工**
- `app.isDesignerPersonnel()` = `personnel_type === 'designer'` → 仅设计师岗位
- `app.isOwner()` = `role === 'owner'` → 业主
- 登录路由：`owner` 最先判断

## 施工流程（V1.3 核心）

打拆 → 水电 → 油工 → 主材安装 → 竣工

```
派单 → 设计师提交整屋设计 → 设计总监审 → 管理员审 → 业主审
→ 派工(工程师+工程总监) → 5阶段施工 → 每阶段业主验收 → 竣工
```

- 设计阶段独立于施工；驳回只回退当前阶段
- 角色分离：设计师≠设计总监，工程师≠工程总监

## 关键业务规则

- 订单号 10 位 = YYYYMMDD(6) + property_code(2) + daily_sequence(2)
- 手机号脱敏：中间 4 位 `****`；价格快照下单时存储
- 选材订单：pending → approved → completed / rejected
- 图片库命名：`设计师-作品名字-日期.扩展名`
