# 住好房展示平台 — 项目地图 v1.1

> **用途**：新会话启动后只需读此文件即可掌握项目全貌，无需逐个扫描文件。
> **维护**：新增/删除文件或 API 时同步更新此文件。
> **规则文档**：开发规范见 [CLAUDE.md](CLAUDE.md)，UI 细节见 [admin/UI_STYLE_GUIDE.md](admin/UI_STYLE_GUIDE.md)。

---

## 1. 文件功能速查表

### 1.1 后端 server/src/

| 文件 | 职责 |
|------|------|
| `index.js` | 启动入口，监听端口 |
| `app.js` | Express 应用、全局中间件、路由注册、错误处理 |
| `config/index.js` | JWT_SECRET、PORT 等环境配置 |
| `db/connection.js` | Knex 数据库连接 |
| `db/migrations/001_create_tables.js` | 初始建表：designers、categories、image_library、cases、case_images、homepage_config |
| `db/migrations/002_add_material_tables.js` | V1.1 建表：properties、material_categories、materials、material_orders、material_order_items、material_order_logs |
| `db/seeds/001_seed_data.js` | 初始种子数据（admin 账号、内置分类） |
| `db/seeds/002_material_seed.js` | V1.1 种子数据（楼盘、材料分类、示例材料，Unsplash 真实图片） |
| `db/update_material_images.js` | 材料图片更新脚本（一次性：placehold.co → Unsplash 真实家居图） |
| `middleware/auth.js` | JWT 认证中间件、RBAC 角色校验 |
| `middleware/upload.js` | multer 文件上传配置 |
| `middleware/validate.js` | 请求参数校验工具函数 |
| `routes/auth.js` | 认证路由（登录、获取当前用户） |
| `routes/cases.js` | 作品路由（公开列表、设计师 CRUD、管理端审核） |
| `routes/categories.js` | 分类字典路由（公开 + 管理端 CRUD） |
| `routes/designers.js` | 人员管理路由 + 头像审核路由 |
| `routes/reviews.js` | 作品审核路由（V1.1 管理端审核入口） |
| `routes/images.js` | 图片库路由（管理端） |
| `routes/dashboard.js` | 仪表盘统计路由 |
| `routes/upload.js` | 文件上传路由 |
| `routes/settings.js` | 系统设置路由（首页配置） |
| `routes/accounts.js` | 用户管理路由（角色变更） |
| `routes/properties.js` | 楼盘管理路由（V1.1） |
| `routes/material-categories.js` | 材料分类路由（V1.1） |
| `routes/materials.js` | 材料管理路由（V1.1） |
| `routes/material-orders.js` | 选材订单路由（V1.1，公开 + 管理端） |
| `services/authService.js` | 登录验证、JWT 签发 |
| `services/caseService.js` | 作品 CRUD、审核 |
| `services/categoryService.js` | 分类字典 CRUD |
| `services/designerService.js` | 设计师/监理 CRUD、头像审核 |
| `services/dashboardService.js` | 仪表盘统计查询 |
| `services/imageService.js` | 图片库管理 |
| `services/materialService.js` | 材料 + 材料分类 CRUD |
| `services/materialOrderService.js` | 选材订单完整业务逻辑 |
| `services/propertyService.js` | 楼盘 CRUD |
| `services/settingsService.js` | 首页配置管理 |
| `services/accountService.js` | 用户角色变更 |
| `services/uploadService.js` | 文件上传处理 |
| `services/wechatService.js` | 微信 API 调用（登录、手机号） |

### 1.2 管理后台 admin/src/

