# 作品详情页 VR 看房按钮（酷家乐内嵌）设计

日期：2026-07-15
状态：已与用户对齐待审阅

## 背景与目标

C端用户在小程序作品详情页能一键查看该作品的酷家乐 VR 全景，全程不离开小程序。
链接由设计师或运营录入；没有 VR 链接的作品页面无任何变化。

前置验证（已完成）：
- 酷家乐 VR 页无 X-Frame-Options / CSP 防内嵌限制，iframe 实测可正常渲染漫游；
- wzzhfservice.cloud HTTPS 正常，符合微信业务域名要求；
- web-view 无法直接打开第三方域名（业务域名需上传校验文件），故采用自有域名中转页方案。

## 整体架构

```
设计师(小程序上传/编辑作品，可选填) ─┐
                                   ├→ cases.vr_url ─→ GET /works/:id (cases.* 自动带出)
管理后台(作品详情面板随时改/清空) ──┘         │
                                             ↓
              作品详情页 wx:if{{vr_url}} 显示右下角胶囊悬浮按钮
                                             ↓ 点击
              小程序内页 pages/vr-view (web-view)
                 src = https://wzzhfservice.cloud/vr.html?u=<encodeURIComponent(vr_url)>
                                             ↓
              中转页 JS 校验域名白名单 → iframe 全屏加载酷家乐 VR
```

## 决策记录

| 决策点 | 结论 |
|-------|------|
| 打开方式 | web-view + 自有域名中转页（不跳酷家乐小程序、不出小程序） |
| 链接录入 | 两端：设计师端随作品编辑（仅草稿/驳回可改，随审核流）；管理后台任意状态可改，不触发重新审核 |
| 按钮显示条件 | 仅 `vr_url` 非空时显示 |
| 按钮形态 | 胶囊：VR 眼镜图标 + "VR看房"文字（用户已选） |
| 按钮配色 | 电光紫渐变 `linear-gradient(135deg,#8B5CF6,#6366F1)`，白色图标文字（用户已选） |
| 域名白名单 | 仅 `kujiale.com` 及其子域（`hostname === 'kujiale.com' || endsWith('.kujiale.com')`），且必须 https |

## 各端改动

### 1. 数据库（server）

- 新增 migration：`cases` 表加 `vr_url` TEXT 可空字段。
- 详情查询 `getById` / `getByIdAdmin` 均为 `cases.*`，无需改查询即可返回该字段；列表查询不返回（不需要）。

### 2. 服务端（server）

- **校验工具**：`isKujialeUrl(url)` — https 且域名在白名单；`caseService.create` / `update` 的 allowed 字段加入 `vr_url`，非法值报 400「请填写酷家乐链接」。
- **管理端接口**：`PATCH /api/v1/admin/works/:id/vr-url`（admin 权限），body `{ vr_url }`；传空字符串/null 即清空；同样走白名单校验；不改动 review_status。
- **中转页**：静态 `vr.html` 部署到 wzzhfservice.cloud（与现有静态资源同一 nginx/Express 静态目录，随 deploy.sh 发布）。页面逻辑：解析 `?u=` → decode → 白名单校验 → 通过则创建全屏 iframe（含 loading 态），不通过显示「链接无效」提示。无任何第三方依赖。

### 3. 管理后台（admin）

- `Works.jsx` 的 DetailPanel 信息区新增「VR 链接」块：输入框 + 保存/清空按钮，显示当前值；保存调上述 PATCH 接口，成功后局部刷新。样式沿用面板现有输入风格。

### 4. 小程序（miniprogram）

- **作品详情页** `pages/work-detail`：
  - 新增悬浮按钮：`position: fixed; right: 32rpx; bottom: calc(64rpx + env(safe-area-inset-bottom));`，不随滚动移动；
  - 胶囊尺寸约 88rpx 高，内容为 VR 眼镜图标（白色 SVG base64 内联 wxss，护目镜+双镜片+鼻托造型）+「VR看房」白色粗体；
  - 电光紫渐变底 + 外圈 2s 呼吸光晕动画（transform/opacity 动画，低功耗）；
  - `catchtap` 跳转 `/pages/vr-view/index?u=<encoded>`（沿用项目 catchtap 防双触发惯例）。
- **新页面** `pages/vr-view`：仅一个 `<web-view>`，src 拼中转页地址；导航标题「VR全景看房」；无参数时 toast 并返回。
- **作品上传/编辑页** `pages/work-upload`：表单加「VR 链接（选填）」输入项，提示"粘贴酷家乐分享链接"；提交时随其余字段一起走现有 create/update 接口。

### 5. 平台配置（已完成 ✅）

- 业务域名 `wzzhfservice.cloud` 用户已于 2026-07-15 前在小程序后台添加完成，无需再操作。
- 改动小程序代码后按惯例走微信开发者工具上传发布。

## 错误处理

| 场景 | 行为 |
|------|------|
| 录入非酷家乐链接 | 后端 400，提示「请填写酷家乐链接（kujiale.com）」，两端表单展示错误 |
| vr-view 缺参数 | toast「链接无效」并返回上一页 |
| 中转页参数非白名单 | 页面显示「链接无效」，不加载 iframe |
| 酷家乐页面加载慢 | 中转页显示 loading 态直至 iframe onload |
| 业务域名未配置 | web-view 报「不支持打开非业务域名」→ 属配置缺失，上线前置检查项 |

## 验证方案

1. 服务端：curl 验证 PATCH 接口的合法/非法链接、清空、权限（非 admin 401/403）；create/update 带 vr_url 的读写回归。
2. 中转页：浏览器直开 `vr.html?u=<酷家乐链接>` 可漫游；换非白名单链接显示错误。
3. 管理后台：面板保存/清空链接，刷新后详情正确回显。
4. 小程序（真机预览）：有链接作品出现按钮且滚动不动位；点击进入 web-view 可漫游；无链接作品无按钮；上传表单填错误链接有提示。

## 范围外（明确不做）

- 不做 VR 链接的批量导入；不做按钮曝光/点击埋点；不改列表页与其他页面；不做酷家乐开放平台 API 对接。
