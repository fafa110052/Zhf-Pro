# 设计文档：选材单管理 — 导出 Excel

- 日期：2026-07-22
- 状态：已确认

## 背景

选材单管理页（`StyleWizardOrders`）已有列表/筛选/详情功能，需新增按当前筛选条件导出 Excel。

## 方案

### 前端

在 [StyleWizardOrders.jsx](admin/src/pages/StyleWizardOrders.jsx) 标题栏右侧、状态筛选左侧加"导出Excel"按钮。

- 按钮按下 → `fetch` 调用 `GET /api/v1/admin/orders/export?status=xxx`（`responseType: 'blob'`）
- 接收 blob → 创建 `<a>` 下载链接触发浏览器下载
- 文件名：`选材单_20260722.xlsx`

### 后端

- 新增路由：`GET /api/v1/admin/orders/export`（需 admin 认证）
- 新增 service 方法：`styleWizardService.exportOrders(status)`
- 使用 `exceljs` 库生成 `.xlsx`
- 不分页 — 导出当前筛选条件下所有数据

### Excel 列

| 列 | 字段 | 宽度 |
|----|------|------|
| 订单号 | order_no | 14 |
| 业主姓名 | owner_name | 10 |
| 联系电话 | owner_phone | 14 |
| 小区 | community | 16 |
| 房号 | room_number | 10 |
| 选择风格 | style_name | 12 |
| 状态 | status 中文映射 | 8 |
| 原价合计 | original_total | 12 |
| 优惠合计 | discount_total | 12 |
| 提交时间 | submitted_at | 18 |
| 选材明细 | items JSON 展开（子品类名/材料名/原价/优惠价，多项换行） | 40 |

### 依赖

- 安装 `exceljs`（npm）
- 无需前端新依赖

### 影响范围

- `server/src/routes/style-wizard.js` — 新增 1 个 GET 路由
- `server/src/services/styleWizardService.js` — 新增 `exportOrders` 方法
- `admin/src/pages/StyleWizardOrders.jsx` — 新增 1 个按钮 + 下载逻辑
