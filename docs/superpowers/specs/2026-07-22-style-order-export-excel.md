# 设计文档：选材单管理 — 导出 Excel

- 日期：2026-07-22
- 状态：已上线

## 背景

选材单管理页（[StyleWizardOrders](admin/src/pages/StyleWizardOrders.jsx)）已有列表/筛选/详情功能，新增导出 Excel 功能。

## 最终实现

### 前端 — 导出弹窗

- "导出Excel"按钮放在标题栏右侧、状态筛选左侧（绿色，download 图标）
- 点击弹出 Modal，加载当前筛选条件下全部订单（page_size: 1000）
- 每条订单行：checkbox + 订单号 + 业主姓名 + 状态标签
- 全选 checkbox（顶部，带"全选（共 N 单）"文案）
- 底部：已选计数 + 取消/导出按钮
- 导出用 `fetch`（blob 模式），文件名从 `Content-Disposition` 头解析

### 后端 — Excel 生成

- 路由：`GET /api/v1/admin/orders/export?order_ids=1,2,3`（admin 认证）
- **路由必须放在 `:id` 之前**，防止 "export" 被当作 ID 参数
- Service：`styleWizardService.exportOrders(orderIds)`
- 依赖：[exceljs](https://www.npmjs.com/package/exceljs) 4.4.0

### Excel 结构（13 列）

| 列 | 字段 | 合并策略 |
|----|------|---------|
| A 订单号 | order_no | 按订单合并 |
| B 业主 | owner_name | 按订单合并 |
| C 电话 | owner_phone | 按订单合并 |
| D 小区 | community | 按订单合并 |
| E 房号 | room_number | 按订单合并 |
| F 风格 | style_name | 按订单合并 |
| G 状态 | status 中文 | 按订单合并 |
| H 品类 | 子品类→品类 JOIN 解析 | 连续相同值合并 |
| I 子品类 | subcategory_name | 连续相同值合并 |
| J 材料名称 | item name | — |
| K 原价 | original_price | — |
| L 优惠价 | discount_price | — |
| M 提交时间 | submitted_at | 按订单合并 |

### 关键设计决策

- **选材明细展开为独立行**：每个选材项占一行，品类/子品类/材料名称/原价/优惠价各一列，不挤在一个单元格
- **通用信息单元格合并**：A-G + M 列按订单范围合并，同一订单的多行共享
- **品类/子品类合并**：同一订单内连续相同品类名或子品类名的单元格合并
- **门系列品类解析**：`series_name` 字段存在的 item 自动归为"室内木门"
- **自动换行**：所有数据行设置 `wrapText: true, vertical: 'middle'`
- **文件名**：单订单 `风格选材[订单号].xlsx`，多订单 `风格选材[日期].xlsx`
- **Content-Disposition**：用 RFC 5987 格式 `filename*=UTF-8''...` 避免中文乱码

### 影响范围

- `server/src/routes/style-wizard.js` — 新增 1 个 GET 路由（第 137-155 行）
- `server/src/services/styleWizardService.js` — 新增 `exportOrders` 方法
- `admin/src/pages/StyleWizardOrders.jsx` — 新增导出按钮 + 弹窗 + 下载逻辑
- `server/package.json` — 新增 `exceljs` 依赖
