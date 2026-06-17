# 住好房展示平台 V1.1 — API 接口文档

> **版本**: V1.1.0  
> **基准 URL**: `/api/v1`  
> **认证方式**: `Authorization: Bearer <JWT>`  
> **日期**: 2026-06-12  

---

## 通用约定

### 认证

| 标记 | 说明 |
|------|------|
| `—` | 无需认证 |
| `JWT` | 需要 Bearer Token（任意登录用户） |
| `admin` | 需要管理员 Token |

### 通用响应格式

**成功**:
```json
{
  "data": { ... },
  "pagination": { "page": 1, "page_size": 20, "total": 42, "total_pages": 3 }
}
```

**错误**:
```json
{
  "error": { "message": "描述信息", "status": 400 }
}
```

### HTTP 状态码

| 状态码 | 说明 |
|:---:|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如删除被引用数据） |
| 500 | 服务器错误 |

---

## 一、楼盘管理

### 1.1 楼盘列表（Admin）

```
GET /api/v1/admin/properties
```

**认证**: `admin`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| keyword | string | — | 楼盘名称/地址模糊搜索 |
| material_enabled | int | — | 筛选选材功能状态（0/1） |
| page | int | — | 页码，默认 1 |
| page_size | int | — | 每页条数，默认 20，最大 50 |

**成功响应** (200):
```json
{
  "data": {
    "list": [
      {
        "id": 1,
        "name": "翡翠湖畔花园",
        "address": "深圳市南山区科技园一路8号",
        "cover_image": "/uploads/properties/xxx.jpg",
        "property_code": "01",
        "material_enabled": 1,
        "material_count": 12,
        "created_at": "2026-06-01T10:00:00.000Z",
        "updated_at": "2026-06-05T14:30:00.000Z"
      }
    ]
  },
  "pagination": { "page": 1, "page_size": 20, "total": 2, "total_pages": 1 }
}
```

---

### 1.2 楼盘详情（Admin）

```
GET /api/v1/admin/properties/:id
```

**认证**: `admin`

**成功响应** (200):
```json
{
  "data": {
    "id": 1,
    "name": "翡翠湖畔花园",
    "address": "深圳市南山区科技园一路8号",
    "cover_image": "/uploads/properties/xxx.jpg",
    "property_code": "01",
    "material_enabled": 1,
    "material_count": 12,
    "created_at": "2026-06-01T10:00:00.000Z",
    "updated_at": "2026-06-05T14:30:00.000Z"
  }
}
```

---

### 1.3 添加楼盘（Admin）

```
POST /api/v1/admin/properties
```

**认证**: `admin`

