# 设计文档：卫浴材料子品类必填字段细化

- 日期：2026-07-21
- 状态：已确认
- 关联：[风格选材向导设计](2026-07-16-style-material-wizard-design.md)

## 背景与目标

当前卫浴材料（page_number=3）所有子品类共用同一套表单（型号 + 镜柜 + 主柜 + 台面 + 图片），不区分马桶、蹲厕、水箱、花洒、水龙头。需要按子品类显示不同的必填字段，且每个子品类只渲染必填输入框。

同时，卫生间门已有独立管理模块（`StyleWizardBathroomDoors`），需从卫浴材料页的子品类筛选中隐藏。

## 已确认的业务决策

| 决策点 | 结论 |
|--------|------|
| 卫生间门 | 从材料管理页子品类筛选隐藏（独立模块不动） |
| 浴室柜组合 | 保持现有字段不变 |
| 排水方式/前出水墙距 | 存入 `attributes` JSON 列 |
| 表单字段 | 每个子品类只渲染必填字段，绝不多余 |

## 子品类字段映射

| 子品类 | name（标题） | model（型号） | specs（规格） | image_url（图片） | attributes JSON |
|--------|:---------:|:----------:|:----------:|:--------------:|-----------------|
| 浴室柜组合 | — | ✓ | — | ✓ | 镜柜、主柜、台面 |
| 马桶 | — | ✓ | ✓ | ✓ | 排水方式 |
| 蹲厕 | — | ✓ | ✓ | ✓ | 前出水墙距 |
| 水箱 | — | ✓ | ✓ | ✓ | — |
| 花洒 | ✓ | ✓ | — | ✓ | — |
| 水龙头 | ✓ | ✓ | — | ✓ | — |

> ✓ = 必填，— = 不显示该字段

## 实现方案

### 一、后台 — StyleWizardMaterials.jsx

**1. 子品类筛选隐藏卫生间门**

在 `filterSubOptions` 中过滤掉名称含"卫生间门"的子品类：

```js
const filterSubOptions = (categories.find(...)?.subcategories || [])
  .filter(s => !s.name?.includes('卫生间门'));
```

同理，卫浴品类列表（`categories`）加载时不需过滤整个品类，只在子品类级过滤。

**2. 表单字段按子品类名检测**

沿用现有 `isSofa` 子串匹配模式，新增检测：

```js
const subName = selectedSub?.name || '';
const isBathCabinet = subName.includes('浴室柜');      // 现有逻辑保持
const isToilet = subName.includes('马桶');
const isSquatToilet = subName.includes('蹲厕');
const isWaterTank = subName.includes('水箱');
const isShower = subName.includes('花洒');
const isFaucet = subName.includes('水龙头');
```

**3. 表单验证**

```js
if (isBathCabinet) {
  // 现有一致：型号 + 镜柜 + 主柜 + 台面 + 图片
} else if (isToilet) {
  if (!form.model.trim()) errs.model = '请输入型号';
  if (!form.specs.trim()) errs.specs = '请输入规格';
  if (!form.drainage_method?.trim()) errs.drainage_method = '请输入排水方式';
} else if (isSquatToilet) {
  if (!form.model.trim()) errs.model = '请输入型号';
  if (!form.specs.trim()) errs.specs = '请输入规格';
  if (!form.wall_distance?.trim()) errs.wall_distance = '请输入前出水墙距';
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
// 所有子品类图片必填
if (!form.image_url.trim()) errs.image_url = '请上传图片';
```

**4. 表单 JSX 渲染**

每个子品类只渲染对应输入框，不渲染无关字段。示例：

```
马桶表单：
  [型号*] [规格*]
  [排水方式*]
  [图片上传*]

花洒表单：
  [标题*]
  [型号*]
  [图片上传*]
```

**5. 表单数据提交**

`attributes` JSON 按子品类组装：

```js
if (isToilet) {
  payload.attributes = { '排水方式': form.drainage_method.trim() };
} else if (isSquatToilet) {
  payload.attributes = { '前出水墙距': form.wall_distance.trim() };
} else if (isBathCabinet) {
  payload.attributes = { '镜柜': ..., '主柜': ..., '台面': ... }; // 现有一致
}
// 水箱、花洒、水龙头不传 attributes
```

花洒和水龙头：`name`（标题）字段走标准 `name` 列，因为 `name` 列非空存空串即可。

**6. 表格列**

卫浴页（`isBathPage`）表头改为通用列：

```
图片 | 标题/型号 | 关键属性 | 子品类 | 排序 | 操作
```

"关键属性"列按子品类提取 attributes 摘要文本，如"排水方式：地排"、"前出水墙距：300mm"、"镜柜：800mm 主柜：800mm"。

### 二、小程序 — style-wizard/index.js + index.wxml

**1. 材料卡片信息展示**

当前卫浴材料卡片只显示型号。需按子品类拼接文案：

| 子品类 | 卡片文案格式 |
|--------|-------------|
| 马桶 | `{model} · {specs} · 排水方式：{attributes.排水方式}` |
| 蹲厕 | `{model} · {specs} · 前出水墙距：{attributes.前出水墙距}` |
| 水箱 | `{model} · {specs}` |
| 花洒 | `{name} · {model}` |
| 水龙头 | `{name} · {model}` |
| 浴室柜组合 | `{model}（现有逻辑不变）` |

实现：在 `index.js` 中为 materialsCache 数据预处理 `displayLabel` 字段，WXML 直接渲染。

**2. 图片 lightbox**

`image-lightbox` 组件放大态底部/顶部信息栏需显示子品类对应字段。当前可能只显示名称——需要传入更多上下文信息。方案：lightbox 组件接受 `info` 属性（字符串），由父页面按子品类拼接传入。

**3. 卫生间门相关代码**

小程序端 `bathDoorSeries`/`bathDoorChosenSeriesId` 等卫生间门逻辑在卫浴步骤中需确认是否已解耦。如卫生间门已不作为手风琴子板块出现（后台子品类列表中已移除），则小程序端这些变量已无调用路径，不需额外处理。

### 三、不动范围

- `StyleWizardBathroomDoors.jsx` — 不动
- `DoorSeriesManager` 组件 — 不动
- `styleWizardService.js` 门系列相关 — 不动
- 浴室柜组合现有逻辑 — 不动
- 数据库 schema — 不动

## 验证

- 后台：卫浴品类下选择不同子品类，表单字段正确切换，必填校验生效
- 后台：卫生间门不出现在子品类筛选下拉中
- 后台：表格"关键属性"列正确显示各子品类 attributes
- 小程序：材料卡片按子品类显示对应信息
- 小程序：图片 lightbox 显示对应信息
