# 管理后台速查 (admin)

React 19 + TailwindCSS 4 + Vite 8 + React Router 7，基础路径 `/admin/`，Vite 代理 `/api` → `localhost:3000`。

```
admin/src/
├── main.jsx / App.jsx    # 入口 + AuthProvider + RouterProvider
├── api/client.js         # Axios（baseURL=/api/v1，自动 Bearer + 解包 data）
├── router/index.jsx      # 路由注册
├── contexts/AuthContext.jsx
└── components/           # Layout, Sidebar, HeaderBar, Modal, ConfirmDialog, Toast, DoorSeriesManager
```

## 路由表

| 路径 | 页面 | 说明 |
|------|------|------|
| `/dashboard` | Dashboard | |
| `/works` | Works | |
| `/designers` | Designers | |
| `/avatar-reviews` | AvatarReviews | |
| `/properties` | Properties | |
| `/material-categories` | MaterialCategories | 材料分类 |
| `/materials` | Materials | 材料管理 |
| `/material-orders` | MaterialOrders | 选材订单 |
| `/measurement-appointments` | MeasurementAppointments | |
| `/lottery` | LotteryConfig | |
| `/operation-data` | OperationData | |
| `/reports` | Reports | |
| `/categories` | Categories | 作品分类 |
| `/images` | Images | 图片库 |
| `/settings` | Settings | |
| `/style-wizard/styles` | StyleWizardStyles | 风格管理 |
| `/style-wizard/categories` | StyleWizardCategories | 品类管理 |
| `/style-wizard/materials` | StyleWizardMaterials | 材料管理（二级菜单，可展开） |
| `/style-wizard/materials/1` | StyleWizardMaterials | └ 瓷砖（隐藏价格） |
| `/style-wizard/materials/2` | StyleWizardDoors | └ 室内木门（门系列管理） |
| `/style-wizard/bathroom-doors` | StyleWizardBathroomDoors | └ 卫生间门 |
| `/style-wizard/materials/3` | StyleWizardMaterials | └ 卫浴 |
| `/style-wizard/materials/4` | StyleWizardMaterials | └ 装饰定制 |
| `/style-wizard/materials/6` | StyleWizardMaterials | └ 家具（含沙发/床/餐桌餐椅/电视柜/茶几/床头柜） |
| `/style-wizard/materials/7` | StyleWizardLighting | └ 灯具（套餐管理） |
| `/style-wizard/orders` | StyleWizardOrders | 选材单 |

> 路由顺序：`materials/2` 和 `materials/7` 必须在 `materials/:categoryId` 之前。

## 设计 Token

| 用途 | Class |
|------|-------|
| 页面 | `p-4 lg:p-6 space-y-4` |
| 卡片 | `bg-white rounded-xl shadow-sm border border-gray-100 p-4` |
| 主按钮 | `bg-slate-900 text-white hover:bg-slate-800` |
| 输入框 | `px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent` |
| 表头 | `border-b border-gray-100 bg-gray-50/50 text-gray-500 font-medium text-xs` |

## 组件陷阱

- **Modal**：必须显式传 `open`，否则不显示
- **EmptyState**：prop 是 `description`，不是 `desc`
- 不用 `<text>`，用 `<span>`
- 新增页面：router → Sidebar → HeaderBar → build

## StyleWizardMaterials 子品类检测

页面级变量（`lockedCategory` = URL 参数）和表单级变量（`selectedSub` = 当前选中子品类）：

```
isTilePage / isBathPage / isDecorationPage / isFurniturePage — URL 锁定品类时生效
isTile / isBath / isDecoration / isFurniture / isCabinetColor / isCountertop / ... — 选中子品类后生效
isSofa / isBed / isDining / isTVCabinet / isCoffeeTable / isBedsideTable — 家具子品类
```

家具品类（page_number=5）按子品类显示专属字段：沙发→材质面料+贵妃位；床→材质面料；餐桌餐椅→双型号；茶几→单/多体+形状规格；电视柜→标题；床头柜→型号+规格。

新增子品类分支：加检测变量 → validateForm → handleSubmit → 表单 JSX → 表格列。
