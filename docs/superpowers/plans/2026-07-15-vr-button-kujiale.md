# 作品详情页 VR 看房按钮（酷家乐内嵌）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 作品填了酷家乐 VR 链接后，小程序详情页右下角出现固定悬浮按钮，点击在小程序内（web-view + 自有域名中转页）打开酷家乐 VR 漫游。

**Architecture:** `cases` 表加 `vr_url` 字段；设计师端随作品编辑录入（走审核流），管理后台任意状态可改（PATCH 专用接口）；C端详情接口 `cases.*` 自动带出该字段；小程序按钮 → `pages/vr-view`（web-view）→ `https://wzzhfservice.cloud/vr.html?u=<encoded>` 中转页 → JS 白名单校验后 iframe 加载酷家乐。

**Tech Stack:** Express 5 + Knex/SQLite（迁移在 `server/src/db/migrations/`）、React 19（admin）、微信小程序原生。无新增依赖。

**Spec:** `docs/superpowers/specs/2026-07-15-vr-button-kujiale-design.md`

## Global Constraints

- 域名白名单统一为：协议必须 `https:`，hostname 等于 `kujiale.com` 或以 `.kujiale.com` 结尾（服务端、中转页、小程序表单三处口径一致）。
- 服务端校验失败错误文案统一：`请填写有效的酷家乐链接（kujiale.com）`，HTTP 400。
- `vr_url` 空字符串/null 一律归一为 `null`（= 清空，小程序不显示按钮）。
- 本仓库无 jest 单测，验证遵循仓库惯例：curl 冒烟 + 浏览器/开发者工具人工验证。本地服务端口默认 3000（以 `npm run dev` 启动日志为准）。管理员测试账号：`admin` / `admin123`（seed）。
- 小程序惯例：按钮用 `catchtap`（防同名双触发）；页面渲染走 `ready` 门控。
- 每个任务完成即 commit；任何提交前确认不含密钥。
- 遵循 CLAUDE.md「Surgical Changes」：只动本计划列出的行，不顺手改无关代码。

---

### Task 1: 数据库迁移 — cases.vr_url

**Files:**
- Create: `server/src/db/migrations/013_add_case_vr_url.js`

**Interfaces:**
- Produces: `cases.vr_url` TEXT 可空列。后续任务通过 `cases.*` 查询自动读到；`caseService` 直接写入。

- [ ] **Step 1: 写迁移文件**

```js
/**
 * 013 — 作品表增加酷家乐 VR 链接
 * vr_url 非空时，小程序作品详情页显示"VR看房"悬浮按钮
 */
exports.up = function (knex) {
  return knex.schema.alterTable('cases', (table) => {
    table.text('vr_url').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('cases', (table) => {
    table.dropColumn('vr_url');
  });
};
```

- [ ] **Step 2: 执行迁移**

Run: `cd server && npm run migrate`
Expected: `Batch N run: 1 migrations`（013 被执行）

- [ ] **Step 3: 验证列存在**

Run: `sqlite3 server/data/database.sqlite "PRAGMA table_info(cases);" | grep vr_url`
Expected: 输出一行含 `vr_url|TEXT`

- [ ] **Step 4: Commit**

```bash
git add server/src/db/migrations/013_add_case_vr_url.js
git commit -m "feat(server): cases表新增vr_url字段迁移"
```

---

### Task 2: 服务端 — 链接校验 + 设计师读写 + 管理端接口

**Files:**
- Modify: `server/src/services/caseService.js`（helper 区、`create` ~L335、`update` ~L394-414、新增 `setVrUrl`）
- Modify: `server/src/routes/cases.js`（在 `PATCH /admin/works/:id/hot` 之后 ~L322 加新路由）

**Interfaces:**
- Consumes: Task 1 的 `cases.vr_url` 列。
- Produces:
  - `normalizeVrUrl(url)`（caseService 模块内函数）：`undefined→undefined`（不更新）、空/null→`null`（清空）、合法酷家乐 https 链接→trim 后原串、其他→throw 400。
  - `caseService.setVrUrl(workId: number, vrUrl: string|null) → Promise<work行>`。
  - HTTP：`PATCH /api/v1/admin/works/:id/vr-url`，Body `{ vr_url }`，admin 权限，响应 `{ success: true, data: work }`。
  - `POST /designer/works` 与 `PUT /designer/works/:id` 的 body 新增可选 `vr_url`（空串=清空）。