| 文件 | 职责 |
|------|------|
| `main.jsx` | 应用入口 |
| `App.jsx` | AuthProvider + RouterProvider |
| `index.css` | TailwindCSS + 全局字体 |
| `api/client.js` | Axios 实例（baseURL=/api/v1、JWT 拦截器、响应解包） |
| `contexts/AuthContext.jsx` | 认证状态管理（login/logout/user/token） |
| `router/index.jsx` | React Router 路由配置（14 个路由） |
| `components/Layout.jsx` | 主布局：Sidebar + HeaderBar + Outlet |
| `components/ProtectedLayout.jsx` | 认证守卫，未登录跳转 /login |
| `components/Sidebar.jsx` | 左侧导航（12 个菜单项 + 折叠/移动端支持） |
| `components/HeaderBar.jsx` | 顶部栏：面包屑 + 用户菜单 + 汉堡按钮 |
| `components/Modal.jsx` | 通用弹窗 |
| `components/ConfirmDialog.jsx` | 确认对话框（封装 Modal） |
| `components/EmptyState.jsx` | 空状态占位 |
| `components/ErrorState.jsx` | 错误状态 + 重试按钮 |
| `components/Toast.jsx` | Toast 通知（ToastProvider + useToast） |
| `hooks/useKeyboardNav.js` | 键盘快捷键导航 |
| `pages/Dashboard.jsx` | 仪表盘页面 |
| `pages/Works.jsx` | **作品管理 — UI 基准页面** |
| `pages/Designers.jsx` | 人员管理（设计师 + 监理） |
| `pages/AvatarReviews.jsx` | 头像审核 |
| `pages/Properties.jsx` | 楼盘管理（V1.1） |
| `pages/Categories.jsx` | 分类字典管理 |
| `pages/MaterialCategories.jsx` | 材料分类管理（V1.1） |
| `pages/Materials.jsx` | 材料管理（V1.1） |
| `pages/MaterialOrders.jsx` | 选材管理/订单审核（V1.1） |
| `pages/Images.jsx` | 图片库 |
| `pages/Accounts.jsx` | 用户管理 |
| `pages/Settings.jsx` | 系统设置（首页配置） |
| `pages/Login.jsx` | 登录页 |

### 1.3 小程序 miniprogram/

| 文件 | 职责 |
|------|------|
| `app.js` | 应用入口，全局数据 |
| `app.json` | 全局配置 + 4 tab + 页面注册 |
| `app.wxss` | 全局样式 |
| `utils/api.js` | API 请求封装（按模块导出函数） |
| `utils/request.js` | wx.request 封装（JWT 注入、错误处理） |
| `utils/constants.js` | 状态映射常量 |
| `utils/imageCompress.js` | 图片压缩工具 |
| `utils/util.js` | 通用工具函数 |
| `components/swiper-banner/` | 首页轮播图组件 |
| `components/work-card/` | 作品卡片组件 |
| `components/empty-state/` | 空状态组件 |
| `components/loading-more/` | 加载更多组件 |
| `pages/index/` | 首页（tab 1） |
| `pages/category/` | 分类页（tab 2） |
| `pages/material-properties/` | 在线选材-楼盘筛选（tab 3，V1.1） |
| `pages/material-selection/` | 在线选材-材料选择（V1.1） |
| `pages/material-submit/` | 在线选材-提交申请（V1.1） |
| `pages/material-success/` | 在线选材-提交成功（V1.1） |
| `pages/material-orders/` | 我的选材申请列表（V1.1） |
| `pages/material-order-detail/` | 选材申请详情（V1.1） |
| `pages/mine/` | 我的页面（tab 4） |
| `pages/work-detail/` | 作品详情页 |
| `pages/designer-login/` | 设计师登录页 |
| `pages/designer-center/` | 设计师中心 |
| `pages/work-manage/` | 设计师作品管理列表 |
| `pages/work-upload/` | 设计师上传作品 |
| `pages/agreement/` | 用户协议页 |
| `pages/privacy/` | 隐私政策页 |

---

## 2. API 端点清单

