# 卫浴材料子品类必填字段细化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 后台卫浴材料表单按子品类显示不同必填字段；子品类筛选隐藏卫生间门；小程序端材料卡片+lightbox 显示对应信息。

**Architecture:** 在 `StyleWizardMaterials.jsx` 中，将现有统一的 `isBath`/`isBathPage` 卫浴表单拆分为子品类名驱动的条件分支（`isBathCabinet`/`isToilet`/`isSquatToilet`/`isWaterTank`/`isShower`/`isFaucet`），每个分支独立渲染必填字段和校验规则。子品类特有字段（排水方式、前出水墙距）存入 `attributes` JSON。小程序端材料预处理增加 `displayTitle`/`displaySubtitle` 字段，WXML 按子品类切换展示。

**Tech Stack:** React 19 + TailwindCSS 4（后台），微信原生框架（小程序）

## Global Constraints

- 不动 `StyleWizardBathroomDoors.jsx`、`DoorSeriesManager`、数据库 schema
- 不动浴室柜组合现有字段逻辑
- 卫生间门子品类从材料管理页筛选下拉隐藏，但独立模块保留
- 每个子品类只渲染必填字段，绝不多余

---

### Task 1: 后台 — 表单状态扩展 + 子品类检测

**Files:**
- Modify: `admin/src/pages/StyleWizardMaterials.jsx:15-21` (EMPTY_FORM)
- Modify: `admin/src/pages/StyleWizardMaterials.jsx:213-222` (表单派生)

**Interfaces:**
- Consumes: 现有 `EMPTY_FORM`、`selectedSub`、`isBath`、`isBathPage`
- Produces: 新字段 `drainage_method`、`wall_distance`；新检测变量 `isBathCabinet`、`isToilet`、`isSquatToilet`、`isWaterTank`、`isShower`、`isFaucet`

- [ ] **Step 1: 扩展 EMPTY_FORM 添加新字段**

在 `EMPTY_FORM` 对象（约第 15-21 行）中添加 `drainage_method: ''` 和 `wall_distance: ''`：

```js
const EMPTY_FORM = {
  subcategory_id: '', name: '', model: '', brand: '', brand_logo: '', image_url: '',
  original_price: '', discount_price: '', specs: '', sort_order: 0,
  has_chaise: false, old_code: '', new_code: '', applicable_scopes: [], style_ids: [],
  attr_values: {}, attr_raw: '',
  mirror_cabinet: '', main_cabinet: '', countertop: '',
  drainage_method: '', wall_distance: '',
};
```

- [ ] **Step 2: 添加子品类检测变量**

在 `isBath`/`isBathPage` 定义之后（约第 222 行后）添加：

```js
const subName = selectedSub?.name || '';
const isBathCabinet = subName.includes('浴室柜');
const isToilet = subName.includes('马桶');
const isSquatToilet = subName.includes('蹲厕');
const isWaterTank = subName.includes('水箱');
const isShower = subName.includes('花洒');
const isFaucet = subName.includes('水龙头');
// 非浴室柜的卫浴子品类（马桶/蹲厕/水箱/花洒/水龙头）
const isBathOther = isBath && !isBathCabinet;
```

- [ ] **Step 3: 验证构建通过**

```bash
cd admin && npx vite build --emptyOutDir
```

Expected: 构建成功（表单尚未连线，但语法正确）。

- [ ] **Step 4: Commit**

```bash
git add admin/src/pages/StyleWizardMaterials.jsx
git commit -m "feat(admin): 卫浴表单扩展子品类检测+新字段drainage_method/wall_distance"
```

---

### Task 2: 后台 — 表单验证按子品类重写

**Files:**
- Modify: `admin/src/pages/StyleWizardMaterials.jsx:273-301` (validateForm)

**Interfaces:**
- Consumes: `isBathCabinet`, `isToilet`, `isSquatToilet`, `isWaterTank`, `isShower`, `isFaucet`, `isBathOther` from Task 1
- Produces: 更新后的 `validateForm()` 函数