- [ ] **Step 1: caseService 加校验 helper**

在 `caseService.js` 中现有 helper（如 `normalizeCoverImage`）附近加：

```js
/**
 * 校验酷家乐 VR 链接
 * undefined → undefined（不更新）；null/空串 → null（清空）
 * 合法：https + 域名为 kujiale.com 或其子域；否则抛 400
 */
function normalizeVrUrl(url) {
  if (url === undefined) return undefined;
  if (url === null || String(url).trim() === '') return null;
  const trimmed = String(url).trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (e) {
    throw Object.assign(new Error('请填写有效的酷家乐链接（kujiale.com）'), { status: 400 });
  }
  const host = parsed.hostname.toLowerCase();
  const ok = parsed.protocol === 'https:' && (host === 'kujiale.com' || host.endsWith('.kujiale.com'));
  if (!ok) {
    throw Object.assign(new Error('请填写有效的酷家乐链接（kujiale.com）'), { status: 400 });
  }
  return trimmed;
}
```

- [ ] **Step 2: create/update 支持 vr_url**

`create()`（~L335）：解构加 `vr_url`，insert 对象加一行：

```js
const { title, description, house_type_id, area_category_id, style_category_id,
        area_sqm, budget_min, budget_max, completion_date, cover_image, images, vr_url } = data;
```

insert 对象（`review_status: 'draft'` 上方）加：

```js
      vr_url: normalizeVrUrl(vr_url) || null,
```

`update()`（~L406）：allowed 数组加 `'vr_url'`，赋值行改为：

```js
    const allowed = ['title', 'description', 'house_type_id', 'area_category_id',
                     'style_category_id', 'area_sqm', 'budget_min', 'budget_max',
                     'completion_date', 'cover_image', 'vr_url'];
    const updates = {};
    for (const key of allowed) {
      if (data[key] !== undefined) {
        if (key === 'cover_image') {
          updates[key] = normalizeCoverImage(data[key]);
        } else if (key === 'vr_url') {
          updates[key] = normalizeVrUrl(data[key]);
        } else {
          updates[key] = data[key];
        }
      }
    }
```

- [ ] **Step 3: caseService 加 setVrUrl（放在 toggleHot 附近的管理端区块）**

```js
  /** 管理端设置/清空 VR 链接（任意状态可改，不影响审核状态） */
  async setVrUrl(workId, vrUrl) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    await db('cases').where('id', workId).update({
      vr_url: normalizeVrUrl(vrUrl) || null,
      updated_at: db.fn.now(),
    });
    return db('cases').where('id', workId).first();
  },
```

- [ ] **Step 4: routes/cases.js 加管理端路由**（`PATCH /admin/works/:id/hot` 之后）

```js
/**
 * PATCH /api/v1/admin/works/:id/vr-url
 * 设置/清空作品的酷家乐 VR 链接（任意状态可改，不触发重新审核）
 *
 * Body: { vr_url } — 空字符串或 null 即清空
 */
router.patch('/admin/works/:id/vr-url', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const work = await caseService.setVrUrl(Number(req.params.id), req.body.vr_url);
    res.json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 5: curl 冒烟验证**

启动：`cd server && npm run dev`（另一个终端跑 curl）

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

# ① 合法链接 → 200，data.vr_url 为该链接
curl -s -X PATCH http://localhost:3000/api/v1/admin/works/1/vr-url \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"vr_url":"https://www.kujiale.com/cloud/design/3FO3DXSFRQ94/airoaming"}'

# ② 非法域名 → 400 "请填写有效的酷家乐链接（kujiale.com）"
curl -s -X PATCH http://localhost:3000/api/v1/admin/works/1/vr-url \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"vr_url":"https://evil.com/x"}'

# ③ http 协议 → 400
curl -s -X PATCH http://localhost:3000/api/v1/admin/works/1/vr-url \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"vr_url":"http://www.kujiale.com/x"}'

# ④ 伪装域名 evilkujiale.com → 400
curl -s -X PATCH http://localhost:3000/api/v1/admin/works/1/vr-url \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"vr_url":"https://evilkujiale.com/x"}'

# ⑤ 空串清空 → 200，data.vr_url 为 null
curl -s -X PATCH http://localhost:3000/api/v1/admin/works/1/vr-url \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"vr_url":""}'

# ⑥ 无 token → 401
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH http://localhost:3000/api/v1/admin/works/1/vr-url \
  -H 'Content-Type: application/json' -d '{"vr_url":""}'

# ⑦ C端详情带出字段（先用①重新设值再查）
curl -s http://localhost:3000/api/v1/works/1 | grep -o '"vr_url":"[^"]*"'
```