### 2.0 通用

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/health` | 无 | 健康检查 |
| POST | `/api/v1/upload` | Bearer | 单文件上传 |
| POST | `/api/v1/upload/multiple` | Bearer | 多文件上传（最多 9 个） |

### 2.1 认证 (routes/auth.js)

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/api/v1/auth/admin/login` | 无 | 管理端登录 |
| GET | `/api/v1/auth/admin/me` | Bearer | 获取当前管理员信息 |
| POST | `/api/v1/auth/designer/login` | 无 | 设计师微信登录 |
| POST | `/api/v1/auth/designer/login/dev` | 无 | 设计师开发登录（免微信） |
| POST | `/api/v1/auth/designer/wechat-phone` | 无 | 微信手机号解密 |
| GET | `/api/v1/auth/designer/me` | Bearer | 获取当前设计师信息 |

### 2.2 作品 (routes/cases.js)

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/works` | 无 | 公开作品列表（分页+筛选） |
| GET | `/api/v1/works/hot` | 无 | 热门作品 |
| GET | `/api/v1/works/:id` | 无 | 作品详情 |
| GET | `/api/v1/designer/works` | designer | 设计师自己的作品列表 |
| GET | `/api/v1/designer/works/:id` | designer | 设计师自己的作品详情 |
| POST | `/api/v1/designer/works` | designer | 设计师上传作品 |
| PUT | `/api/v1/designer/works/:id` | designer | 设计师编辑作品 |
| DELETE | `/api/v1/designer/works/:id` | designer | 设计师删除作品 |
| PATCH | `/api/v1/designer/works/:id/cover` | designer | 设计师设置封面 |
| POST | `/api/v1/designer/works/:id/submit` | designer | 设计师提交审核 |
| GET | `/api/v1/designer/stats` | designer | 设计师统计数据 |
| GET | `/api/v1/admin/works` | admin | 管理端作品列表 |
| GET | `/api/v1/admin/works/:id` | admin | 管理端作品详情 |
| POST | `/api/v1/admin/works/:id/approve` | admin | 审核通过 |
| POST | `/api/v1/admin/works/:id/reject` | admin | 审核驳回 |
| POST | `/api/v1/admin/works/batch` | admin | 批量审核 |
| PATCH | `/api/v1/admin/works/:id/cover` | admin | 管理端设置封面 |
| PATCH | `/api/v1/admin/works/:id/hot` | admin | 管理端切换热门 |
| POST | `/api/v1/admin/works/:id/offline` | admin | 管理端下架作品 |
| POST | `/api/v1/admin/works/:id/online` | admin | 管理端上架作品 |
| DELETE | `/api/v1/admin/works/:id` | admin | 管理端删除作品 |
| POST | `/api/v1/admin/works/:id/archive` | admin | 管理端归档作品 |

### 2.3 人员管理 (routes/designers.js)

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/admin/designers` | admin | 人员列表（分页+筛选） |
| GET | `/api/v1/admin/designers/:id` | admin | 人员详情 |
| POST | `/api/v1/admin/designers` | admin | 新增人员 |
| PUT | `/api/v1/admin/designers/:id` | admin | 编辑人员 |
| PATCH | `/api/v1/admin/designers/:id/status` | admin | 修改状态（启用/停用） |
| DELETE | `/api/v1/admin/designers/:id` | admin | 删除人员 |
| PUT | `/api/v1/designer/profile` | designer | 设计师更新自己的资料 |
| GET | `/api/v1/admin/avatar-reviews` | admin | 头像审核列表 |
| POST | `/api/v1/admin/avatar-reviews/:id/approve` | admin | 头像审核通过 |
| POST | `/api/v1/admin/avatar-reviews/:id/reject` | admin | 头像审核驳回 |

### 2.4 分类字典 (routes/categories.js)

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/categories` | 无 | 公开分类列表（按 type 筛选） |
| GET | `/api/v1/admin/categories` | admin | 管理端分类列表 |
| POST | `/api/v1/admin/categories` | admin | 新增分类 |
| PUT | `/api/v1/admin/categories/:id` | admin | 编辑分类 |
| DELETE | `/api/v1/admin/categories/:id` | admin | 删除分类 |

### 2.5 楼盘 (routes/properties.js) — V1.1

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/properties` | 无 | 公开楼盘列表（已开通选材的） |
| GET | `/api/v1/properties/:propertyId/materials` | 无 | 楼盘下材料（按分类分组） |
| GET | `/api/v1/admin/properties` | admin | 管理端楼盘列表 |
| GET | `/api/v1/admin/properties/:id` | admin | 楼盘详情 |
| POST | `/api/v1/admin/properties` | admin | 新增楼盘 |
| PUT | `/api/v1/admin/properties/:id` | admin | 编辑楼盘 |
| DELETE | `/api/v1/admin/properties/:id` | admin | 删除楼盘 |

