# 管理后台速查 (admin)

## 技术栈

React 19 + TailwindCSS 4 + Vite 8 + React Router 7，基础路径 `/admin/`，Vite 代理 `/api` 到 `localhost:3000`。

```
admin/src/
├── main.jsx            # 入口
├── App.jsx             # AuthProvider + RouterProvider
├── index.css           # Tailwind, PingFang SC 字体
├── api/client.js       # Axios 实例（baseURL=/api/v1, Bearer 拦截器, 自动解包 .data）
├── router/index.jsx    # 26 条路由
├── contexts/AuthContext.jsx  # 认证上下文
├── hooks/useKeyboardNav.js   # Ctrl/Cmd 快捷键
├── components/
│   ├── Layout.jsx      # 主布局（侧边栏+顶栏+内容区）
│   ├── ProtectedLayout.jsx  # 认证守卫
│   ├── Sidebar.jsx     # 左侧导航 + MENU_ITEMS
│   ├── HeaderBar.jsx   # 面包屑 + 用户菜单
│   ├── Modal.jsx       # 通用弹窗
│   ├── ConfirmDialog.jsx  # 确认对话框
│   ├── EmptyState.jsx  # 空状态（prop: description 不是 desc）
│   ├── ErrorState.jsx  # 错误+重试
│   └── Toast.jsx       # Toast 通知（useToast）
└── pages/              # 24 个页面
```

## 路由 + 菜单

风格选材组（侧边栏「风格选材」）采用**三级菜单**：材料管理可展开为 7 个子品类。

| 路径 | 页面 | 菜单层级 |
|------|------|---------|
| `/dashboard` | Dashboard | 一级 |
| `/works` | Works | 一级 |
| `/avatar-reviews` | AvatarReviews | 一级 |
| `/designers` | Designers | 一级 |
| `/properties` | Properties | 一级 |
| `/material-categories` | MaterialCategories | 一级（装修选材组） |
| `/materials` | Materials | 一级（装修选材组） |
| `/material-orders` | MaterialOrders | 一级 |
| `/measurement-appointments` | MeasurementAppointments | 一级 |
| `/lottery` | LotteryConfig | 一级 |
| `/operation-data` | OperationData | 一级 |
| `/reports` | Reports | 一级 |
| `/categories` | Categories | 一级 |
| `/images` | Images | 一级 |
| `/settings` | Settings | 一级 |
| `/style-wizard/styles` | StyleWizardStyles | 二级 |
| `/style-wizard/categories` | StyleWizardCategories | 二级 |
| `/style-wizard/materials` | StyleWizardMaterials | **二级（可展开，不导航）** |
| `/style-wizard/materials/1` | StyleWizardMaterials | └ 三级·瓷砖选材（隐藏价格列+表单） |
| `/style-wizard/materials/2` | StyleWizardDoors | └ 三级·室内木门（门系列管理） |
| `/style-wizard/materials/3` | StyleWizardMaterials | └ 三级·卫浴选材 |
| `/style-wizard/materials/4` | StyleWizardMaterials | └ 三级·装饰定制 |
| `/style-wizard/materials/5` | StyleWizardMaterials | └ 三级·沙发选材 |
| `/style-wizard/materials/6` | StyleWizardMaterials | └ 三级·家具选材 |
| `/style-wizard/materials/7` | StyleWizardLighting | └ 三级·装饰灯具（灯具套餐） |
| `/style-wizard/orders` | StyleWizardOrders | 二级 |
| `/style-wizard/doors` | → `/style-wizard/materials/2` | 重定向（兼容旧路径） |
| `/style-wizard/lighting` | → `/style-wizard/materials/7` | 重定向（兼容旧路径） |
| `/accounts` | → `/designers` | 重定向 |

> **路由注册顺序**：`materials/2` 和 `materials/7` 必须在 `materials/:categoryId` 之前，否则被通配路由捕获。

## 新增页面检查清单

1. `router/index.jsx` — 注册路由（三级路由注意顺序：具体路径在动态 `:param` 前）
2. `Sidebar.jsx` — MENU_GROUPS 对应分组的 `items[]` 加一项；若为三级子项，在父项 `children[]` 中添加
3. `HeaderBar.jsx` — FULL_PATH_MAP 加路径→中文映射
4. `cd admin && npx vite build` — 验证构建

