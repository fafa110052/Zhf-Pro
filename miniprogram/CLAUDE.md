# 小程序速查 (miniprogram)

## 技术栈

微信原生框架，5 tab：首页 → 作品 → 在线选材 → 风格选材 → 我的

```
miniprogram/
├── app.js              # 全局状态 + 角色判断 + onLaunch
├── app.json            # 页面注册 + tabBar + 窗口配置 + navigateToMiniProgramAppIdList
├── app.wxss            # 全局样式
├── env.js              # BASE_URL（切换环境只改这个文件）
├── pages/              # 30 个页面
├── components/         # 7 个可用组件（swiper-banner/work-card/empty-state/loading-more/accordion-card/progress-steps/image-lightbox）
├── utils/
│   ├── constants.js    # BASE_URL + API 前缀 + 状态映射 + TEMPLATE_IDS
│   ├── request.js      # HTTP 封装（auth/silent/loading）
│   ├── api.js          # 所有 API 函数
│   └── util.js         # fullImageUrl/formatTime/formatNumber 等
└── images/             # tabBar 图标
```

## Tab Bar（5 tab）

| 首页 | 作品 | 在线选材 | 风格选材 | 我的 |
|------|------|---------|---------|------|
| `pages/index/index` | `pages/category/index` | `pages/material-properties/index` | `pages/style-select/index` | `pages/mine/index` |

导航栏：`#1e293b` 背景，白字，标题"住好房装修"。

## 全局状态（app.js）

```js
globalData: {
  userInfo,      // { id, name, phone, avatar_url, role, personnel_type, ... }
  token,         // JWT
  role,          // 'admin'|'designer'|'owner'|'guest'
  baseUrl,       // 从 constants.js 读取
  personnelType, // 'designer'|'design_director'|'engineer'|'engineering_director'
  isOnline,      // 网络状态
}
```

## 角色判断（两个维度，必须区分）

| 方法 | 判断条件 | 含义 |
|------|---------|------|
| `app.isDesigner()` | `role === 'designer'` | **所有员工**（含设计师/总监/工程师） |
| `app.isDesignerPersonnel()` | `personnel_type === 'designer'` | 仅设计师岗位 |
| `app.isOwner()` | `role === 'owner'` | 业主 |
| `app.isGuest()` | `role === 'guest'` | 游客 |
| `app.isDesignDirector()` | `personnel_type === 'design_director'` | 设计总监 |
| `app.isEngineer()` | `personnel_type === 'engineer'` | 工程师 |
| `app.isEngineeringDirector()` | `personnel_type === 'engineering_director'` | 工程总监 |

⚠️ 这些方法读的是 `globalData.userInfo.personnel_type`，**任何覆盖 `app.globalData.userInfo` 的地方都必须保留 `personnel_type` 字段**。

## onReady 防闪烁模式（navigateTo 的页面必须用）

```js
Page({
  data: { ready: false, loading: true, error: false },
  onLoad(options) { this.loadData(); },
  onReady() {
    this._readyFired = true;
    if (this._pageData) { this.setData(Object.assign({ ready: true }, this._pageData)); this._pageData = null; }
  },
  async loadData() {
    this.setData({ loading: true, error: false, ready: false });
    try {
      const result = await api.xxx();
      const pageData = { /* data */, loading: false };
      if (this._readyFired) this.setData(Object.assign({ ready: true }, pageData));
      else this._pageData = pageData;
    } catch (err) { this.setData({ loading: false, error: true, ready: true }); }
  },
});
```

WXML：`<block wx:if="{{ready}}">` 包裹所有内容。ready 前只显示背景色。

## request.js

### silent 模式
`http.get(url, data, { auth: true, silent: true })` — 不弹 toast、401 不触发 clearLogin。用于 mine 页面 refreshState 等后台刷新场景。

### 参数
`url` / `method` / `data` / `auth`(boolean) / `loading`(boolean) / `silent`(boolean)

URL = `BASE_URL + API_PREFIX + url`（如 `http://test.wzzhfservice.cloud/api/v1/works`）

### 错误码处理
- 401 → `app.clearLogin()`（silent 模式跳过）
- 403/404/500 → 弹 toast
- 网络错误 → "网络异常"

## 竞态防范