### 2.6 材料分类 (routes/material-categories.js) — V1.1

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/admin/material-categories` | admin | 材料分类列表 |
| POST | `/api/v1/admin/material-categories` | admin | 新增材料分类 |
| PUT | `/api/v1/admin/material-categories/:id` | admin | 编辑材料分类 |
| DELETE | `/api/v1/admin/material-categories/:id` | admin | 删除材料分类 |

### 2.7 材料 (routes/materials.js) — V1.1

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/admin/materials` | admin | 材料列表（分页+筛选） |
| GET | `/api/v1/admin/materials/:id` | admin | 材料详情 |
| POST | `/api/v1/admin/materials` | admin | 新增材料 |
| PUT | `/api/v1/admin/materials/:id` | admin | 编辑材料 |
| DELETE | `/api/v1/admin/materials/:id` | admin | 删除材料 |

### 2.8 选材订单 (routes/material-orders.js) — V1.1

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/api/v1/material-orders` | Bearer | C端提交选材申请 |
| GET | `/api/v1/material-orders/my` | Bearer | C端我的申请列表 |
| GET | `/api/v1/material-orders/detail/:orderNo` | Bearer | C端申请详情 |
| GET | `/api/v1/admin/material-orders` | admin | 管理端订单列表 |
| GET | `/api/v1/admin/material-orders/:orderNo` | admin | 管理端订单详情 |
| POST | `/api/v1/admin/material-orders/:orderNo/approve` | admin | 审核通过 |
| POST | `/api/v1/admin/material-orders/:orderNo/reject` | admin | 审核驳回 |
| PATCH | `/api/v1/admin/material-orders/:orderNo/complete` | admin | 标记完成 |

### 2.9 其他

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/admin/dashboard/overview` | admin | 仪表盘概览 |
| GET | `/api/v1/admin/dashboard/trends` | admin | 趋势数据 |
| GET | `/api/v1/admin/dashboard/distribution` | admin | 分布数据 |
| GET | `/api/v1/admin/images` | admin | 图片库列表 |
| GET | `/api/v1/admin/images/:id` | admin | 图片详情 |
| DELETE | `/api/v1/admin/images/:id` | admin | 删除图片 |
| POST | `/api/v1/admin/images/batch` | admin | 批量删除图片 |
| GET | `/api/v1/homepage/config` | 无 | 公开首页配置 |
| GET | `/api/v1/admin/settings` | admin | 设置列表 |
| POST | `/api/v1/admin/settings` | admin | 新增设置 |
| PUT | `/api/v1/admin/settings/:id` | admin | 编辑设置 |
| DELETE | `/api/v1/admin/settings/:id` | admin | 删除设置 |
| GET | `/api/v1/admin/accounts` | admin | 用户列表 |
| GET | `/api/v1/admin/accounts/summary` | admin | 用户汇总 |
| PUT | `/api/v1/admin/accounts/:id/role` | admin | 修改用户角色 |

### 2.10 路由注册速查 (app.js)

```
authRoutes           → /api/v1/auth
categoriesRoutes     → /api/v1
casesRoutes          → /api/v1
designersRoutes      → /api/v1
reviewsRoutes        → /api/v1
imagesRoutes         → /api/v1
dashboardRoutes      → /api/v1
uploadRoutes         → /api/v1
settingsRoutes       → /api/v1
accountsRoutes       → /api/v1
propertiesRoutes     → /api/v1        (V1.1)
materialCategoriesRoutes → /api/v1    (V1.1)
materialsRoutes      → /api/v1        (V1.1)
materialOrdersRoutes → /api/v1        (V1.1)
```