Expected: 按注释逐条比对；⑦ 能看到 `"vr_url":"https://www.kujiale.com/..."`。

- [ ] **Step 6: Commit**

```bash
git add server/src/services/caseService.js server/src/routes/cases.js
git commit -m "feat(server): 作品VR链接读写+酷家乐域名白名单校验+管理端vr-url接口"
```

---

### Task 3: 中转页 vr.html

**Files:**
- Create: `server/public/vr.html`
- Modify: `server/src/app.js`（admin dist 静态托管之后、SPA 兜底 ~L163 之前，约 L66 处加路由）

**Interfaces:**
- Consumes: 无（纯静态）。
- Produces: `GET /vr.html?u=<encodeURIComponent(酷家乐链接)>` — 白名单通过则全屏 iframe 加载，否则显示「链接无效」。Task 5 的 web-view 指向此 URL。

- [ ] **Step 1: 写中转页**（`server/public/vr.html`，目录不存在则创建）

```html
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>VR全景看房</title>
<style>
  html, body { margin: 0; height: 100%; background: #000; }
  iframe { display: block; width: 100%; height: 100%; border: 0; }
  .tip { color: #999; font: 14px/1.6 -apple-system, sans-serif; text-align: center; padding-top: 40vh; }
</style>
</head>
<body>
<div id="app" class="tip">全景加载中…</div>
<script>
(function () {
  var app = document.getElementById('app');
  function fail(msg) { app.textContent = msg; }
  try {
    var u = new URLSearchParams(location.search).get('u') || '';
    var url = new URL(u);
    var host = url.hostname.toLowerCase();
    var ok = url.protocol === 'https:' &&
             (host === 'kujiale.com' || /\.kujiale\.com$/.test(host));
    if (!ok) { fail('链接无效'); return; }
    var iframe = document.createElement('iframe');
    iframe.src = url.href;
    iframe.allow = 'fullscreen; gyroscope; accelerometer; xr-spatial-tracking';
    iframe.onload = function () { app.style.display = 'none'; };
    document.body.appendChild(iframe);
  } catch (e) { fail('链接无效'); }
})();
</script>
</body>
</html>
```

- [ ] **Step 2: app.js 挂路由**（必须在 SPA 兜底 `res.sendFile(...index.html)` 之前；放在管理后台静态托管代码块后面）

```js
// ═══ VR 中转页（小程序 web-view 内嵌酷家乐）═══
// 注意：必须在 SPA 兜底之前注册，否则会被 index.html 接管
app.get('/vr.html', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '..', 'public', 'vr.html'));
});
```

- [ ] **Step 3: 验证**

```bash
curl -s http://localhost:3000/vr.html | grep -c "kujiale"
```
Expected: `≥1`（返回的是中转页而非 admin 的 index.html）

浏览器打开：
`http://localhost:3000/vr.html?u=https%3A%2F%2Fwww.kujiale.com%2Fcloud%2Fdesign%2F3FO3DXSFRQ94%2Fairoaming%3Fgs.nav.type%3Dauto-site`
Expected: VR 可正常显示拖动。
再开 `http://localhost:3000/vr.html?u=https%3A%2F%2Fevil.com` → 显示「链接无效」。