- [ ] **Step 1: 重写卫浴验证分支**

将第 282-288 行的 `else if (isBath || isBathPage)` 块替换为子品类条件分支：

```js
} else if (isBathCabinet) {
  // 浴室柜组合：保持现有逻辑
  if (!form.model.trim()) errs.model = '请输入型号';
  if (!form.mirror_cabinet.trim()) errs.mirror_cabinet = '请输入镜柜规格';
  if (!form.main_cabinet.trim()) errs.main_cabinet = '请输入主柜规格';
  if (!form.countertop.trim()) errs.countertop = '请输入台面规格';
} else if (isToilet) {
  if (!form.model.trim()) errs.model = '请输入型号';
  if (!form.specs.trim()) errs.specs = '请输入规格';
  if (!form.drainage_method.trim()) errs.drainage_method = '请输入排水方式';
} else if (isSquatToilet) {
  if (!form.model.trim()) errs.model = '请输入型号';
  if (!form.specs.trim()) errs.specs = '请输入规格';
  if (!form.wall_distance.trim()) errs.wall_distance = '请输入前出水墙距';
} else if (isWaterTank) {
  if (!form.model.trim()) errs.model = '请输入型号';
  if (!form.specs.trim()) errs.specs = '请输入规格';
} else if (isShower) {
  if (!form.name.trim()) errs.name = '请输入标题';
  if (!form.model.trim()) errs.model = '请输入型号';
} else if (isFaucet) {
  if (!form.name.trim()) errs.name = '请输入标题';
  if (!form.model.trim()) errs.model = '请输入型号';
}
```

同时保持图片必填的通用校验（第 292 行）不变——它对所有品类生效。

- [ ] **Step 2: 验证构建**

```bash
cd admin && npx vite build --emptyOutDir
```

