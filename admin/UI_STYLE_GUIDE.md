# 管理后台 UI 风格指南

> **基准页面**: `admin/src/pages/Works.jsx` — 所有新增管理后台页面必须以此页面为唯一 UI 参照。

---

## 1. 布局结构

```
┌──────────────────────────────────────────────┐
│  Sidebar       │  HeaderBar (面包屑 + 用户)    │
│  (深色侧栏)     ├──────────────────────────────┤
│                │                             │
│  仪表盘        │  ┌─ 白色卡片：标题+按钮+筛选 ─┐ │
│  作品管理       │  └──────────────────────────┘ │
│  ...           │                             │
│                │  ┌─ 白色卡片：数据表格 ──────┐ │
│                │  │  表头 (bg-gray-50/50)     │ │
│                │  │  数据行 (hover:bg-gray-50) │ │
│                │  │  分页                     │ │
│                │  └──────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 页面外层容器
```
className="p-4 lg:p-6 space-y-4"
```
**所有页面必须以此开头。** 缺少 `p-4 lg:p-6` 将导致内容紧贴左边界。

### 卡片容器
```
className="bg-white rounded-xl shadow-sm border border-gray-100"
```

---

## 2. 颜色系统

| 用途 | Tailwind Class |
|------|---------------|
| 页面背景 | `bg-gray-50` |
| 卡片/表格背景 | `bg-white` |
| 侧栏背景 | `bg-slate-900` |
| 表头背景 | `bg-gray-50/50` |
| 主操作按钮 | `bg-slate-900 text-white hover:bg-slate-800` |
| 次要按钮 | `bg-white border border-gray-300 text-gray-600 hover:bg-gray-50` |
| 信息按钮 | `bg-blue-600 text-white hover:bg-blue-700` |
| 成功按钮 | `bg-green-600 text-white hover:bg-green-700` |
| 危险按钮 | `bg-red-600 text-white hover:bg-red-700` / `bg-red-500` |
| 卡片边框 | `border-gray-100` |
| 输入框边框 | `border-gray-300` |
| 行分隔线 | `border-gray-50` 或 `border-gray-100` |
| 主文字 | `text-gray-900` |
| 次文字 | `text-gray-500` / `text-gray-600` |
| 弱文字 | `text-gray-400` |

**重要：主操作按钮使用 `slate-900`（深灰黑），不是 `blue-600`（蓝色）。** Works.jsx 的"添加"按钮和 Designers.jsx 的"添加设计师"按钮均使用 `bg-slate-900`。

---

## 3. 组件 API 速查

### Modal
```jsx
import Modal from '../components/Modal';
<Modal open={isOpen} onClose={closeFn} title="标题" size="sm|md">
  <form>...</form>
</Modal>
```
- **`open` 是必传的！** 忘记传 `open` 会导致弹窗永不显示。
- `size`: `"sm"` = max-w-sm, `"md"`(默认) = max-w-lg

### ConfirmDialog
```jsx
import ConfirmDialog from '../components/ConfirmDialog';
<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
  title="确认操作"
  message="确定要执行此操作吗？"
  variant="danger|warning|default"
  confirmText="按钮文字"
  loading={isSubmitting}
/>
```

### EmptyState
```jsx
import EmptyState from '../components/EmptyState';
<EmptyState
  icon="📋"           // emoji
  title="暂无数据"
  description="描述"   // 注意：是 description，不是 desc！
  size="sm|md"
  action={optionalButton}
/>
```

### ErrorState
```jsx
import ErrorState from '../components/ErrorState';
<ErrorState message="加载失败" onRetry={retryFn} size="sm|md" />
```

---

## 4. 表格规范

```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          {headers.map(h => (
            <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
            <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
            <td className="px-4 py-3 text-gray-500">{item.detail}</td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end space-x-1">
                <button className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                <button className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

### 关键规则
- **表头 `<th>` 数量必须等于数据行 `<td>` 数量**，否则列错位
- `colSpan` 必须等于表头列数
- 操作列使用 `text-right` + `justify-end`
- 加载态和空态使用正确的 `colSpan` 值

---

## 5. 输入控件

```jsx
// 文本输入
<input className="px-3 py-2 border border-gray-300 rounded-lg text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />

// 下拉选择
<select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
  focus:outline-none focus:ring-2 focus:ring-blue-500" />

// 搜索框（带图标）
<div className="relative flex-1 min-w-[200px] max-w-xs">
  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" ... />
  <input className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
</div>
```

---

## 6. 分页

```jsx
<div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
  <span>共 {total} 条</span>
  <div className="flex items-center space-x-1">
    <button disabled={page <= 1}
      className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50
        disabled:opacity-30 disabled:cursor-not-allowed transition-colors">上一页</button>
    <span className="px-3 py-1 text-xs text-gray-600">{page}/{totalPages}</span>
    <button disabled={page >= totalPages}
      className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50
        disabled:opacity-30 disabled:cursor-not-allowed transition-colors">下一页</button>
  </div>
</div>
```

---

## 7. 新增页面检查清单

新增一个管理后台页面时，必须完成以下所有步骤：

- [ ] `admin/src/pages/NewPage.jsx` — 创建页面，以 Works.jsx 为模板
- [ ] `admin/src/router/index.jsx` — 添加路由 `<Route path="/new-page" element={<NewPage />} />`
- [ ] `admin/src/components/Sidebar.jsx` — `MENU_ITEMS` 数组添加菜单项
- [ ] `admin/src/components/HeaderBar.jsx` — `BREADCRUMB_MAP` 添加 `'new-page': '页面中文名'`
- [ ] 页面外层使用 `p-4 lg:p-6 space-y-4`
- [ ] 所有 Modal 使用都传了 `open` prop
- [ ] EmptyState 使用 `description` 而非 `desc`
- [ ] 表格表头列数 = 数据列数，colSpan 正确
- [ ] `cd admin && npx vite build` 构建通过

---

## 8. 常见反模式（禁止）

| 反模式 | 正确做法 |
|--------|---------|
| `<Modal title="X" onClose={fn}>` （缺 open） | `<Modal open={modalOpen} title="X" onClose={fn}>` |
| `<EmptyState desc="...">` | `<EmptyState description="...">` |
| `<text>文字</text>` | `<span>文字</span>` |
| `className="space-y-5"` 无 padding | `className="p-4 lg:p-6 space-y-4"` |
| 筛选栏裸 `<div>` 无卡片包裹 | 用 `bg-white rounded-xl shadow-sm border border-gray-100 p-4` 包裹 |
| 表头 `<th>` 使用 `font-medium` 不用 `text-xs` | 使用 `text-gray-500 font-medium text-xs` |
| 主按钮用 `bg-blue-600` | 使用 `bg-slate-900` |
| 表格外框 `border-slate-200` | 使用 `border-gray-100` |