- [ ] **Step 4: Commit**

```bash
git add server/public/vr.html server/src/app.js
git commit -m "feat(server): VR中转页vr.html-仅内嵌酷家乐域名"
```

---

### Task 4: 管理后台 — 详情面板 VR 链接编辑

**Files:**
- Modify: `admin/src/pages/Works.jsx`（DetailPanel ~L77 及主组件 handlers 区 ~L780、`<DetailPanel>` 渲染处）

**Interfaces:**
- Consumes: Task 2 的 `PATCH /admin/works/:id/vr-url`；详情 `GET /admin/works/:id` 已含 `vr_url`（`cases.*`）。
- Produces: DetailPanel 新 prop `onSaveVrUrl(work, vrUrl: string)`。

- [ ] **Step 1: 确认 hooks 导入**

文件顶部 import 需含 `useState` 与 `useEffect`（缺则补）。

- [ ] **Step 2: DetailPanel 加输入状态与 UI**

函数签名 props 加 `onSaveVrUrl`；函数体开头（`const s = STATUS_MAP...` 之前）加：

```jsx
  const [vrInput, setVrInput] = useState('');
  useEffect(() => { setVrInput(work?.vr_url || ''); }, [work?.id, work?.vr_url]);
```

信息区「基本信息 grid」与「描述」之间插入：

```jsx
              {/* VR 链接（酷家乐） */}
              <div>
                <p className="text-xs text-gray-400 mb-1">酷家乐 VR 链接</p>
                <div className="flex items-center space-x-2">
                  <input
                    value={vrInput}
                    onChange={(e) => setVrInput(e.target.value)}
                    placeholder="粘贴酷家乐分享链接，留空保存即清除"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    onClick={() => onSaveVrUrl(work, vrInput.trim())}
                    className="px-3 py-2 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-700 transition-colors shrink-0"
                  >
                    保存
                  </button>
                </div>
                {work.vr_url && (
                  <p className="text-xs text-green-600 mt-1">已配置 — 小程序详情页将显示"VR看房"按钮</p>
                )}
              </div>
```

- [ ] **Step 3: 主组件加 handler 并传 prop**

handlers 区（`handleToggleHot` 附近）加：

```jsx
  const handleSaveVrUrl = async (work, vrUrl) => {
    try {
      const res = await client.patch(`/admin/works/${work.id}/vr-url`, { vr_url: vrUrl });
      toast.success(vrUrl ? 'VR 链接已保存' : 'VR 链接已清除');
      setDetailWork((prev) => (prev ? { ...prev, vr_url: res.data.vr_url } : null));
    } catch (err) { toast.error(err?.message || '操作失败'); }
  };
```

找到 `<DetailPanel` 渲染处，props 加 `onSaveVrUrl={handleSaveVrUrl}`。

- [ ] **Step 4: 浏览器验证**

Run: `cd admin && npm run dev`，登录后打开作品管理 → 点任一作品：
1. 粘贴合法酷家乐链接 → 保存 → toast「VR 链接已保存」，出现绿色"已配置"提示；关闭重开面板值仍在；
2. 粘贴 `https://evil.com/x` → 保存 → toast 显示后端 400 文案；
3. 清空输入 → 保存 → toast「VR 链接已清除」，绿色提示消失。

- [ ] **Step 5: Commit**

```bash
git add admin/src/pages/Works.jsx
git commit -m "feat(admin): 作品详情面板支持录入/清除酷家乐VR链接"
```

---

### Task 5: 小程序 — vr-view 内置浏览器页

**Files:**
- Create: `miniprogram/pages/vr-view/index.js`
- Create: `miniprogram/pages/vr-view/index.json`
- Create: `miniprogram/pages/vr-view/index.wxml`
- Create: `miniprogram/pages/vr-view/index.wxss`
- Modify: `miniprogram/app.json`（pages 数组 `"pages/work-detail/index"` 之后加 `"pages/vr-view/index"`）