---

## 3. 数据库表清单

### 3.1 designers（用户/人员表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增主键 |
| `openid` | string(64) UNIQUE | 微信 openid |
| `username` | string(32) UNIQUE | 用户名（管理端登录） |
| `password_hash` | string(128) | 密码哈希 |
| `name` | string(32) | 真实姓名 |
| `avatar_url` | string(512) | 头像 URL |
| `pending_avatar_url` | string(512) | 待审核头像 |
| `avatar_review_status` | string(16) | 头像审核状态 |
| `phone` | string(20) UNIQUE | 手机号 |
| `years_of_exp` | integer | 从业年限 |
| `bio` | text | 个人简介 |
| `role` | string(16) | admin/designer/guest |
| `status` | string(8) | active/inactive |
| `is_bound` | integer | 微信绑定状态 |
| `personnel_type` | string(16) | **V1.1** — designer/supervisor |
| `employee_id` | string(32) UNIQUE | **V1.1** — 工号 |
| `login_attempts` | integer | 登录失败次数 |
| `locked_until` | datetime | 锁定截止时间 |
| `created_at` / `updated_at` | datetime | 时间戳 |

### 3.2 categories（作品分类表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `type` | string(16) | house_type/area/style |
| `name` | string(32) | 分类名称 |
| `sort_order` | integer | 排序 |
| `is_active` | integer | 启用/禁用 |
| `created_at` / `updated_at` | datetime | 时间戳 |

### 3.3 image_library（图片库）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `image_url` | string(512) | 图片地址 |
| `thumb_url` | string(512) | 缩略图 |
| `original_name` | string(256) | 原始文件名 |
| `file_size` | integer | 文件大小 |
| `uploaded_by` | FK→designers | 上传者 |
| `reference_count` | integer | 引用次数 |
| `created_at` | datetime | 时间戳 |

### 3.4 cases（作品表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `title` | string(128) | 作品标题 |
| `description` | text | 作品描述 |
| `house_type_id` | FK→categories | 户型分类 |
| `area_category_id` | FK→categories | 面积分类 |
| `style_category_id` | FK→categories | 风格分类 |
| `area_sqm` | decimal(8,2) | 面积（㎡） |
| `budget_min/max` | integer | 造价区间（万元） |
| `completion_date` | date | 竣工日期 |
| `designer_id` | FK→designers | 设计师 |
| `cover_image` | string(512) | 封面图 |
| `review_status` | string(16) | draft/pending/approved/rejected |
| `reject_reason` | text | 驳回原因 |
| `is_hot` | integer | 热门标记 |
| `view_count` | integer | 浏览次数 |
| `created_at` / `updated_at` | datetime | 时间戳 |

### 3.5 case_images（作品图片关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `case_id` | FK→cases CASCADE | 作品 ID |
| `library_image_id` | FK→image_library | 图片库引用 |
| `image_url` | string(512) | 图片地址 |
| `thumb_url` | string(512) | 缩略图 |
| `sort_order` | integer | 排序 |
| `created_at` | datetime | 时间戳 |

### 3.6 homepage_config（首页配置）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `config_type` | string(16) | banner/hot_works |
| `config_value` | text (JSON) | 配置值 |
| `sort_order` | integer | 排序 |
| `created_at` / `updated_at` | datetime | 时间戳 |

### 3.7 properties（楼盘表）— V1.1

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `name` | string(64) | 楼盘名称 |
| `address` | string(256) | 详细地址 |
| `cover_image` | string(512) | 封面图 |
| `property_code` | string(2) UNIQUE | 小区编号（2位数字） |
| `material_enabled` | integer | 选材功能开关 |
| `created_at` / `updated_at` | datetime | 时间戳 |

### 3.8 material_categories（材料分类表）— V1.1

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `name` | string(32) | 分类名称（地板/墙面/卫浴…） |
| `sort_order` | integer | 排序 |
| `created_at` / `updated_at` | datetime | 时间戳 |