`app.js` onLaunch 中 checkLogin：保存 `tokenAtCheck` → 异步校验 → 结果返回时比对 `globalData.token === tokenAtCheck`，不匹配则不清登。防止旧校验结果清掉新登录。

## 环境配置

- `constants.js` 读取 `../env.js`（优先 `../env.local.js`）
- ⚠️ 小程序 `require()` **不能引用 miniprogram 目录外**的文件
- BASE_URL 只有一处定义：`constants.js`
- 改 IP/端口 → 改 `env.js`
- 不在代码中写 IP 地址

## API 速查（utils/api.js）

| 分类 | 函数 | 路径 |
|------|------|------|
| 公开作品 | `getWorks` / `getHotWorks` / `getWorkDetail` | `/works` |
| 首页 | `getHomepageConfig` | `/homepage/config` |
| 分类 | `getCategories` | `/categories` |
| 认证 | `designerLogin` / `wechatPhoneLogin` / `getDesignerProfile` / `checkLogin` / `cancelAccount` | `/auth/*` |
| 设计师 | `getMyWorks` / `createWork` / `updateWork` / `deleteWork` / `submitWork` / `getMyStats` | `/designer/works*` |
| 上传 | `uploadImage` / `uploadImages` | `/upload` |
| 选材 | `getProperties` / `getPropertyMaterials` / `submitMaterialOrder` / `getMyMaterialOrders` / `getOwnerCheck` | `/properties*` `/material-orders*` |
| 施工 | `getOrderPhases` / `getPhaseDetail` / `getDesignerPhases` / `uploadDesignImages` / `approveDesignDirector` / `getEngineerPhases` / `uploadConstructionImages` / `acceptPhase` / `disputePhase` 等 | `/construction-phases*` |
| 风格选材 | `getStyles` / `getStyleCategories` / `getStyleMaterials` / `getDoorSeries` / `getDoorMaterials` / `getLightingPackages` / `saveDraft` / `getDraft` / `submitStyleOrder` / `getMyStyleOrders` | `/styles*` `/style-categories` `/door-*` `/lighting-packages` `/drafts` `/orders` |

## 状态映射（constants.js）

- **WORK_STATUS_MAP**：draft/pending/approved/rejected/offline/archived
- **ORDER_STATUS_MAP**：pending/approved/rejected/completed/accepted/disputed
- **PHASE_TYPE_MAP**：demolition/water_electric/painting/material_install/completion（打拆→水电→油工→主材→竣工）
- **PHASE_STATUS_MAP**：23 种状态（从 unassigned 到 locked）

## 工具函数（util.js）

- `fullImageUrl(url)` — 相对路径转绝对 URL（通过 baseUrl）
- `formatTime(date, format)` — 日期/相对时间
- `formatNumber(num)` — 万/千缩写
- `showConfirm(message, title)` — 返回 Promise
- `formatArea` / `formatBudget`

## VR 看房

作品详情页右下角悬浮按钮，调起全景720小程序打开酷家乐VR全景：

```js
// work-detail/index.js
onTapVR() {
  const vrUrl = this.data.work && this.data.work.vr_url;
  if (!vrUrl) return;
  wx.navigateToMiniProgram({
    appId: 'wxc2d8d319dfc12a95',  // 全景720
    path: 'pages/design-detail/pano/pano?url=' + encodeURIComponent(vrUrl),
    envVersion: 'release',
    fail() { wx.showToast({ title: '打开失败，请稍后重试', icon: 'none' }); },
  });
},
```

- 按钮仅 `vr_url` 有值时显示（`wx:if="{{ready && work.vr_url}}"`）
- 上传表单 `work-upload` 支持输入 vr_url，正则校验酷家乐域名
- ⚠️ web-view + iframe 中转方案不可行（微信拦截 iframe 内小程序跳转）

## 常见陷阱

- switchTab 不能传参 → 用 `app.globalData` 做一次性消息总线
- 登录路由优先级：`role === 'owner'` 最先判断
- 设计师中心 `loadProfile()` 必须包含 `personnel_type` 并设置 `app.globalData.personnelType`
- `api.js` 函数返回已解包 payload（request.js 剥离 `{success,data}` envelope），不要再访问 `.data`
- 卫生间门/沙发子品类按名称子串驱动锁向/贵妃交互，后台不可改名