**Interfaces:**
- Consumes: Task 3 的 `GET /vr.html?u=...`；`utils/constants.js` 的 `BASE_URL`。
- Produces: 路由 `/pages/vr-view/index?u=<encodeURIComponent(酷家乐链接)>`，Task 6 跳转目标。

- [ ] **Step 1: index.json**

```json
{
  "navigationBarTitleText": "VR全景看房",
  "usingComponents": {}
}
```

- [ ] **Step 2: index.js**

```js
// VR 全景看房 — web-view 加载自有域名中转页，中转页内嵌酷家乐
const { BASE_URL } = require('../../utils/constants');

Page({
  data: { src: '' },

  onLoad(options) {
    let raw = options.u || '';
    // 各端对 query 是否自动 decode 行为不一，统一先 decode 再 encode
    try { raw = decodeURIComponent(raw); } catch (e) { /* 保持原值 */ }
    if (!raw || raw.indexOf('kujiale.com') === -1) {
      wx.showToast({ title: '链接无效', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ src: BASE_URL + '/vr.html?u=' + encodeURIComponent(raw) });
  },
});
```

- [ ] **Step 3: index.wxml / index.wxss**

wxml：
```xml
<web-view wx:if="{{src}}" src="{{src}}"></web-view>
```

wxss：
```css
/* web-view 全屏，无需样式 */
```

- [ ] **Step 4: app.json 注册页面**

`"pages/work-detail/index",` 下一行加：
```json
    "pages/vr-view/index",
```

- [ ] **Step 5: 开发者工具验证**

微信开发者工具编译后，在控制台执行：
```js
wx.navigateTo({ url: '/pages/vr-view/index?u=' + encodeURIComponent('https://www.kujiale.com/cloud/design/3FO3DXSFRQ94/airoaming?gs.nav.type=auto-site') })
```
Expected: 打开「VR全景看房」页并渲染酷家乐 VR（工具内 web-view 可用；若提示业务域名，勾选详情→本地设置→不校验合法域名，真机验证在 Task 8）。
再执行 `wx.navigateTo({ url: '/pages/vr-view/index' })` → toast「链接无效」并自动返回。

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/vr-view/ miniprogram/app.json
git commit -m "feat(miniprogram): 新增vr-view内置浏览器页"
```

---

### Task 6: 小程序 — 作品详情页 VR 悬浮按钮

**Files:**
- Modify: `miniprogram/pages/work-detail/index.js`（detailData.work 映射 ~L111-122、新增 onTapVR 方法）
- Modify: `miniprogram/pages/work-detail/index.wxml`（文件末尾、举报弹窗之外加悬浮按钮）
- Modify: `miniprogram/pages/work-detail/index.wxss`（文件末尾加样式）

**Interfaces:**
- Consumes: 详情接口返回的 `vr_url`（Task 2）；Task 5 的 `/pages/vr-view/index?u=`。
- Produces: 无（终端 UI）。

- [ ] **Step 1: index.js — work 映射加 vr_url**

`detailData.work` 对象内（`cover_image` 行后）加：

```js
          vr_url: work.vr_url || '',
```

- [ ] **Step 2: index.js — 加跳转方法**（Page 对象内，onOpenReport 附近）

```js
  // ─── VR 看房 ───
  onTapVR() {
    const vrUrl = this.data.work && this.data.work.vr_url;
    if (!vrUrl) return;
    wx.navigateTo({ url: '/pages/vr-view/index?u=' + encodeURIComponent(vrUrl) });
  },
```

- [ ] **Step 3: wxml — 悬浮按钮**（追加到文件末尾，与举报弹窗平级；`catchtap` 防双触发惯例）

```xml
<!-- VR 看房悬浮按钮（固定右下角，不随滚动） -->
<view wx:if="{{ready && work.vr_url}}" class="vr-fab" catchtap="onTapVR">
  <view class="vr-fab-halo"></view>
  <view class="vr-fab-icon"></view>
  <text class="vr-fab-text">VR看房</text>