### 3.9 materials（材料表）— V1.1

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `category_id` | FK→material_categories | 材料分类 |
| `property_id` | FK→properties | 所属楼盘 |
| `name` | string(128) | 材料名称 |
| `brand` | string(64) | 品牌 |
| `image_url` | string(512) | 材料图片 |
| `unit_price` | decimal(10,2) | 单价 |
| `price_unit` | string(8) | 计价单位（/㎡ 或 /件） |
| `description` | string(256) | 描述 |
| `created_at` / `updated_at` | datetime | 时间戳 |

### 3.10 material_orders（选材订单表）— V1.1

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `order_no` | string(10) UNIQUE | 10位订单号 |
| `property_id` | FK→properties | 楼盘 |
| `room_number` | string(64) | 房号 |
| `user_id` | FK→designers | 申请人 |
| `applicant_name` | string(32) | 联系人 |
| `applicant_phone` | string(20) | 联系电话 |
| `remark` | string(200) | 备注 |
| `status` | string(16) | pending/approved/rejected/completed |
| `designer_id` | FK→designers | 分配设计师 |
| `supervisor_id` | FK→designers | 分配监理 |
| `reviewed_by` | FK→designers | 审核人 |
| `reviewed_at` | datetime | 审核时间 |
| `reject_reason` | text | 驳回原因 |
| `created_at` / `updated_at` | datetime | 时间戳 |

### 3.11 material_order_items（订单材料明细）— V1.1

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `order_id` | FK→material_orders CASCADE | 订单 |
| `material_id` | FK→materials | 材料 |
| `category_id` | FK→material_categories | 分类（冗余） |
| `price_snapshot` | decimal(10,2) | 提交时单价快照 |
| `created_at` | datetime | 时间戳 |

### 3.12 material_order_logs（操作日志）— V1.1

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer PK | 自增 |
| `order_id` | FK→material_orders CASCADE | 订单 |
| `action` | string(32) | submit/approve/reject/complete/assign |
| `operator_id` | FK→designers | 操作人 |
| `detail` | text | 操作详情 |
| `created_at` | datetime | 时间戳 |

---

## 4. 管理后台组件 API

### 4.1 Modal
```jsx
import Modal from '../components/Modal';
// Props:
//   open: boolean        — 必传！控制显示/隐藏
//   onClose: () => void  — 关闭回调
//   title: string        — 标题
//   children: ReactNode  — 内容
//   footer: ReactNode    — 可选底部按钮区
//   size: 'sm' | 'md'   — 默认 'md'（max-w-lg）
```

### 4.2 ConfirmDialog
```jsx
import ConfirmDialog from '../components/ConfirmDialog';
// Props:
//   open: boolean              — 必传
//   onClose: () => void
//   onConfirm: () => void | Promise<void>
//   title: string
//   message: string
//   confirmText?: string       — 默认 '确定'
//   variant?: 'danger' | 'warning' | 'default'  — 默认 'default'
//   loading?: boolean
```

### 4.3 EmptyState
```jsx
import EmptyState from '../components/EmptyState';
// Props:
//   icon?: string          — emoji，默认 '📭'
//   title?: string         — 默认 '暂无数据'
//   description?: string   — 注意：prop 名是 description，不是 desc！
//   action?: ReactNode     — 可选操作按钮
//   size?: 'sm' | 'md'    — 默认 'md'
```

### 4.4 ErrorState
```jsx
import ErrorState from '../components/ErrorState';
// Props:
//   message?: string       — 默认 '加载失败'
//   onRetry?: () => void
//   size?: 'sm' | 'md'    — 默认 'md'
```

### 4.5 Toast
```jsx
import { useToast } from '../components/Toast';
const toast = useToast();
toast.success('消息');
toast.error('消息');
toast.info('消息');
toast.warning('消息');
// 注意：必须在 ToastProvider 内使用
```

