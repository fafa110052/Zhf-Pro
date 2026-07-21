# 小程序速查 (miniprogram)

微信原生框架，5 tab：首页 → 作品 → 在线选材 → 风格选材 → 我的。
AppID：`wx45a2339808c171aa`，导航栏 `#1e293b` 白字。

```
miniprogram/
├── app.js / app.json / app.wxss
├── env.js              # 切换环境只改这个文件
├── pages/              # 30 页面
├── components/         # swiper-banner, work-card, empty-state, loading-more, accordion-card, progress-steps, image-lightbox
└── utils/
    ├── constants.js    # BASE_URL（读 env.js）+ 状态映射
    ├── request.js      # HTTP（auth/silent/loading 三种模式）
    ├── api.js          # 所有 API 函数（已解包 data，不要 .data）
    └── util.js         # fullImageUrl, formatTime, formatNumber
```

## onReady 防闪烁模式

navigateTo 跳转的页面必须用，否则先闪空白再出内容：

```js
Page({
  data: { ready: false },
  onReady() {
    this._readyFired = true;
    if (this._pageData) { this.setData({ ready: true, ...this._pageData }); }
  },
  async loadData() {
    const pageData = { /* ... */ };
    if (this._readyFired) this.setData({ ready: true, ...pageData });
    else this._pageData = pageData;
  },
});
```

WXML：`<block wx:if="{{ready}}">` 包裹全部内容。

## API 速查

| 分类 | 函数 | 路径 |
|------|------|------|
| 公开 | `getWorks`, `getHotWorks`, `getWorkDetail` | `/works` |
| 首页 | `getHomepageConfig` | `/homepage/config` |
| 认证 | `designerLogin`, `wechatPhoneLogin`, `checkLogin`, `cancelAccount` | `/auth/*` |
| 设计师 | `getMyWorks`, `createWork`, `updateWork`, `deleteWork`, `submitWork` | `/designer/works*` |
| 上传 | `uploadImage`, `uploadImages` | `/upload` |
| 选材 | `getProperties`, `getPropertyMaterials`, `submitMaterialOrder` | `/properties*` |
| 施工 | `getOrderPhases`, `getPhaseDetail`, `acceptPhase`, `disputePhase` 等 | `/construction-phases*` |
| 风格选材 | `getStyles`, `getStyleCategories`, `getStyleMaterials`, `getDoorSeries`, `saveDraft`, `submitStyleOrder` | `/styles*` |

## 常见陷阱

- **`wx:else` 不能与 `wx:for` 同元素** → 改用 `wx:if="{{!condition}}"`
- **dataset 值永远是字符串** → `Number()` 转换后再 `===` 比较
- **组件 tap 事件双触发** → 自定义 `triggerEvent('tap')` 与原生 tap 同名，组件用 `catchtap`
- **switchTab 不能传参** → 用 `app.globalData` 做一次性消息总线
- **丰富 play 登录态 401** → `silent: true` 模式不清登
- **小程序 require() 不能引用 miniprogram 目录外**

## 角色判断

| 方法 | 条件 |
|------|------|
| `app.isDesigner()` | `role === 'designer'` — 所有员工 |
| `app.isDesignerPersonnel()` | `personnel_type === 'designer'` — 仅设计师 |
| `app.isOwner()` | `role === 'owner'` |
| `app.isGuest()` | `role === 'guest'` |

登录路由：`owner` 最先判断。