</view>
```

- [ ] **Step 4: wxss — 样式**（追加到文件末尾；z-index 须低于举报弹窗层级，先查看现有 `.report-wrapper`/遮罩的 z-index，取其更小值，下面默认 30）

```css
/* ─── VR 看房悬浮按钮 ─── */
.vr-fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(64rpx + env(safe-area-inset-bottom));
  z-index: 30;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 36rpx 0 28rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #8B5CF6, #6366F1);
  box-shadow: 0 8rpx 24rpx rgba(99, 102, 241, 0.45);
}

/* 呼吸光晕：外圈同色放大淡出，2s 循环 */
.vr-fab-halo {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #8B5CF6, #6366F1);
  animation: vr-breathe 2s ease-in-out infinite;
  z-index: -1;
}

@keyframes vr-breathe {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.18); opacity: 0; }
}

/* VR 眼镜图标（内联 SVG，白色） */
.vr-fab-icon {
  width: 44rpx;
  height: 44rpx;
  margin-right: 12rpx;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M20.74 6H3.21C2.55 6 2 6.57 2 7.28v9.44c0 .7.55 1.28 1.23 1.28h4.79c.52 0 .96-.33 1.14-.79l1.4-3.48c.23-.59.79-1.01 1.44-1.01s1.21.42 1.45 1.01l1.39 3.48c.19.46.63.79 1.11.79h4.79c.71 0 1.26-.57 1.26-1.28V7.28c0-.71-.55-1.28-1.26-1.28zM7.5 14.09c-1.17 0-2.13-.95-2.13-2.09s.96-2.09 2.13-2.09 2.12.95 2.12 2.09-.95 2.09-2.12 2.09zm9 0c-1.17 0-2.13-.95-2.13-2.09s.96-2.09 2.13-2.09 2.12.95 2.12 2.09-.95 2.09-2.12 2.09z'/%3E%3C/svg%3E") no-repeat center / contain;
}

.vr-fab-text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
```

- [ ] **Step 5: 开发者工具验证**

1. 先用 Task 2 的 curl（或管理后台）给某作品设好 VR 链接；
2. 打开该作品详情页：右下角出现紫色胶囊按钮，上下滑动页面按钮位置不动，光晕呼吸动画正常；
3. 点击 → 进入 VR 页可漫游；返回正常；
4. 打开一个未设链接的作品 → 无按钮；
5. 打开举报弹窗 → 弹窗遮罩应盖住 VR 按钮（若被按钮穿透，调低 `.vr-fab` 的 z-index）。

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/work-detail/
git commit -m "feat(miniprogram): 作品详情页VR看房悬浮按钮"
```

---

### Task 7: 小程序 — 作品上传/编辑表单 VR 链接项

**Files:**
- Modify: `miniprogram/pages/work-upload/index.js`（form 初始值 ~L42、编辑回填 ~L256、`_hasFormContent` ~L157、`buildFormData` ~L420、`validateForm` ~L521）
- Modify: `miniprogram/pages/work-upload/index.wxml`（最高预算 form-item 之后 ~L229）

**Interfaces:**
- Consumes: Task 2 的 create/update `vr_url` 字段（空串=清空）。
- Produces: 无（终端表单）。

- [ ] **Step 1: form 初始值**（`budget_max: '',` 后加）

```js
      vr_url: '',
```

- [ ] **Step 2: 编辑回填**（~L256 `budget_max: ...` 映射行后加）

```js
          vr_url: work.vr_url || '',
```

- [ ] **Step 3: _hasFormContent 加一项**（`form.budget_max ||` 后加）

```js
      form.vr_url ||
```

- [ ] **Step 4: buildFormData 加字段**（`cover_image` 行前加；恒发送，空串即服务端清空）

```js
      vr_url: form.vr_url.trim(),
```

- [ ] **Step 5: validateForm 加校验**（最后一个校验块之后、`return true` 之前）

```js
    const vr = form.vr_url && form.vr_url.trim();
    if (vr && !/^https:\/\/([a-z0-9-]+\.)*kujiale\.com(\/|\?|$)/i.test(vr)) {
      wx.showToast({ title: '请填写酷家乐链接', icon: 'none' });
      return false;
    }
```