## 侧边栏三级子菜单

`MENU_GROUPS[].items[]` 支持 `children` 字段：

```js
{ path: '/style-wizard/materials', label: '材料管理', children: [
  { path: '/style-wizard/materials/1', label: '瓷砖选材' },
  // ...
]}
```

- 有 children 的项渲染为 `<button>`（toggle 展开/折叠），不导航
- 展开状态：`expandedSubmenus[item.path]`（初始值 + useEffect 自动展开当前激活路由的父级）
- 分组展开区 `max-h-[40rem]`（不用 `max-h-64`——含 children 展开后总高度远超 256px）
- Tier 3 子项：`pl-12`，12px 字体，无图标
- 子菜单父级按钮 icon-text 间距与 `renderItem`（Tier 2）一致，不加 `ml-2.5`

## 组件 API 契约

### Modal — **必须显式传 `open`**
| Prop | 类型 | 说明 |
|------|------|------|
| `open` | boolean | 控制显示 |
| `onClose` | () => void | 关闭（ESC/点击遮罩） |
| `title` | string | 标题 |
| `children` | ReactNode | 内容 |
| `footer` | ReactNode | 底部按钮 |
| `size` | 'sm'\|'md' | 宽度 |

### EmptyState — **prop 名是 `description`，不是 `desc`**
`icon`(emoji) / `title` / `description` / `action`(ReactNode) / `size`

### ErrorState
`message` / `onRetry`(点重试) / `size`

### ConfirmDialog
`open` / `onClose` / `onConfirm`(支持 async) / `title` / `message` / `confirmText` / `variant`('danger'\|'warning') / `loading`

### Toast — `useToast()` 返回 `{ success, error, info, warning, remove }`
默认 3 秒消失，右上角弹出。

## API 客户端

- `client.js`：baseURL=`/api/v1`，自动附 Bearer token + 解包 `.data`
- 401 → 清除 token 跳转 `/admin/login`
- 用法：`const res = await client.get('/admin/works', { params })` → `res.data.list`

## 页面模板

参照 `Works.jsx`：
```
<div className="p-4 lg:p-6 space-y-4">
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
    {/* 标题 + 操作按钮 + 筛选 */}
  </div>
  {error && <ErrorState message={error} onRetry={fetchList} />}
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    {loading ? spinner : empty ? <EmptyState /> : <table> + pagination}
  </div>
  {/* Modal / ConfirmDialog / 侧边面板 */}
</div>
```

## 设计 Token（TailwindCSS）

| 用途 | Class |
|------|-------|
| 页面外层 | `p-4 lg:p-6 space-y-4` |
| 卡片 | `bg-white rounded-xl shadow-sm border border-gray-100 p-4` |
| 主按钮 | `bg-slate-900 text-white hover:bg-slate-800` |
| 次按钮 | `bg-white border border-gray-300 text-gray-600 hover:bg-gray-50` |
| 危险按钮 | `bg-red-600 text-white hover:bg-red-700` |
| 输入框 | `px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent` |
| 表头 | `border-b border-gray-100 bg-gray-50/50` + `text-gray-500 font-medium text-xs` |
| 数据行 | `border-b border-gray-50 hover:bg-gray-50/50 transition-colors` |
| 状态标签 | `inline-flex px-2 py-0.5 rounded-full text-xs font-medium` |

**颜色**：主色 `slate-900`，成功 `green-*`，危险 `red-*`，信息 `blue-*`，警告 `orange-*`

## 状态颜色映射

| 状态 | Class |
|------|-------|
| draft | `bg-gray-100 text-gray-500` |
| pending | `bg-yellow-100 text-yellow-700` |
| approved / active | `bg-green-100 text-green-700` |
| rejected | `bg-red-100 text-red-600` |
| offline | `bg-orange-100 text-orange-700` |
| archived | `bg-slate-100 text-slate-500` |

## AuthContext

`useAuth()` 返回：`{ user, token, isAuthenticated, isLoading, login(username, password), logout() }`

## 组件陷阱

- Modal 必须显式传 `open`，否则不显示
- EmptyState prop 是 `description`，不是 `desc`
- React 中不用 `<text>`，用 `<span>`
- HeaderBar 面包屑有 FULL_PATH_MAP（全路径优先于段名映射），`/style-wizard/categories` ≠ `/categories`
