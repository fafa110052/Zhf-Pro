# 📡 住好房 API 接口文档

> **Base URL**：`http://localhost:3000/api/v1`
> **版本**：v1.0.1
> **Content-Type**：`application/json`
> **认证方式**：`Authorization: Bearer <token>`（需要认证的接口）

---

## 目录

- [约定](#约定)
- [1. 健康检查](#1-健康检查)
- [2. 认证](#2-认证)
- [3. 分类字典](#3-分类字典)
- [4. 作品（公开）](#4-作品公开)
- [5. 设计师端 — 作品管理](#5-设计师端--作品管理)
- [6. 管理端 — 作品审核](#6-管理端--作品审核)
- [7. 设计师管理](#7-设计师管理)
- [8. 仪表盘](#8-仪表盘)
- [9. 图片库](#9-图片库)
- [10. 文件上传](#10-文件上传)
- [11. 系统设置](#11-系统设置)
- [12. 账号管理](#12-账号管理)
- [错误码速查](#错误码速查)

---

## 约定

### 响应格式

所有接口统一返回以下 JSON 结构：

```json
// 成功
{ "success": true, "data": { ... } }

// 错误
{ "error": { "message": "错误描述", "status": 400 } }
```

### 分页格式

```json
{
  "list": [...],
  "pagination": {
    "page": 1,
    "page_size": 12,
    "total": 100,
    "total_pages": 9
  }
}
```

### 认证说明

- `🔓` — 无需认证
- `🔒` — 需携带 `Authorization: Bearer <token>`
- `👤` — 设计师身份
- `🛡️` — 管理员身份

---

## 1. 健康检查

### `GET /api/health` 🔓

系统健康检查。

**响应示例**：
```json
{ "status": "ok", "timestamp": "2026-06-10T03:00:00.000Z" }
```

---

## 2. 认证

### `POST /api/v1/auth/admin/login` 🔓

管理员账号密码登录。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| username | string | ✅ | 登录用户名 |
| password | string | ✅ | 登录密码 |

**请求示例**：
```json
{ "username": "admin", "password": "admin123" }
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": 1, "username": "admin", "role": "admin" }
  }
}
```

---

### `GET /api/v1/auth/admin/me` 🔒🛡️

获取当前登录管理员个人信息。

**响应示例**：
```json
{
  "success": true,
  "data": { "id": 1, "username": "admin", "role": "admin" }
}
```

---

### `POST /api/v1/auth/designer/login` 🔓

设计师微信登录（openid + 手机号校验）。新设计师自动注册。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| openid | string | ✅ | 微信 openid |
| phone | string | ✅ | 手机号码 |

---

### `POST /api/v1/auth/designer/login/dev` 🔓

开发模式登录（无需 openid，仅需手机号）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| phone | string | ✅ | 手机号码 |

---

### `POST /api/v1/auth/designer/wechat-phone` 🔓

微信手机号快捷登录。前端通过 `wx.login()` + `<open-type="getPhoneNumber">` 获取参数。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| wxCode | string | ✅ | `wx.login()` 返回的 code |
| phoneCode | string | ✅ | `getPhoneNumber` 按钮返回的 code |

**异常**：微信 AppID 未配置时返回 `501`，前端应降级为手动输入。

---

### `GET /api/v1/auth/designer/me` 🔒👤

获取当前登录设计师的个人信息。

---

## 3. 分类字典

### `GET /api/v1/categories` 🔓

获取所有启用的分类，按 `type`（house_type | area | style）分组。

**响应示例**：
```json
{
  "success": true,
  "data": {
    "house_type": [
      { "id": 1, "type": "house_type", "name": "三居室", "sort_order": 1 }
    ],
    "area": [
      { "id": 10, "type": "area", "name": "客厅", "sort_order": 1 }
    ],
    "style": [
      { "id": 20, "type": "style", "name": "现代简约", "sort_order": 1 }
    ]
  }
}
```

---

### `GET /api/v1/admin/categories` 🔒🛡️

获取全部分类（含已禁用）。

### `POST /api/v1/admin/categories` 🔒🛡️

新增分类。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| type | string | ✅ | house_type / area / style |
| name | string | ✅ | 分类名称 |
| sort_order | number | ❌ | 排序权重 |

### `PUT /api/v1/admin/categories/:id` 🔒🛡️

编辑分类。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| name | string | ❌ | 新名称 |
| sort_order | number | ❌ | 排序权重 |
| is_active | number | ❌ | 1=启用 0=禁用 |

### `DELETE /api/v1/admin/categories/:id` 🔒🛡️

删除分类。被作品引用时返回 `409`。

---

## 4. 作品（公开）

### `GET /api/v1/works` 🔓

作品公开列表 — 多维筛选 + 排序 + 分页。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| house_type_id | number | ❌ | 户型 ID |
| area_category_id | number | ❌ | 部位 ID |
| style_category_id | number | ❌ | 风格 ID |
| keyword | string | ❌ | 标题/描述搜索 |
| budget_min | number | ❌ | 预算下限（万元） |
| budget_max | number | ❌ | 预算上限（万元） |
| area_min | number | ❌ | 面积下限（㎡） |
| area_max | number | ❌ | 面积上限（㎡） |
| sort_by | string | ❌ | newest / popular / budget_asc / budget_desc |
| page | number | ❌ | 页码，默认 1 |
| page_size | number | ❌ | 每页条数，默认 12，上限 50 |

**请求示例**：
```
GET /api/v1/works?style_category_id=20&sort_by=newest&page=1&page_size=12
```

---

### `GET /api/v1/works/hot` 🔓

首页热门推荐。注意：此路由声明在 `/works/:id` 之前。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| limit | number | ❌ | 数量，默认 6，上限 20 |

---

### `GET /api/v1/works/:id` 🔓

作品详情（含图片列表 + 设计师名片）。**每次请求浏览量 +1**。

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "现代简约三居室",
    "description": "...",
    "cover_image": "/uploads/thumbnails/xxx.jpg",
    "view_count": 2850,
    "house_type": { "id": 1, "name": "三居室" },
    "area_category": { "id": 10, "name": "客厅" },
    "style_category": { "id": 20, "name": "现代简约" },
    "area_sqm": 120.5,
    "budget_min": 15,
    "budget_max": 20,
    "designer": { "id": 2, "name": "张设计", "avatar_url": "...", "years_of_exp": 5 },
    "images": [
      { "id": 1, "image_url": "...", "thumb_url": "...", "sort_order": 0 }
    ]
  }
}
```

---

## 5. 设计师端 — 作品管理

> 全部需要 `🔒👤` 认证（设计师身份）
> 状态流转：draft → pending → approved / rejected

### `GET /api/v1/designer/works` 🔒👤

我的作品列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| status | string | ❌ | draft / pending / approved / rejected |
| keyword | string | ❌ | 标题搜索 |
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

---

### `GET /api/v1/designer/works/:id` 🔒👤

查看自己某个作品详情（含图片）。

### `POST /api/v1/designer/works` 🔒👤

创建新作品（初始状态为 `draft`）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| title | string | ✅ | 作品标题 |
| description | string | ❌ | 作品描述 |
| house_type_id | number | ❌ | 户型 ID |
| area_category_id | number | ❌ | 部位 ID |
| style_category_id | number | ❌ | 风格 ID |
| area_sqm | number | ❌ | 面积（㎡） |
| budget_min | number | ❌ | 预算下限（万元） |
| budget_max | number | ❌ | 预算上限（万元） |
| completion_date | string | ❌ | 完工日期 |
| cover_image | string | ❌ | 封面图 URL |
| image_ids | number[] | ❌ | 关联图片 ID 数组 |

---

### `PUT /api/v1/designer/works/:id` 🔒👤

编辑作品（仅 `draft` / `rejected` 状态可编辑）。

### `DELETE /api/v1/designer/works/:id` 🔒👤

删除作品（仅 `draft` / `rejected` 状态可删除）。

### `POST /api/v1/designer/works/:id/submit` 🔒👤

提交审核（draft / rejected → pending）。

### `PATCH /api/v1/designer/works/:id/cover` 🔒👤

设置作品封面图（从已关联图片中选取一张作为封面）。

**请求体**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| image_url | string | ✅ | 图片的相对路径 URL |

**注意**：图片必须已关联到该作品（即存在于 case_images 表中）。

### `GET /api/v1/designer/stats` 🔒👤

个人数据统计。

**响应示例**：
```json
{
  "success": true,
  "data": {
    "total_works": 12,
    "draft_count": 2,
    "pending_count": 1,
    "approved_count": 8,
    "rejected_count": 1,
    "total_views": 50759,
    "recent_works": [...]
  }
}
```

---

## 6. 管理端 — 作品审核

> 全部需要 `🔒🛡️` 认证（管理员身份）

### `GET /api/v1/admin/works` 🔒🛡️

管理端作品列表（所有状态）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| review_status | string | ❌ | draft / pending / approved / rejected / archived |
| designer_id | number | ❌ | 按设计师筛选 |
| keyword | string | ❌ | 标题搜索 |
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

### `GET /api/v1/admin/works/:id` 🔒🛡️

管理端作品详情（所有状态可见）。

### `POST /api/v1/admin/works/:id/approve` 🔒🛡️

审核通过（pending → approved）。

### `POST /api/v1/admin/works/:id/reject` 🔒🛡️

审核驳回（pending → rejected）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| reason | string | ✅ | 驳回原因 |

### `POST /api/v1/admin/works/batch` 🔒🛡️

批量操作（审核通过/驳回、下架/上架/删除）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| ids | number[] | ✅ | 作品 ID 数组 |
| action | string | ✅ | approve / reject / offline / online / delete |
| reason | string | ❌ | 驳回原因（action=reject 时建议填写） |

**响应示例**：
```json
{ "success": true, "data": { "success": 3, "skipped": 1 } }
```

### `PATCH /api/v1/admin/works/:id/hot` 🔒🛡️

切换热门标记（仅 approved 作品）。

### `PATCH /api/v1/admin/works/:id/cover` 🔒🛡️

管理端设置作品封面图（从已关联图片中选取一张作为封面）。

**请求体**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| image_url | string | ✅ | 图片的相对路径 URL |

### `POST /api/v1/admin/works/:id/offline` 🔒🛡️

下架作品（approved → offline）。下架后作品不在小程序端展示，可重新上架。

### `POST /api/v1/admin/works/:id/online` 🔒🛡️

上架作品（offline → approved）。已下架的作品重新在小程序端展示。

### `DELETE /api/v1/admin/works/:id` 🔒🛡️

管理员删除作品（仅 offline 状态可删除）。删除后数据不可恢复。

### `POST /api/v1/admin/works/:id/archive` 🔒🛡️

归档作品（approved / rejected / offline → archived）。归档后：
- 从默认作品列表中隐藏
- 不再参与审核流转
- 数据完整保留，可随时查看
- 目前归档后无法自行恢复

---

## 7. 设计师管理

> 全部需要 `🔒🛡️` 认证（管理员身份）

### `GET /api/v1/admin/designers` 🔒🛡️

设计师列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| keyword | string | ❌ | 姓名/手机搜索 |
| status | string | ❌ | active / inactive |
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

### `GET /api/v1/admin/designers/:id` 🔒🛡️

设计师详情（含作品统计）。

### `POST /api/v1/admin/designers` 🔒🛡️

新增设计师（管理后台手动录入）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| name | string | ✅ | 姓名 |
| phone | string | ✅ | 手机号（唯一） |
| avatar_url | string | ❌ | 头像 URL |
| years_of_exp | number | ❌ | 从业年限 |
| bio | string | ❌ | 个人简介 |

### `PUT /api/v1/admin/designers/:id` 🔒🛡️

编辑设计师信息。

### `PATCH /api/v1/admin/designers/:id/status` 🔒🛡️

切换设计师启用/禁用状态（自动反转）。禁用后该设计师无法登录小程序。

### `DELETE /api/v1/admin/designers/:id` 🔒🛡️

删除设计师。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| keep_works | string | ❌ | `"true"` 保留作品转移至管理员 / `"false"` 一并删除 / 不传则无作品时可删 |

---

### `PUT /api/v1/designer/profile` 🔒👤

设计师自行编辑个人资料。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| name | string | ❌ | 姓名 |
| phone | string | ❌ | 手机号（唯一性校验） |
| avatar_url | string | ❌ | 头像 URL（变更后进入审核通道，非即时生效） |
| years_of_exp | number | ❌ | 从业年限 |
| bio | string | ❌ | 个人简介 |

**注意**：`avatar_url` 变更后不会直接更新——新头像存入 `pending_avatar_url`，需管理员审核通过后才正式生效。审核期间前端显示待审核头像并带 ⏳ 标记。

---

### 头像审核接口（管理端）

> 全部需要 `🔒🛡️` 认证（管理员身份）

### `GET /api/v1/admin/avatar-reviews` 🔒🛡️

待审核头像列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数，默认 12 |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 42,
        "name": "张设计",
        "avatar_url": "/uploads/thumbnails/old.jpg",
        "pending_avatar_url": "/uploads/thumbnails/new.jpg",
        "avatar_review_status": "pending",
        "updated_at": "2026-06-10 09:08:17"
      }
    ],
    "pagination": { "page": 1, "page_size": 12, "total": 1, "total_pages": 1 }
  }
}
```

### `POST /api/v1/admin/avatar-reviews/:id/approve` 🔒🛡️

审核通过 — `pending_avatar_url` → `avatar_url`，清除待审状态。

### `POST /api/v1/admin/avatar-reviews/:id/reject` 🔒🛡️

审核驳回 — 清除 `pending_avatar_url`，保留原有 `avatar_url`。

---

## 8. 仪表盘

> 全部需要 `🔒🛡️` 认证（管理员身份）

### `GET /api/v1/admin/dashboard/overview` 🔒🛡️

概览卡片数据。

**响应示例**：
```json
{
  "success": true,
  "data": {
    "total_works": 45,
    "total_designers": 12,
    "total_views": 128000,
    "pending_reviews": 3,
    "total_categories": 24,
    "recent_works": [...]
  }
}
```

### `GET /api/v1/admin/dashboard/trends` 🔒🛡️

按月统计的趋势数据。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| months | number | ❌ | 统计月数，默认 12，上限 24 |

### `GET /api/v1/admin/dashboard/distribution` 🔒🛡️

分类分布统计（按户型/部位/风格维度）。

---

## 9. 图片库

> 全部需要 `🔒🛡️` 认证（管理员身份）

### `GET /api/v1/admin/images` 🔒🛡️

图片库列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| uploaded_by | number | ❌ | 上传者 ID |
| date_from | string | ❌ | 起始日期（YYYY-MM-DD） |
| date_to | string | ❌ | 截止日期（YYYY-MM-DD） |
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

### `GET /api/v1/admin/images/:id` 🔒🛡️

图片详情。

### `DELETE /api/v1/admin/images/:id` 🔒🛡️

删除图片。有作品引用时返回 `409`。

### `POST /api/v1/admin/images/batch` 🔒🛡️

批量删除。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| ids | number[] | ✅ | 图片 ID 数组 |
| action | string | ✅ | 目前仅支持 `"delete"` |

---

## 10. 文件上传

> 需要 `🔒` 认证（管理员或设计师）

### `POST /api/v1/upload` 🔒

单文件上传。请求格式：`multipart/form-data`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| file | File | ✅ | 图片文件（≤10MB，jpg/png/gif/webp） |
| uploaded_by | number | ❌ | 上传者 ID（仅管理员可指定） |

**响应示例**：
```json
{
  "success": true,
  "data": { "id": 42, "image_url": "/uploads/originals/xxx.jpg", "thumb_url": "/uploads/thumbnails/xxx.jpg" }
}
```

---

### `POST /api/v1/upload/multiple` 🔒

多文件上传（最多 9 张）。请求格式：`multipart/form-data`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| files | File[] | ✅ | 图片文件数组（≤9 张） |
| uploaded_by | number | ❌ | 上传者 ID（仅管理员可指定） |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "uploaded": [{ "id": 42, "image_url": "..." }],
    "failed": []
  }
}
```

---

## 11. 系统设置

### `GET /api/v1/homepage/config` 🔓

小程序首页配置（轮播图 + 热门推荐位）。

---

### `GET /api/v1/admin/settings` 🔒🛡️

配置列表（按类型筛选）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| type | string | ❌ | banner / hot_works |

### `POST /api/v1/admin/settings` 🔒🛡️

新增首页配置。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| config_type | string | ✅ | banner / hot_works |
| config_value | object | ✅ | 配置值（JSON） |
| sort_order | number | ❌ | 排序 |

### `PUT /api/v1/admin/settings/:id` 🔒🛡️

编辑配置。

### `DELETE /api/v1/admin/settings/:id` 🔒🛡️

删除配置。

---

## 12. 账号管理

> 全部需要 `🔒🛡️` 认证（管理员身份）

### `GET /api/v1/admin/accounts` 🔒🛡️

账号列表（角色筛选 + 搜索 + 分页）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| role | string | ❌ | guest / designer |
| status | string | ❌ | active / inactive |
| keyword | string | ❌ | 姓名/手机搜索 |
| page | number | ❌ | 页码 |
| page_size | number | ❌ | 每页条数 |

### `GET /api/v1/admin/accounts/summary` 🔒🛡️

角色汇总统计（各角色人数）。

### `PUT /api/v1/admin/accounts/:id/role` 🔒🛡️

变更账号角色（游客 ↔ 设计师）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| role | string | ✅ | guest / designer |
| name | string | ❌ | 设计师姓名（升级时可用） |
| years_of_exp | number | ❌ | 从业年限（升级时可用） |
| bio | string | ❌ | 个人简介（升级时可用） |

---

## 错误码速查

| HTTP 状态码 | 含义 | 常见场景 |
|:----------:|------|---------|
| 200 | 成功 | 正常返回 |
| 201 | 创建成功 | POST 新建资源 |
| 400 | 请求错误 | 参数缺失、格式错误 |
| 401 | 未认证 | Token 缺失/过期/无效 |
| 403 | 无权限 | 角色不匹配（如设计师访问管理员接口） |
| 404 | 不存在 | 资源不存在或接口不存在 |
| 409 | 冲突 | 唯一性约束、外键引用阻止删除 |
| 413 | 文件过大 | 超过 10MB 上传限制 |
| 422 | 校验失败 | 输入校验不通过 |
| 429 | 频率限制 | 登录尝试过多（账户已锁定） |
| 500 | 服务器错误 | 内部异常（自动记录日志） |

---

# V1.3 — 施工阶段 API

## 管理端

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/admin/material-orders/:orderNo/start-construction` | admin | 开启施工，创建5阶段 |
| PUT | `/api/v1/admin/construction-phases/:phaseId/assign` | admin | 派单4人 |
| POST | `/api/v1/admin/construction-phases/:phaseId/approve-design` | admin | 二审设计通过 |
| POST | `/api/v1/admin/construction-phases/:phaseId/reject-design` | admin | 二审设计驳回 |
| POST | `/api/v1/admin/construction-phases/:phaseId/approve-construction` | admin | 二审完工通过 |
| POST | `/api/v1/admin/construction-phases/:phaseId/reject-construction` | admin | 二审完工驳回 |
| POST | `/api/v1/admin/material-orders/:orderNo/reopen` | admin | 重新处理异议订单 |

## 设计师端

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/designer/construction-phases` | personnel=designer | 我的阶段列表 |
| PUT | `/api/v1/construction-phases/:phaseId/upload-design` | JWT | 上传设计图 |

## 设计总监端

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/director/design/phases` | personnel=design_director | 待审核设计列表 |
| POST | `/api/v1/construction-phases/:phaseId/approve-design-director` | JWT | 一审通过 |
| POST | `/api/v1/construction-phases/:phaseId/reject-design-director` | JWT | 一审驳回 |

## 工程师端

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/engineer/construction-phases` | personnel=engineer | 我的阶段列表 |
| POST | `/api/v1/construction-phases/:phaseId/confirm-design` | JWT | 确认设计 |
| PUT | `/api/v1/construction-phases/:phaseId/upload-construction` | JWT | 上传完工图 |

## 工程总监端

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/director/engineering/phases` | personnel=engineering_director | 待审核完工列表 |
| POST | `/api/v1/construction-phases/:phaseId/approve-engineering-director` | JWT | 一审通过 |
| POST | `/api/v1/construction-phases/:phaseId/reject-engineering-director` | JWT | 一审驳回 |

## 通用/业主端

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/construction-phases/:phaseId` | JWT | 阶段详情 |
| GET | `/api/v1/material-orders/:orderNo/phases` | JWT | 订单全部阶段 |
| POST | `/api/v1/construction-phases/:phaseId/accept` | JWT | 业主验收通过 |
| POST | `/api/v1/construction-phases/:phaseId/dispute` | JWT | 业主验收驳回 |
| 501 | 未配置 | 微信 AppID 未配置 |