- [ ] **Step 6: wxml 加输入项**（「最高预算（万）」form-item 后）

```xml
        <view class="form-item">
          <text class="form-label">VR 全景链接</text>
          <input
            class="form-input"
            value="{{form.vr_url}}"
            data-field="vr_url"
            bindinput="onFieldInput"
            placeholder="粘贴酷家乐分享链接（选填）"
          />
        </view>
```

- [ ] **Step 7: 开发者工具验证**

设计师身份登录：
1. 新作品填合法酷家乐链接 → 保存草稿成功 → 重进编辑，链接回填正确；
2. 填 `https://baidu.com` → 保存 → toast「请填写酷家乐链接」；
3. 清空该字段保存 → 后端该作品 `vr_url` 为 null（可用 Task 2 ⑦ 的 curl 查）。

- [ ] **Step 8: Commit**

```bash
git add miniprogram/pages/work-upload/
git commit -m "feat(miniprogram): 作品上传表单支持填写酷家乐VR链接"
```

---

### Task 8: 部署上线 + 全链路验证

**Files:** 无新代码；服务器操作 + 微信发版。

**Interfaces:**
- Consumes: 全部前序任务；`env.config.json`（prod：`/root/Zhf-Pro`，pm2 `zhf-server`）。

- [ ] **Step 1: 生产部署（严格按序，deploy.sh 不会跑迁移）**

```bash
# ① 备份生产库
ssh root@43.136.71.64 "cp /root/Zhf-Pro/server/data/database.sqlite /root/Zhf-Pro/server/data/database.sqlite.bak-vr-$(date +%m%d)"
# ② 拉代码（按仓库既有 deploy.sh 流程）
# ③ 跑迁移
ssh root@43.136.71.64 "cd /root/Zhf-Pro/server && npm run migrate"
# ④ 重启
ssh root@43.136.71.64 "pm2 restart zhf-server"
```

- [ ] **Step 2: 生产冒烟**

```bash
curl -s https://wzzhfservice.cloud/vr.html | grep -c kujiale   # 期望 ≥1
sqlite3 检查改为线上验证：管理后台线上给一个作品配 VR 链接 → 保存成功
```

- [ ] **Step 3: 小程序发版（用户配合）**

1. 微信开发者工具上传新版本（登录持久化记忆：改动必须走微信上传）；
2. 体验版真机验证：详情页按钮 → web-view 打开 VR 可漫游（业务域名已配置，应直接通过）；
3. 验证通过后提交审核 → 发布。

- [ ] **Step 4: 真机全链路清单**

- [ ] 有链接作品显示按钮、滚动不动位、动画正常
- [ ] 点击进入 VR，可拖动漫游、返回正常
- [ ] 无链接作品不显示按钮
- [ ] 管理后台改链接后，小程序重进详情页生效
- [ ] iPhone 底部横条不遮按钮（safe-area）

- [ ] **Step 5: 收尾 commit（如有部署脚本/文档变更）+ 更新 PROJECT_MAP（若涉及新路由记录）**

```bash
git add -A && git status   # 确认无密钥后
git commit -m "chore: VR看房功能上线收尾"
```

---

## Self-Review 结果

- **Spec 覆盖**：迁移(T1)、服务端校验与接口(T2)、中转页(T3)、后台面板(T4)、vr-view(T5)、悬浮按钮(T6)、上传表单(T7)、错误处理（T2 curl ②③④⑥、T5 无参、T3 非白名单）、验证方案(各任务 verify + T8)、平台配置（已完成，无任务）✅
- **占位符扫描**：无 TBD/TODO；所有代码步骤含完整代码 ✅
- **类型/命名一致性**：`normalizeVrUrl` (T2 内部)、`caseService.setVrUrl(workId, vrUrl)` (T2→路由)、`PATCH /admin/works/:id/vr-url` (T2→T4)、`onSaveVrUrl(work, vrUrl)` (T4)、`/pages/vr-view/index?u=` (T5→T6)、`form.vr_url` (T7) 前后一致 ✅