Expected: 构建成功。

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/StyleWizardMaterials.jsx
git commit -m "feat(admin): 卫浴表单验证按子品类细化"
```

---

### Task 3: 后台 — 表单 JSX 按子品类渲染 + name/specs 条件显示

**Files:**
- Modify: `admin/src/pages/StyleWizardMaterials.jsx:508-627` (弹窗表单 JSX)

**Interfaces:**
- Consumes: `isBathCabinet`, `isToilet`, `isSquatToilet`, `isWaterTank`, `isShower`, `isFaucet`, `isBathOther` from Task 1
- Produces: 条件渲染的表单字段

- [ ] **Step 1: 修改 name 字段的条件显示**

当前第 524 行：`{!(isTile || isBath || isBathPage) && (` —— 需要改为花洒/水龙头也显示 name：

```jsx
{!(isTile || (isBath && !isShower && !isFaucet) || (isBathPage && !isShower && !isFaucet)) && (
```

- [ ] **Step 2: 修改 spec 字段的条件显示**

当前第 585 行：`{!(isBath || isBathPage) && (` —— 需要改为马桶/蹲厕/水箱也显示 specs：

```jsx
{!((isBath || isBathPage) && !isToilet && !isSquatToilet && !isWaterTank) && (
```

同时修改里面的 label（第 588 行）：卫浴品类的马桶/蹲厕/水箱显示"规格 *"。

- [ ] **Step 3: 替换卫浴专用字段区（镜柜/主柜/台面 → 按子品类切换）**

将第 599-627 行整个 `{(isBath || isBathPage) && (` 块替换为：

```jsx
{/* 浴室柜：镜柜 / 主柜 / 台面 */}
{isBathCabinet && (
  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-3">
    <p className="text-sm font-medium text-gray-700">卫浴规格</p>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">镜柜<span className="text-red-500"> *</span></label>
        <input value={form.mirror_cabinet} onChange={(e) => setForm({ ...form, mirror_cabinet: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder="如：800×650mm" />
        {formErrors.mirror_cabinet && <p className="text-red-500 text-xs mt-1">{formErrors.mirror_cabinet}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">主柜<span className="text-red-500"> *</span></label>
        <input value={form.main_cabinet} onChange={(e) => setForm({ ...form, main_cabinet: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder="如：800×500mm" />
        {formErrors.main_cabinet && <p className="text-red-500 text-xs mt-1">{formErrors.main_cabinet}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">台面<span className="text-red-500"> *</span></label>
        <input value={form.countertop} onChange={(e) => setForm({ ...form, countertop: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder="如：石英石" />
        {formErrors.countertop && <p className="text-red-500 text-xs mt-1">{formErrors.countertop}</p>}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
        <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
      </div>
    </div>
  </div>
)}

{/* 马桶：型号 + 规格 + 排水方式 */}
{isToilet && (
  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-3">
    <p className="text-sm font-medium text-gray-700">马桶规格</p>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">排水方式<span className="text-red-500"> *</span></label>
        <input value={form.drainage_method} onChange={(e) => setForm({ ...form, drainage_method: e.target.value })} className={INPUT_CLS} maxLength={64} placeholder="如：地排" />
        {formErrors.drainage_method && <p className="text-red-500 text-xs mt-1">{formErrors.drainage_method}</p>}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
        <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
      </div>
    </div>
  </div>
)}

{/* 蹲厕：前出水墙距 */}
{isSquatToilet && (
  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-3">
    <p className="text-sm font-medium text-gray-700">蹲厕规格</p>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">前出水墙距<span className="text-red-500"> *</span></label>
        <input value={form.wall_distance} onChange={(e) => setForm({ ...form, wall_distance: e.target.value })} className={INPUT_CLS} maxLength={64} placeholder="如：300mm" />
        {formErrors.wall_distance && <p className="text-red-500 text-xs mt-1">{formErrors.wall_distance}</p>}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
        <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
      </div>
    </div>
  </div>
)}

{/* 水箱：仅排序号（型号+规格已在基础字段区） */}
{isWaterTank && (
  <div className="grid grid-cols-3 gap-4 mt-2">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
      <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
    </div>
  </div>
)}

{/* 花洒 / 水龙头：仅排序号（标题+型号已在基础字段区，无 specs） */}
{(isShower || isFaucet) && (
  <div className="grid grid-cols-3 gap-4 mt-2">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
      <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
    </div>
  </div>
)}
```

同时需要隐藏品牌/品牌Logo 字段（当前第 532 行的 `{!(isBath || isBathPage) && (` 不变——卫浴不显示品牌，这符合要求）。

- [ ] **Step 2: 验证构建**

```bash
cd admin && npx vite build --emptyOutDir
```

Expected: 构建成功。

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/StyleWizardMaterials.jsx
git commit -m "feat(admin): 卫浴表单JSX按子品类渲染不同字段组"
```

---

### Task 4: 后台 — handleSubmit 按子品类构建 attributes + name 逻辑

**Files:**
- Modify: `admin/src/pages/StyleWizardMaterials.jsx:303-355` (handleSubmit)

**Interfaces:**
- Consumes: `isBathCabinet`, `isToilet`, `isSquatToilet`, `isWaterTank`, `isShower`, `isFaucet` from Task 1
- Produces: 更新后的 `handleSubmit()` payload 构建

- [ ] **Step 1: 修改 name 字段赋值逻辑**

当前第 310 行：`name: (isTile || isBath || isBathPage) ? '' : form.name.trim()`

改为：花洒/水龙头需要 name，浴室柜/马桶/蹲厕/水箱不需要：

```js
const needsName = isShower || isFaucet;
const bathNoName = (isBath || isBathPage) && !needsName;
name: (isTile || bathNoName) ? '' : form.name.trim(),
```

- [ ] **Step 2: 修改 attributes 构建逻辑**

将第 322-328 行的卫浴 attributes 块替换为子品类分支：

```js
if (isBathCabinet) {
  payload.attributes = {
    '镜柜': form.mirror_cabinet.trim(),
    '主柜': form.main_cabinet.trim(),
    '台面': form.countertop.trim(),
  };
} else if (isToilet) {
  payload.attributes = { '排水方式': form.drainage_method.trim() };
} else if (isSquatToilet) {
  payload.attributes = { '前出水墙距': form.wall_distance.trim() };
} else if (isWaterTank || isShower || isFaucet) {
  // 无 attributes — 不传
} else if (tpl.keys) {
  // 现有动态模板逻辑（非卫浴品类）
  ...
```

- [ ] **Step 3: 验证构建**

```bash
cd admin && npx vite build --emptyOutDir
```

Expected: 构建成功。

- [ ] **Step 4: Commit**

```bash
git add admin/src/pages/StyleWizardMaterials.jsx
git commit -m "feat(admin): 卫浴提交逻辑按子品类构建attributes"
```

---

### Task 5: 后台 — openEdit 加载排水方式/前出水墙距

**Files:**
- Modify: `admin/src/pages/StyleWizardMaterials.jsx:249-262` (openEdit 中的 setForm)

**Interfaces:**
- Consumes: `EMPTY_FORM` 中的新字段
- Produces: 编辑时正确回填 `drainage_method`、`wall_distance`

- [ ] **Step 1: 在 setForm 中添加 attributes 字段回填**

在 `openEdit` 的 `setForm({...})` 调用中（约第 249 行），在现有 `mirror_cabinet`/`main_cabinet`/`countertop` 行之后添加：

```js
drainage_method: attrValues['排水方式'] || '',
wall_distance: attrValues['前出水墙距'] || '',
```

即在 `countertop: attrValues['台面'] || '',`（第 261 行）之后添加这两行。

完整修改后的 setForm 调用：

```js
setForm({
  subcategory_id: String(m.subcategory_id),
  name: m.name || '', model: m.model || '', brand: m.brand || '',
  brand_logo: m.brand_logo || '', image_url: m.image_url || '',
  original_price: m.original_price ?? '', discount_price: m.discount_price ?? '',
  specs: m.specs || '', sort_order: m.sort_order ?? 0,
  has_chaise: !!m.has_chaise, old_code: m.old_code || '', new_code: m.new_code || '',
  applicable_scopes: scopes,
  style_ids: (m.styles || []).map((s) => s.id),
  attr_values: attrValues, attr_raw: attrRaw,
  mirror_cabinet: attrValues['镜柜'] || '',
  main_cabinet: attrValues['主柜'] || '',
  countertop: attrValues['台面'] || '',
  drainage_method: attrValues['排水方式'] || '',
  wall_distance: attrValues['前出水墙距'] || '',
});
```

- [ ] **Step 2: 验证构建**

```bash
cd admin && npx vite build --emptyOutDir
```

Expected: 构建成功。

- [ ] **Step 3: Commit**

```bash
git add admin/src/pages/StyleWizardMaterials.jsx
git commit -m "feat(admin): 编辑时回填排水方式/前出水墙距"
```

---

### Task 6: 后台 — 子品类筛选隐藏卫生间门 + 表格列动态适配

**Files:**
- Modify: `admin/src/pages/StyleWizardMaterials.jsx:376` (filterSubOptions)
- Modify: `admin/src/pages/StyleWizardMaterials.jsx:437-491` (表格列)

**Interfaces:**
- Consumes: `isBathPage`、`filterSubOptions`
- Produces: 过滤后的子品类下拉 + 动态表格列

- [ ] **Step 1: 子品类筛选隐藏卫生间门**

修改第 376 行 `filterSubOptions`：

```js
const filterSubOptions = (categories.find((c) => String(c.id) === String(filterCategory))?.subcategories || [])
  .filter(s => !(s.name || '').includes('卫生间门'));
```

同时在弹窗子品类选择器中（第 515-519 行），卫浴品类锁定时的 optgroup 子项也需过滤卫生间门：

```jsx
{(cat.subcategories || []).filter(s => !(s.name || '').includes('卫生间门')).map((sub) => ...)}
```

- [ ] **Step 2: 卫浴表格列改为通用列**

将第 438-439 行的卫浴表头从固定列 `['图片', '型号', '镜柜', '主柜', '台面', ...]` 改为：

```js
(isBathPage
  ? ['图片', '标题/型号', '关键属性', '子品类', '排序', '操作']
  : [...]
)
```

对应地，表格行中第 464-470 行的 `isBathPage` 条件分支改为：

```jsx
{isBathPage ? (
  <>
    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.name || m.model || '—'}</td>
    <td className="px-4 py-3 text-gray-600 max-w-48 truncate">{bathAttrSummary(bathAttrs, m)}</td>
  </>
) : (
```

并在组件顶部添加辅助函数 `bathAttrSummary`：

```js
function bathAttrSummary(attrs, material) {
  const parts = [];
  if (material.specs) parts.push(`规格：${material.specs}`);
  Object.entries(attrs).forEach(([k, v]) => { if (v) parts.push(`${k}：${v}`); });
  return parts.join('  ') || '—';
}
```

- [ ] **Step 3: 删除行提取 bathAttrs 时对 isBathPage 的依赖** — 保留现有逻辑，`bathAttrs` 提取不变。

- [ ] **Step 4: 验证构建**

```bash
cd admin && npx vite build --emptyOutDir
```

Expected: 构建成功。

- [ ] **Step 5: Commit**

```bash
git add admin/src/pages/StyleWizardMaterials.jsx
git commit -m "feat(admin): 卫生间门从子品类筛选隐藏+卫浴表格列动态化"
```

---

### Task 7: 小程序 — 材料卡片预处理 displayTitle/displaySubtitle

**Files:**
- Modify: `miniprogram/pages/style-wizard/index.js:335-354` (ensureMaterials 中材料预处理)
- Modify: `miniprogram/pages/style-wizard/index.js:665-689` (onZoomImage 中 lightboxImages 构建)

**Interfaces:**
- Consumes: `materialsCache` 中材料的 `name`/`model`/`specs`/`attrList`
- Produces: 每条材料新增 `displayTitle`/`displaySubtitle` 字段

- [ ] **Step 1: 材料预处理添加 displayTitle/displaySubtitle**

在 `ensureMaterials` 中材料 map 回调（约第 335-354 行）的 `return Object.assign({}, m, {...})` 里添加：

```js
displayTitle: m.name || m.brand || m.model || '',
displaySubtitle: [m.model && !m.name && !m.brand ? '' : m.model, m.specs]
  .filter(Boolean).join(' · ') || (m.name ? m.model : ''),
```

逻辑说明：
- 有 name 或 brand 时，title = name/brand，subtitle = model · specs
- 无 name 无 brand 时（卫浴场景），title = model，subtitle = specs
- attrList 中的信息（排水方式等）已有独立渲染区，不纳入 subtitle

- [ ] **Step 2: onZoomImage 优化 lines 构建**

修改 `onZoomImage`（约第 673-684 行）中 `lightboxImages` 的 map 回调：

```js
lightboxImages: mats.map((m) => {
  const lines = [];
  // 如果 title 不等于 model，才把 model 放入 lines（避免重复）
  const title = m.name || m.brand || m.model;
  if (m.model && title !== m.model) lines.push({ label: '型号', value: m.model });
  if (m.specs) lines.push({ label: '规格', value: m.specs });
  (m.attrList || []).forEach((a) => lines.push({ label: a.k, value: a.v }));
  return {
    id: m.id,
    url: m.image_url,
    title,
    lines,
  };
}),
```

- [ ] **Step 3: 验证小程序编译**

通过微信开发者工具编译，确认无语法错误。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/style-wizard/index.js
git commit -m "feat(miniprogram): 材料卡片预处理displayTitle/Subtitle+lightbox lines去重"
```

---

### Task 8: 小程序 — WXML 材料卡片使用新字段

**Files:**
- Modify: `miniprogram/pages/style-wizard/index.wxml:128-156` (材料卡片 mat-info 区)

**Interfaces:**
- Consumes: `mat.displayTitle`、`mat.displaySubtitle` from Task 7
- Produces: 更新后的卡片 DOM

- [ ] **Step 1: 重写 mat-info 区为统一模板**

将第 128-156 行的 mat-info 区替换为：

```xml
<view class="mat-info">
  <text class="mat-name">{{mat.displayTitle}}</text>
  <text wx:if="{{mat.displaySubtitle}}" class="mat-brand">{{mat.displaySubtitle}}</text>
  <text wx:if="{{mat.old_code}}" class="mat-code">老编码：{{mat.old_code}}</text>
  <text wx:if="{{mat.new_code}}" class="mat-code">新编码：{{mat.new_code}}</text>
  <view wx:if="{{mat.scopes.length}}" class="mat-scopes">
    <text class="scope-tag" wx:for="{{mat.scopes}}" wx:for-item="sc" wx:key="*this">✓ {{sc}}</text>
  </view>
  <view wx:if="{{mat.attrList.length}}" class="mat-attrs">
    <text class="attr-line" wx:for="{{mat.attrList}}" wx:for-item="attr" wx:key="k">{{attr.k}} {{attr.v}}</text>
  </view>
  <view wx:if="{{mat.original_price != null || mat.discount_price != null}}" class="price-row">
    <text wx:if="{{mat.original_price != null}}" class="price-original">¥{{mat.original_price}}</text>
    <text wx:if="{{mat.discount_price != null}}" class="price-discount">¥{{mat.discount_price}}</text>
  </view>
</view>
```

这统一了之前三路分支（有name/有brand/无name无brand）为一个简洁模板，由 JS 层预处理 `displayTitle`/`displaySubtitle`。

注意保留品牌 logo 行（`mat.brand_logo`）——它只在瓷砖品类出现，需单独保留：

在第 128 行之前添加（替换原来的 `mat.brand` 判断块）：

```xml
<view wx:if="{{mat.brand_logo}}" class="mat-brand-row">
  <image class="mat-logo" src="{{mat.brand_logo}}" mode="aspectFit" />
</view>
```

- [ ] **Step 2: 验证微信开发者工具编译**

在微信开发者工具中编译，确认 WXML 无语法错误，材料卡片正常渲染。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/style-wizard/index.wxml
git commit -m "feat(miniprogram): 材料卡片WXML统一为displayTitle/Subtitle模板"
```

---

### Task 9: 端到端验证

**Files:** 无新文件

- [ ] **Step 1: 后台验证**

1. 访问 `/admin/style-wizard/materials/3`（卫浴选材）
2. 确认子品类下拉中**不出现**"卫生间门"
3. 选择"马桶"→添加→表单显示：型号*、规格*、排水方式*、图片URL*
4. 填写必填项 → 保存成功 → 列表"关键属性"列显示"规格：xxx 排水方式：xxx"
5. 选择"花洒"→添加→表单显示：材料名称*（标题）、型号*、图片URL*
6. 选择"蹲厕"→添加→表单显示：型号*、规格*、前出水墙距*、图片URL*
7. 编辑已有材料 → 排水方式/前出水墙距正确回填

- [ ] **Step 2: 小程序验证**

1. 进入风格选材 → 第3步卫浴
2. 展开马桶子品类 → 卡片显示型号+规格+排水方式
3. 点击放大 → lightbox 显示型号+规格+排水方式
4. 花洒 → 卡片显示标题+型号

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A && git commit -m "chore: 端到端验证完成"
```