### 4.6 API Client
```jsx
import client from '../api/client';
// axios 实例，baseURL=/api/v1
// 自动注入 JWT（从 AuthContext 读取 token）
// 自动解包 response.data（res 直接是 data 对象）
const res = await client.get('/admin/works', { params });
// res.data.list, res.data.pagination
```

---

## 5. 管理后台路由与菜单对应

| 路由 | 页面组件 | 菜单名 | 面包屑 | 版本 |
|------|---------|--------|--------|------|
| `/dashboard` | Dashboard | 仪表盘 | 仪表盘 | V1.0 |
| `/works` | Works | 作品管理 | 作品管理 | V1.0 |
| `/avatar-reviews` | AvatarReviews | 头像审核 | 头像审核 | V1.0 |
| `/designers` | Designers | 人员管理 | 人员管理 | V1.0 |
| `/properties` | Properties | 楼盘管理 | 楼盘管理 | V1.1 |
| `/material-categories` | MaterialCategories | 材料分类 | 材料分类 | V1.1 |
| `/materials` | Materials | 材料管理 | 材料管理 | V1.1 |
| `/material-orders` | MaterialOrders | 选材管理 | 选材管理 | V1.1 |
| `/categories` | Categories | 分类字典 | 分类字典 | V1.0 |
| `/accounts` | Accounts | 用户管理 | 用户管理 | V1.0 |
| `/images` | Images | 图片库 | 图片库 | V1.0 |
| `/settings` | Settings | 系统设置 | 系统设置 | V1.0 |
| `/login` | Login | — | — | 登录页 |

---

## 6. 小程序页面清单

| 页面路径 | 名称 | Tab | 版本 | 跳转模式 |
|----------|------|-----|------|----------|
| `pages/index/index` | 首页 | tab 1 | V1.0 | — |
| `pages/category/index` | 分类页 | tab 2 | V1.0 | — |
| `pages/material-properties/index` | 选材-楼盘筛选 | tab 3 | V1.1 | — |
| `pages/material-selection/index` | 选材-材料选择 | — | V1.1 | navigateTo |
| `pages/material-submit/index` | 选材-提交申请 | — | V1.1 | navigateTo |
| `pages/material-success/index` | 选材-提交成功 | — | V1.1 | redirectTo |
| `pages/material-orders/index` | 我的选材申请 | — | V1.1 | navigateTo |
| `pages/material-order-detail/index` | 申请详情 | — | V1.1 | navigateTo |
| `pages/designer-tasks/index` | 设计师任务列表 | — | V1.3 | navigateTo |
| `pages/designer-task-detail/index` | 设计师上传设计图 | — | V1.3 | navigateTo |
| `pages/design-director-reviews/index` | 设计总监审核列表 | — | V1.3 | navigateTo |
| `pages/design-director-review-detail/index` | 设计总监审核详情 | — | V1.3 | navigateTo |
| `pages/engineer-tasks/index` | 工程师任务列表 | — | V1.3 | navigateTo |
| `pages/engineer-task-detail/index` | 工程师施工操作 | — | V1.3 | navigateTo |
| `pages/engineering-director-reviews/index` | 工程总监审核列表 | — | V1.3 | navigateTo |
| `pages/engineering-director-review-detail/index` | 工程总监审核详情 | — | V1.3 | navigateTo |
| `pages/mine/index` | 我的 | tab 4 | V1.0 | — |
| `pages/work-detail/index` | 作品详情 | — | V1.0 | navigateTo |
| `pages/designer-login/index` | 设计师登录 | — | V1.0 | navigateTo |
| `pages/designer-center/index` | 设计师中心 | — | V1.0 | navigateTo |
| `pages/work-manage/index` | 作品管理 | — | V1.0 | navigateTo |
| `pages/work-upload/index` | 上传作品 | — | V1.0 | navigateTo |
| `pages/agreement/index` | 用户协议 | — | V1.0 | navigateTo |
| `pages/privacy/index` | 隐私政策 | — | V1.0 | navigateTo |

