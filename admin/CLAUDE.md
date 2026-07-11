# 管理后台速查 (admin)

## 技术栈

React 19 + TailwindCSS 4 + Vite 8 + React Router 7，基础路径 `/admin/`，Vite 代理 `/api` 到 `localhost:3000`。

```
admin/src/
├── main.jsx            # 入口
├── App.jsx             # AuthProvider + RouterProvider
├── index.css           # Tailwind, PingFang SC 字体
├── api/client.js       # Axios 实例（baseURL=/api/v1, Bearer 拦截器, 自动解包 .data）
├── router/index.jsx    # 20 条路由
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
└── pages/              # 18 个页面
```

## 路由 + 菜单（MENU_ITEMS）

| 路径 | 页面 | 菜单名 | 菜单图标 |
|------|------|--------|---------|
| `/dashboard` | Dashboard | 仪表盘 | 房子 |
| `/works` | Works | 作品管理 | 文档 |
| `/avatar-reviews` | AvatarReviews | 头像审核 | 用户 |
| `/designers` | Designers | 人员管理 | 人群 |
| `/properties` | Properties | 楼盘管理 | 建筑 |
| `/material-categories` | MaterialCategories | 材料分类 | 标签 |
| `/materials` | Materials | 材料管理 | 立方体 |
| `/material-orders` | MaterialOrders | 工程管理 | 对勾 |
| `/measurement-appointments` | MeasurementAppointments | 量房预约 | 日历 |
| `/lottery` | LotteryConfig | 摇一摇抽奖 | 礼物 |
| `/operation-data` | OperationData | 运营数据 | 图表 |
| `/reports` | Reports | 举报管理 | 旗帜 |
| `/categories` | Categories | 分类字典 | 标签 |
| `/images` | Images | 图片库 | 图片 |
| `/settings` | Settings | 系统设置 | 齿轮 |
| `/accounts` | 重定向到 /designers | — | — |

## 新增页面检查清单

1. `router/index.jsx` — 注册路由
2. `Sidebar.jsx` — MENU_ITEMS 加一项
3. `HeaderBar.jsx` — BREADCRUMB_MAP 加标题
4. `cd admin && npx vite build` — 验证构建

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