**请求体**:
```json
{
  "name": "翡翠湖畔花园",
  "address": "深圳市南山区科技园一路8号",
  "cover_image": "/uploads/properties/xxx.jpg",
  "property_code": "01",
  "material_enabled": 0
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| name | string | ✅ | 楼盘名称，max 64 |
| address | string | ✅ | 详细地址，max 256 |
| cover_image | string | — | 封面图 URL |
| property_code | string | ✅ | 2位数字，唯一 |
| material_enabled | int | — | 默认 0 |

**成功响应** (201):
```json
{ "data": { "id": 1 } }
```

**错误响应** (409):
```json
{ "error": { "message": "小区编号已存在", "status": 409 } }
```

---

### 1.4 编辑楼盘（Admin）

```
PUT /api/v1/admin/properties/:id
```

**认证**: `admin`

**请求体**: 同 POST，所有字段可选（不支持修改 property_code）

**成功响应** (200):
```json
{ "data": { "id": 1 } }
```

---

### 1.5 删除楼盘（Admin）

```
DELETE /api/v1/admin/properties/:id
```

**认证**: `admin`

**成功响应** (200):
```json
{ "data": { "message": "已删除" } }
```

**错误响应** (409):
```json
{ "error": { "message": "该楼盘下存在 12 条材料，无法删除", "status": 409 } }
```

---

### 1.6 已开通选材的楼盘列表（Public）

```
GET /api/v1/properties
```

**认证**: `—`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| keyword | string | — | 楼盘名称模糊搜索 |

**成功响应** (200):
```json
{
  "data": {
    "list": [
      {
        "id": 1,
        "name": "翡翠湖畔花园",
        "address": "深圳市南山区科技园一路8号",
        "cover_image": "/uploads/properties/xxx.jpg",
        "material_enabled": 1
      }
    ]
  }
}
```

> 注：仅返回 `material_enabled=1` 的楼盘。

---

## 二、材料分类管理

### 2.1 分类列表（Admin）

```
GET /api/v1/admin/material-categories
```

**认证**: `admin`

**查询参数**: `page`, `page_size`

**成功响应** (200):
```json
{
  "data": {
    "list": [
      {
        "id": 1,
        "name": "地板",
        "sort_order": 1,
        "material_count": 12,
        "created_at": "2026-06-01T10:00:00.000Z"
      }
    ]
  },
  "pagination": { "page": 1, "page_size": 20, "total": 7, "total_pages": 1 }
}
```

---

### 2.2 添加分类（Admin）

```
POST /api/v1/admin/material-categories
```

**认证**: `admin`

**请求体**:
```json
{
  "name": "地板",
  "sort_order": 1
}
```

**成功响应** (201):
```json
{ "data": { "id": 1 } }
```

---

### 2.3 编辑分类（Admin）

```
PUT /api/v1/admin/material-categories/:id
```

**认证**: `admin`

**请求体**: 同 POST，所有字段可选

---

### 2.4 删除分类（Admin）

```
DELETE /api/v1/admin/material-categories/:id
```

**认证**: `admin`

**错误响应** (409):
```json
{ "error": { "message": "该分类下存在 12 条材料，无法删除", "status": 409 } }
```

---

## 三、材料管理

### 3.1 材料列表（Admin）

```
GET /api/v1/admin/materials
```

**认证**: `admin`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| property_id | int | — | 按楼盘筛选 |
| category_id | int | — | 按分类筛选 |
| keyword | string | — | 材料名称/品牌模糊搜索 |
| page | int | — | 默认 1 |
| page_size | int | — | 默认 20 |

**成功响应** (200):
```json
{
  "data": {
    "list": [
      {
        "id": 1,
        "category_id": 1,
        "category_name": "地板",
        "property_id": 1,
        "property_name": "翡翠湖畔花园",
        "name": "实木复合地板",
        "brand": "品牌A",
        "image_url": "/uploads/materials/xxx.jpg",
        "unit_price": 128.00,
        "price_unit": "/㎡",
        "description": "环保E0级，适用地暖",
        "created_at": "2026-06-05T10:00:00.000Z"
      }
    ]
  },
  "pagination": { "page": 1, "page_size": 20, "total": 50, "total_pages": 3 }
}
```

---

### 3.2 材料详情（Admin）

```
GET /api/v1/admin/materials/:id
```

**认证**: `admin`

---

### 3.3 添加材料（Admin）

```
POST /api/v1/admin/materials
```

**认证**: `admin`

**请求体**:
```json
{
  "category_id": 1,
  "property_id": 1,
  "name": "实木复合地板",
  "brand": "品牌A",
  "image_url": "/uploads/materials/xxx.jpg",
  "unit_price": 128.00,
  "price_unit": "/㎡",
  "description": "环保E0级，适用地暖"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| category_id | int | ✅ | 材料分类 ID |
| property_id | int | ✅ | 楼盘 ID |
| name | string | ✅ | 材料名称，max 128 |
| brand | string | ✅ | 品牌，max 64 |
| image_url | string | — | 图片 |
| unit_price | number | ✅ | 单价（元），> 0 |
| price_unit | string | — | 默认 `/㎡`，可选 `/件` |
| description | string | — | max 256 |

---

### 3.4 编辑材料（Admin）

```
PUT /api/v1/admin/materials/:id
```

**认证**: `admin`

**请求体**: 同 POST，所有字段可选

---

### 3.5 删除材料（Admin）

```
DELETE /api/v1/admin/materials/:id
```

**认证**: `admin`

**错误响应** (409):
```json
{ "error": { "message": "该材料已被选材申请引用，无法删除", "status": 409 } }
```

---

### 3.6 某楼盘的材料列表（Public — 按分类分组）

```
GET /api/v1/properties/:propertyId/materials
```

**认证**: `—`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| keyword | string | — | 材料名称模糊搜索 |

**成功响应** (200):
```json
{
  "data": {
    "property_id": 1,
    "property_name": "翡翠湖畔花园",
    "categories": [
      {
        "category_id": 1,
        "category_name": "地板",
        "materials": [
          {
            "id": 1,
            "name": "实木复合地板",
            "brand": "品牌A",
            "image_url": "/uploads/materials/xxx.jpg",
            "unit_price": 128.00,
            "price_unit": "/㎡",
            "description": "环保E0级，适用地暖"
          }
        ]
      },
      {
        "category_id": 2,
        "category_name": "墙面",
        "materials": []
      }
    ]
  }
}
```

> 注：分类按 `sort_order` 排序；无材料的分类也返回（空数组）。

---

## 四、选材申请（用户端）

### 4.1 提交选材申请

```
POST /api/v1/material-orders
```

**认证**: `JWT`（未登录前端自动触发登录后重试）

**请求体**:
```json
{
  "property_id": 1,
  "room_number": "3栋1单元1001",
  "applicant_name": "张三",
  "applicant_phone": "13800008888",
  "remark": "希望使用环保材料",
  "items": [
    { "material_id": 5, "category_id": 1 },
    { "material_id": 12, "category_id": 2 },
    { "material_id": 23, "category_id": 5 }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| property_id | int | ✅ | 楼盘 ID |
| room_number | string | ✅ | 房号，max 64 |
| applicant_name | string | ✅ | 联系人，max 32 |
| applicant_phone | string | ✅ | 手机号，格式 `1[3-9]\d{9}` |
| remark | string | — | 备注，max 200 |
| items | array | ✅ | 材料列表，至少 1 项 |
| items[].material_id | int | ✅ | 材料 ID |
| items[].category_id | int | ✅ | 材料分类 ID（校验每类单选） |

**校验规则**:
1. 同一 category_id 下只能有 1 个 material_id
2. material_id 必须存在且属于指定 property_id
3. category_id 必须与 material 的 category_id 一致

**成功响应** (201):
```json
{
  "data": {
    "order_no": "202606120101",
    "status": "pending",
    "created_at": "2026-06-12T14:30:00.000Z"
  }
}
```

---

### 4.2 我的申请列表

```
GET /api/v1/material-orders/my
```

**认证**: `JWT`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| page | int | — | 默认 1 |
| page_size | int | — | 默认 20 |

**成功响应** (200):
```json
{
  "data": {
    "list": [
      {
        "order_no": "202606120101",
        "property_name": "翡翠湖畔花园",
        "room_number": "3栋1单元1001",
        "status": "pending",
        "created_at": "2026-06-12T14:30:00.000Z"
      }
    ]
  },
  "pagination": { "page": 1, "page_size": 20, "total": 5, "total_pages": 1 }
}
```

> 注：仅返回当前用户自己的申请。

---

### 4.3 申请详情

```
GET /api/v1/material-orders/detail/:orderNo
```

**认证**: `JWT`（仅可查看自己的申请）

**成功响应** (200):
```json
{
  "data": {
    "order_no": "202606120101",
    "status": "approved",
    "property_name": "翡翠湖畔花园",
    "room_number": "3栋1单元1001",
    "applicant_name": "张三",
    "applicant_phone": "13800008888",
    "remark": "希望使用环保材料",
    "items": [
      {
        "category_name": "地板",
        "material_name": "实木复合地板",
        "brand": "品牌A",
        "unit_price": 128.00,
        "price_unit": "/㎡"
      }
    ],
    "designer": {
      "id": 5, "name": "李工", "phone": "138****9999"
    },
    "supervisor": {
      "id": 8, "name": "王监理", "phone": "139****7777"
    },
    "reviewed_at": "2026-06-13T10:00:00.000Z",
    "reject_reason": null,
    "logs": [
      {
        "action": "submit",
        "detail": "用户提交申请",
        "created_at": "2026-06-12T14:30:00.000Z"
      },
      {
        "action": "approve",
        "detail": "管理员审核通过，分配设计师 李工，监理 王监理",
        "created_at": "2026-06-13T10:00:00.000Z"
      }
    ],
    "created_at": "2026-06-12T14:30:00.000Z"
  }
}
```

> 注：`designer` 和 `supervisor` 仅 status 为 `approved`/`completed` 时返回。

---

## 五、选材管理（Admin）

### 5.1 申请列表（Admin）

```
GET /api/v1/admin/material-orders
```

**认证**: `admin`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| property_id | int | — | 按楼盘筛选 |
| order_no | string | — | 订单号精确搜索 |
| status | string | — | 状态筛选：pending/approved/rejected/completed |
| date_from | string | — | 开始日期 YYYY-MM-DD |
| date_to | string | — | 结束日期 YYYY-MM-DD |
| page | int | — | 默认 1 |
| page_size | int | — | 默认 20 |

**成功响应** (200):
```json
{
  "data": {
    "list": [
      {
        "order_no": "202606120101",
        "property_name": "翡翠湖畔花园",
        "room_number": "3栋1单元1001",
        "applicant_name": "张三",
        "applicant_phone": "138****8888",
        "status": "pending",
        "created_at": "2026-06-12T14:30:00.000Z"
      }
    ]
  },
  "pagination": { "page": 1, "page_size": 20, "total": 42, "total_pages": 3 }
}
```

> 注：手机号脱敏，中间 4 位显示为 `****`。

---

### 5.2 申请详情（Admin）

```
GET /api/v1/admin/material-orders/:orderNo
```

**认证**: `admin`

**响应**：同用户端 4.3，额外包含申请人完整手机号。

---

### 5.3 审核通过

```
POST /api/v1/admin/material-orders/:orderNo/approve
```

**认证**: `admin`

**请求体**:
```json
{
  "designer_id": 5,
  "supervisor_id": 8
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| designer_id | int | ✅ | 设计师 ID（personnel_type=designer） |
| supervisor_id | int | ✅ | 监理 ID（personnel_type=supervisor） |

**成功响应** (200):
```json
{
  "data": {
    "order_no": "202606120101",
    "status": "approved",
    "reviewed_at": "2026-06-13T10:00:00.000Z"
  }
}
```

**错误** (400):
```json
{ "error": { "message": "该订单当前状态不允许审核", "status": 400 } }
```

---

### 5.4 驳回申请

```
POST /api/v1/admin/material-orders/:orderNo/reject
```

**认证**: `admin`

**请求体**:
```json
{
  "reason": "材料信息有误，请重新提交"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| reason | string | ✅ | 驳回原因，max 500 |

**成功响应** (200):
```json
{
  "data": {
    "order_no": "202606120101",
    "status": "rejected",
    "reject_reason": "材料信息有误，请重新提交",
    "reviewed_at": "2026-06-13T10:00:00.000Z"
  }
}
```

---

### 5.5 标记完成

```
PATCH /api/v1/admin/material-orders/:orderNo/complete
```

**认证**: `admin`

**成功响应** (200):
```json
{
  "data": {
    "order_no": "202606120101",
    "status": "completed"
  }
}
```

> 仅在 `status=approved` 时可操作。

---

### 5.6 删除订单

```
DELETE /api/v1/admin/material-orders/:orderNo
```

**认证**: `admin`

**成功响应** (200):
```json
{ "data": { "message": "已删除" } }
```

> 级联删除关联的 material_order_items 和 material_order_logs。

---

## 六、人员管理（修改现有接口）

### 6.1 设计师列表（修改）

```
GET /api/v1/admin/designers
```

**新增查询参数**: `personnel_type`（designer/supervisor，不传=全部）

**新增响应字段**:
```json
{
  "personnel_type": "designer",
  "employee_id": "D001"
}
```

---

### 6.2 添加设计师（修改）

```
POST /api/v1/admin/designers
```

**新增请求字段**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| personnel_type | string | ✅ | `designer` 或 `supervisor` |
| employee_id | string | — | 工号，唯一 |

---

### 6.3 编辑设计师（修改）

```
PUT /api/v1/admin/designers/:id
```

**新增请求字段**: 同 POST

---

## 附录

### 接口汇总

| # | Method | Path | Auth | 说明 |
|---|--------|------|:---:|------|
| 1 | GET | `/api/v1/admin/properties` | admin | 楼盘列表 |
| 2 | GET | `/api/v1/admin/properties/:id` | admin | 楼盘详情 |
| 3 | POST | `/api/v1/admin/properties` | admin | 添加楼盘 |
| 4 | PUT | `/api/v1/admin/properties/:id` | admin | 编辑楼盘 |
| 5 | DELETE | `/api/v1/admin/properties/:id` | admin | 删除楼盘 |
| 6 | GET | `/api/v1/properties` | — | 已开通选材楼盘列表 |
| 7 | GET | `/api/v1/admin/material-categories` | admin | 材料分类列表 |
| 8 | POST | `/api/v1/admin/material-categories` | admin | 添加分类 |
| 9 | PUT | `/api/v1/admin/material-categories/:id` | admin | 编辑分类 |
| 10 | DELETE | `/api/v1/admin/material-categories/:id` | admin | 删除分类 |
| 11 | GET | `/api/v1/admin/materials` | admin | 材料列表 |
| 12 | GET | `/api/v1/admin/materials/:id` | admin | 材料详情 |
| 13 | POST | `/api/v1/admin/materials` | admin | 添加材料 |
| 14 | PUT | `/api/v1/admin/materials/:id` | admin | 编辑材料 |
| 15 | DELETE | `/api/v1/admin/materials/:id` | admin | 删除材料 |
| 16 | GET | `/api/v1/properties/:pid/materials` | — | 楼盘材料（分组） |
| 17 | POST | `/api/v1/material-orders` | JWT | 提交申请 |
| 18 | GET | `/api/v1/material-orders/my` | JWT | 我的申请列表 |
| 19 | GET | `/api/v1/material-orders/detail/:no` | JWT | 申请详情（我的） |
| 20 | GET | `/api/v1/admin/material-orders` | admin | 申请列表 |
| 21 | GET | `/api/v1/admin/material-orders/:no` | admin | 申请详情 |
| 22 | POST | `/api/v1/admin/material-orders/:no/approve` | admin | 审核通过 |
| 23 | POST | `/api/v1/admin/material-orders/:no/reject` | admin | 驳回 |
| 24 | PATCH | `/api/v1/admin/material-orders/:no/complete` | admin | 标记完成 |
| 25 | DELETE | `/api/v1/admin/material-orders/:no` | admin | 删除订单 |
| 26 | GET | `/api/v1/admin/designers` | admin | 人员列表（修改） |
| 27 | POST | `/api/v1/admin/designers` | admin | 添加人员（修改） |
| 28 | PUT | `/api/v1/admin/designers/:id` | admin | 编辑人员（修改） |