**跳转防闪烁**：所有 `navigateTo` 进入的页面必须使用 `onReady + ready` 门控模式（见 [CLAUDE.md](CLAUDE.md)）。

---

## 7. 页面 UI 对齐状态

| 页面 | 外层 padding | 卡片包裹 | 表头样式 | 输入框 | 按钮色 | 状态 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Works.jsx（基准） | ✅ | ✅ | ✅ | ✅ | ✅ | 基准 |
| Dashboard.jsx | ✅ | ✅ | — | ✅ | ✅ | 已对齐 |
| Designers.jsx | ✅ | ✅ | ✅ | ✅ | ✅ | 已修复 |
| AvatarReviews.jsx | ✅ | ✅ | ✅ | ✅ | ✅ | 已对齐 |
| Properties.jsx | ✅ | ✅ | ✅ | ✅ | ✅ | 已修复 |
| MaterialCategories.jsx | ✅ | ✅ | ✅ | ✅ | ✅ | 已修复 |
| Materials.jsx | ✅ | ✅ | ✅ | ✅ | ✅ | 已修复 |
| MaterialOrders.jsx | ✅ | ✅ | ✅ | ✅ | ✅ | 已修复 |
| Categories.jsx | ✅ | ✅ | ✅ | ✅ | ✅ | 已对齐 |
| Accounts.jsx | ✅ | ✅ | ✅ | ✅ | ✅ | 已对齐 |
| Images.jsx | ✅ | ✅ | — | ✅ | ✅ | 已对齐 |
| Settings.jsx | — | — | — | — | — | 待确认 |

---

## 8. 关键业务规则速查

- **订单号生成**：10位 = YYYYMMDD(6) + property_code(2) + daily_sequence(2)
- **价格快照**：`material_order_items.price_snapshot` 在下单时存储
- **两套分类系统**：`categories`（作品分类，type=house_type/area/style）≠ `material_categories`（材料分类）
- **人员管理**：`designers` 表含 `role`（admin/designer）和 `personnel_type`（designer/supervisor）
- **手机号脱敏**：管理后台列表对手机号中间4位显示 `****`
- **订单状态流转**：pending → approved → completed 或 pending → rejected

---

## 9. 新增功能时的文件修改检查清单

### 需要新建的文件
- [ ] 后端：`server/src/routes/<name>.js`
- [ ] 后端：`server/src/services/<name>Service.js`
- [ ] 后端：`server/src/db/migrations/<NNN>_<description>.js`（如需新表）
- [ ] 管理后台：`admin/src/pages/<PageName>.jsx`
- [ ] 小程序：`miniprogram/pages/<page-name>/` 四个文件

### 需要修改的现有文件
- [ ] `server/src/app.js` — 注册新路由
- [ ] `admin/src/router/index.jsx` — 添加路由
- [ ] `admin/src/components/Sidebar.jsx` — 添加菜单项（`MENU_ITEMS` 数组）
- [ ] `admin/src/components/HeaderBar.jsx` — 添加 `BREADCRUMB_MAP` 条目
- [ ] `miniprogram/app.json` — 注册新页面
- [ ] `PROJECT_MAP.md` — 更新本文档

---

## 10. 如何使用 PROJECT_MAP

**对于 Claude（AI 助手）**：
- CLAUDE.md 中已引用此文件。新会话启动后，读完 CLAUDE.md 接着读此文件即可掌握全貌。
- 如需修改某个功能，查此文件定位要改的文件和 API，直接打开编辑，无需搜索。

**对于开发者**：
- 新增功能后，必须同步更新此文档中的：
  1. 文件功能速查表（第 1 节）
  2. API 端点清单（第 2 节）
  3. 数据库表清单（第 3 节，如有新表/新字段）
  4. 管理后台路由（第 5 节，如有新页面）
  5. 小程序页面清单（第 6 节，如有新页面）
- 更新时只需改对应条目，不需要重写整个文件。

**保持同步**：每次完成一个功能 PR 后，检查是否需要在 PROJECT_MAP.md 中添加新条目。
