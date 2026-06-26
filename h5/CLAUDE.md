# H5 移动端速查 (h5)

## 技术栈

React 19 + TailwindCSS 4 + Vite 8 + React Router 7 + Swiper 12，纯 JSX 无 TypeScript。

```
h5/src/
├── main.jsx              # 入口
├── App.jsx               # AuthProvider → ToastProvider → ZoomProvider → RouterProvider
├── index.css             # Tailwind + PingFang SC + 安全区 + 隐藏滚动条
├── api/
│   ├── client.js         # Axios 实例（baseURL=/api/v1, h5_token, 自动解包）
│   ├── auth.js           # loginByPhone
│   ├── works.js          # getHomepageConfig/getHotWorks/getWorks/getWorkDetail/getCategories
│   └── designer.js       # getMyWorks/getMyWorkDetail/createWork/updateWork/deleteWork/submitWork/uploadImage
├── router/index.jsx      # 7 条路由
├── contexts/AuthContext.jsx  # 认证上下文
├── hooks/useInfiniteScroll.js
├── components/
│   ├── Layout.jsx        # 底部 3 tab + Outlet
│   ├── AuthGuard.jsx     # requireRole 路由守卫
│   ├── SwiperBanner.jsx  # 首页轮播
│   ├── CategoryTabs.jsx  # 户型/部位/风格三按钮
│   ├── FilterBar.jsx     # 标签+排序
│   ├── WorkCard.jsx      # 作品缩略图卡片
│   ├── ImageSwiper.jsx   # 图片轮播+全屏灯箱（pinch zoom+双击）
│   ├── WorkInfo.jsx      # 作品元数据面板
│   ├── DesignerCard.jsx  # 设计师名片
│   ├── EmptyState.jsx    # 空状态
│   ├── ErrorState.jsx    # 错误+重试
│   ├── Toast.jsx         # Toast 通知（useToast）
│   └── ZoomProvider.jsx  # 缩放上下文
└── pages/
    ├── Home.jsx          # 首页：轮播+搜索+分类卡片+热门推荐
    ├── Category.jsx      # 作品浏览：标签云+排序+无限滚动
    ├── WorkDetail.jsx    # 作品详情：轮播+信息+设计师名片
    ├── Login.jsx         # 登录：手机号表单
    ├── Mine.jsx          # 我的：角色区分展示
    ├── WorkManage.jsx    # 作品管理：标签筛选+CRUD（AuthGuard:designer）
    └── WorkUpload.jsx    # 作品上传/编辑：图片+表单（AuthGuard:designer）
```

## 路由

| 路径 | 页面 | 守卫 |
|------|------|------|
| `/` | Home | 无 |
| `/category` | Category | 无 |
| `/work/:id` | WorkDetail | 无 |
| `/login` | Login | 无 |
| `/mine` | Mine | 无 |
| `/work-manage` | WorkManage | `AuthGuard requireRole="designer"` |
| `/work-upload` | WorkUpload | `AuthGuard requireRole="designer"` |
| `/work-upload/:id` | WorkUpload | `AuthGuard requireRole="designer"` |

所有路由嵌套在 `<Layout />` 内（底部 3 tab：首页、分类、我的）。

## AuthContext

`useAuth()` 返回：`{ user, token, role, loading, isLoggedIn, isDesigner, isGuest, isOwner, login(phone), logout(), refreshUser() }`

存储：`localStorage` 的 `h5_token` + `h5_user`。登录走 `/auth/designer/login/dev`。

## AuthGuard

声明式路由守卫：`<AuthGuard requireRole="designer"><WorkManage /></AuthGuard>`。未登录→跳 `/login`，角色不对→跳 `/mine`。

## API 客户端

- baseURL=`/api/v1`，timeout=15s
- 请求拦截器：附 `h5_token` 为 Bearer token
- 响应拦截器：解包 `.data`，401 清 token 并 reject `{ message, status }`
- API 函数在 `.then(r => r.data)` 处解包一次

## 设计模式

- **移动优先**：`max-w-lg` 限制宽度，`h-dvh` 动态视口，`pb-safe`/`pt-safe` 安全区
- **Tailwind 优先**：无 CSS 模块，所有样式内联 Tailwind 类
- **无 TS**：所有文件 `.jsx` / `.js`
- **无状态管理库**：三个 Context（Auth、Toast、Zoom）管理全局状态
- **无限滚动**：`useInfiniteScroll(callback, { hasMore, loading })` 返回哨兵 ref
- **URL 作状态**：Category 页把搜索/排序/标签持久化到 URL query
- **图片上传**：`uploadImage(file, workName)` 可传作品名称用于图片库命名

## 组件要点

- **ImageSwiper**：Swiper 轮播（4:3）+ 全屏灯箱 + 双指缩放 + 双击 1x/1.5x（CSS zoom 属性）
- **WorkCard**：`active:scale-[0.98]` 点击反馈
- **Layout**：底部 3 tab（首页、分类、我的），`max-w-lg` 居中

## 开发

```bash
cd h5 && npm run dev   # 端口 5174，代理 /api→localhost:3000
```
