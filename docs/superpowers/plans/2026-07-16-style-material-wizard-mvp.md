# 风格选材向导 MVP — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有住好房小程序中新增「风格选材」tab，实现六风格→七步选材向导→优惠价总结→提交的完整闭环，后台可管理全部数据。

**Architecture:** 后端新增 11 张表 + 1 个迁移文件 + 6 个 Service + 1 个路由文件；管理后台新增 5 个页面（复用现有 Layout/Modal/EmptyState）；小程序新增 1 个 tab + 9 个页面 + 3 个组件 + ~35 个 SVG 图标。三端通过 REST API 通信，与旧选材系统完全隔离。

**Tech Stack:** Express 5 + Knex/better-sqlite3 + React 19/Tailwind 4 + 微信原生小程序

## Global Constraints

- 密钥不入 git；`.env` 存真实密钥，`.env.example` 只放占位符
- 管理后台 Modal z-40 + Sidebar z-50 层级不可打破
- 小程序禁用 emoji 图标，全部使用自绘 SVG
- 小程序 navigateTo 的页面必须使用 onReady+ready 门控防闪烁模式
- 暖白奢华配色：米白底 #FAF8F5 / 炭黑字 #1A1A1A / 香槟金 #C9A96E
- 字体：PingFang SC, -apple-system, sans-serif（无 Google Fonts）
- 旧「在线选材」tab 和旧 material_orders 表完整保留不动
- 价格体系：original_price（划线）+ discount_price（醒目），一期全为一口价
- 响应格式：`{ success: true, data }` / 分页 `{ list, pagination }` / 错误 `{ error: { message, status } }`
- 分页默认 page=1, page_size=20, 上限 50
- ⚠️ 路由命名空间：与旧系统重名的路径统一加 style- 前缀（/style-categories, /admin/style-categories, /admin/style-materials）——旧 /categories 与 /admin/materials 已被老路由占用

---

## File Structure

### Backend (server/src/)

```
server/src/
├── db/migrations/
│   └── 014_add_style_wizard_tables.js    # 新建 — 11 张表
├── services/
│   ├── styleWizardService.js             # 新建 — 风格/品类/子品类/材料/门/灯具/草稿/订单
│   └── styleWizardMaterialService.js     # 新建 — 向导材料 CRUD（弹性属性）
├── routes/
│   └── style-wizard.js                   # 新建 — 所有风格选材 API
└── app.js                                # 修改 — 注册新路由
```

### Admin (admin/src/)

```
admin/src/
├── pages/
│   ├── StyleWizardStyles.jsx             # 新建 — 风格管理
│   ├── StyleWizardCategories.jsx         # 新建 — 品类+子品类管理
│   ├── StyleWizardMaterials.jsx          # 新建 — 材料管理（弹性属性表单）
│   ├── StyleWizardDoors.jsx              # 新建 — 门系列+颜色管理
│   ├── StyleWizardLighting.jsx           # 新建 — 灯具套餐管理
│   └── StyleWizardOrders.jsx             # 新建 — 选材单管理
├── components/
│   ├── Sidebar.jsx                       # 修改 — MENU_GROUPS 新增「风格选材」分组
│   └── HeaderBar.jsx                     # 修改 — BREADCRUMB_MAP 新增
└── router/index.jsx                      # 修改 — 注册 6 条新路由
```

### Mini Program (miniprogram/)

```
miniprogram/
├── app.json                              # 修改 — 新增第5个 tab「风格选材」
├── assets/icons/                         # 新建目录 — ~35 个 SVG 图标
│   ├── tab-selection.svg
│   ├── step-tile.svg, step-door.svg, step-bath.svg, step-custom.svg
│   ├── step-sofa.svg, step-furniture.svg, step-lighting.svg
│   ├── check.svg, arrow-right.svg, arrow-left.svg, close.svg
│   ├── chevron-left.svg, chevron-right.svg, skip.svg, edit.svg
│   ├── chevron-down.svg, zoom-in.svg
│   ├── step-done.svg, step-active.svg, step-pending.svg
│   ├── badge-cabinet-body.svg, badge-cabinet-door.svg
│   ├── badge-kitchen-body.svg, badge-kitchen-door.svg
│   ├── num-1.svg ~ num-7.svg
│   ├── selected-mark.svg, tag-price.svg
├── pages/
│   ├── style-select/                     # 新建 — 风格选择页（杂志画册式）
│   │   └── index.js, index.wxml, index.wxss, index.json
│   ├── style-wizard/                     # 新建 — 七步向导页（通用，动态渲染当前步骤）
│   │   └── index.js, index.wxml, index.wxss, index.json
│   ├── style-summary/                    # 新建 — 总结提交页
│   │   └── index.js, index.wxml, index.wxss, index.json
│   └── style-my-selections/             # 新建 — 我的选材
│       └── index.js, index.wxml, index.wxss, index.json
├── components/
│   ├── accordion-card/                   # 新建 — 手风琴折叠卡片
│   │   └── index.js, index.wxml, index.wxss, index.json
│   ├── progress-steps/                   # 新建 — 步骤进度条
│   │   └── index.js, index.wxml, index.wxss, index.json
│   └── image-lightbox/                   # 新建 — 图片放大查看
│       └── index.js, index.wxml, index.wxss, index.json
└── utils/
    └── api.js                            # 修改 — 新增风格选材 API 函数
```

---

## Phase 1: Backend — 数据库 + API

### Task 1.1: 数据库迁移 — 12 张新表

**Files:**
- Create: `server/src/db/migrations/014_add_style_wizard_tables.js`

**Interfaces:**
- Produces: 12 tables — `styles`, `style_categories`, `style_subcategories`, `style_materials`, `material_styles`, `door_series`, `door_colors`, `door_materials`, `lighting_packages`, `lighting_package_items`, `selection_drafts`, `selection_orders`

- [ ] **Step 1: 编写迁移文件**

创建 `server/src/db/migrations/014_add_style_wizard_tables.js`：

```js
/**
 * 014 — 风格选材向导全套表（V2.0 新增）
 *
 * styles              装修风格
 * style_categories    品类页（7步）
 * style_subcategories 子品类（页面内板块）
 * style_materials     材料/产品（弹性属性）
 * material_styles     材料-风格多对多
 * door_series         门系列
 * door_colors         门颜色（挂系列下）
 * door_materials      门材料（系列×颜色×风格）
 * lighting_packages   灯具套餐
 * lighting_package_items  套餐明细（5件）
 * selection_drafts    选材草稿
 * selection_orders    选材单
 */

exports.up = function (knex) {
  return knex.schema
  // 1. 装修风格
  .createTable('styles', (table) => {
    table.increments('id');
    table.string('name', 64).notNullable();
    table.string('cover_image').nullable();
    table.text('description').nullable();
    table.integer('sort_order').defaultTo(0);
    table.boolean('enabled').defaultTo(true);
    table.timestamps(true, true);
  })
  // 2. 品类页（7步）
  .createTable('style_categories', (table) => {
    table.increments('id');
    table.string('name', 64).notNullable();
    table.integer('page_number').notNullable().comment('步骤序号 1-7');
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  })
  // 3. 子品类（页面内板块）
  .createTable('style_subcategories', (table) => {
    table.increments('id');
    table.integer('category_id').unsigned().notNullable().references('id').inTable('style_categories').onDelete('CASCADE');
    table.string('name', 64).notNullable();
    table.integer('sort_order').defaultTo(0);
    table.string('layout_type', 32).defaultTo('image_top_text_bottom');
    table.integer('columns').defaultTo(2);
    table.text('attribute_template').nullable();
    table.timestamps(true, true);
  })
  // 4. 材料/产品（弹性属性）
  .createTable('style_materials', (table) => {
    table.increments('id');
    table.integer('subcategory_id').unsigned().notNullable().references('id').inTable('style_subcategories').onDelete('CASCADE');
    table.string('name', 128).notNullable();
    table.string('model', 128).nullable();
    table.string('brand', 64).nullable();
    table.string('brand_logo').nullable();
    table.string('image_url').nullable();
    table.decimal('original_price', 10, 2).nullable();
    table.decimal('discount_price', 10, 2).nullable();
    table.text('specs').nullable();
    table.text('attributes').nullable().comment('JSON弹性属性');
    table.boolean('has_chaise').defaultTo(false);
    table.string('old_code', 64).nullable();
    table.string('new_code', 64).nullable();
    table.text('applicable_scopes').nullable().comment('JSON数组：适用范围');
    table.integer('sort_order').defaultTo(0);
    table.boolean('enabled').defaultTo(true);
    table.timestamps(true, true);
  })
  // 5. 材料-风格多对多
  .createTable('material_styles', (table) => {
    table.integer('material_id').unsigned().notNullable().references('id').inTable('style_materials').onDelete('CASCADE');
    table.integer('style_id').unsigned().notNullable().references('id').inTable('styles').onDelete('CASCADE');
    table.primary(['material_id', 'style_id']);
  })
  // 6. 门系列
  .createTable('door_series', (table) => {
    table.increments('id');
    table.string('name', 64).notNullable();
    table.string('image_url').nullable();
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  })
  // 7. 门颜色（挂系列下）
  .createTable('door_colors', (table) => {
    table.increments('id');
    table.integer('series_id').unsigned().notNullable().references('id').inTable('door_series').onDelete('CASCADE');
    table.string('name', 32).notNullable();
    table.string('image_url').nullable().comment('色块图');
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  })
  // 8. 门材料（系列×颜色×风格组合）
  .createTable('door_materials', (table) => {
    table.increments('id');
    table.integer('series_id').unsigned().notNullable().references('id').inTable('door_series').onDelete('CASCADE');
    table.integer('color_id').unsigned().notNullable().references('id').inTable('door_colors').onDelete('CASCADE');
    table.integer('style_id').unsigned().notNullable().references('id').inTable('styles').onDelete('CASCADE');
    table.string('image_url').nullable();
    table.decimal('original_price', 10, 2).nullable();
    table.decimal('discount_price', 10, 2).nullable();
    table.text('specs').nullable();
    table.timestamps(true, true);
  })
  // 9. 灯具套餐
  .createTable('lighting_packages', (table) => {
    table.increments('id');
    table.string('name', 128).notNullable();
    table.string('image_url').nullable();
    table.decimal('original_price', 10, 2).nullable();
    table.decimal('discount_price', 10, 2).nullable();
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  })
  // 10. 灯具套餐明细（每套餐5件）
  .createTable('lighting_package_items', (table) => {
    table.increments('id');
    table.integer('package_id').unsigned().notNullable().references('id').inTable('lighting_packages').onDelete('CASCADE');
    table.string('room_type', 32).notNullable().comment('客厅/餐厅/卧室');
    table.string('name', 128).notNullable();
    table.string('image_url').nullable();
    table.string('size', 64).nullable();
    table.string('wattage', 32).nullable();
    table.string('material', 64).nullable();
    table.string('color', 32).nullable();
    table.string('light_source', 64).nullable();
    table.string('control_method', 64).nullable();
    table.string('illumination_area', 32).nullable();
    table.decimal('retail_price', 10, 2).nullable();
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  })
  // 11. 选材草稿
  .createTable('selection_drafts', (table) => {
    table.increments('id');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('designers').onDelete('CASCADE');
    table.integer('style_id').unsigned().nullable().references('id').inTable('styles').onDelete('SET NULL');
    table.integer('current_step').defaultTo(1);
    table.text('data').nullable().comment('JSON：各步骤已选快照');
    table.timestamps(true, true);
  })
  // 12. 选材单
  .createTable('selection_orders', (table) => {
    table.increments('id');
    table.string('order_no', 20).notNullable().unique();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('designers').onDelete('CASCADE');
    table.integer('style_id').unsigned().nullable().references('id').inTable('styles').onDelete('SET NULL');
    table.string('owner_name', 32).nullable();
    table.string('owner_phone', 20).nullable();
    table.string('community', 64).nullable();
    table.string('room_number', 32).nullable();
    table.decimal('original_total', 10, 2).nullable();
    table.decimal('discount_total', 10, 2).nullable();
    table.text('items').nullable().comment('JSON价格快照');
    table.string('status', 16).defaultTo('pending');
    table.integer('designer_id').unsigned().nullable();
    table.integer('supervisor_id').unsigned().nullable();
    table.timestamp('submitted_at');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('selection_orders')
    .dropTableIfExists('selection_drafts')
    .dropTableIfExists('lighting_package_items')
    .dropTableIfExists('lighting_packages')
    .dropTableIfExists('door_materials')
    .dropTableIfExists('door_colors')
    .dropTableIfExists('door_series')
    .dropTableIfExists('material_styles')
    .dropTableIfExists('style_materials')
    .dropTableIfExists('style_subcategories')
    .dropTableIfExists('style_categories')
    .dropTableIfExists('styles');
};
```

- [ ] **Step 2: 运行迁移**

```bash
cd /Users/lyf/Desktop/ZHFPro/server && npx knex migrate:latest
```

Expected: 迁移成功，12 张新表创建

- [ ] **Step 3: 预设种子数据（7个品类+子品类）**

```bash
cd /Users/lyf/Desktop/ZHFPro/server && node -e "
const db = require('./src/db/connection');
(async () => {
  const categories = [
    { name: '瓷砖选材', page_number: 1 },
    { name: '室内木门', page_number: 2 },
    { name: '卫浴选材', page_number: 3 },
    { name: '装饰定制', page_number: 4 },
    { name: '沙发选材', page_number: 5 },
    { name: '家具选材', page_number: 6 },
    { name: '装饰灯具', page_number: 7 },
  ];
  for (const c of categories) await db('style_categories').insert(c);
  const subs = [
    { category_id:1, name:'客餐厅/房间/阳台地板砖', sort_order:1, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:1, name:'厨房/卫生间墙砖', sort_order:2, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:1, name:'卫生间地板砖', sort_order:3, layout_type:'image_left_text_right', columns:2 },
    { category_id:2, name:'门系列选择', sort_order:1, layout_type:'color_swatch', columns:1 },
    { category_id:3, name:'浴室柜组合', sort_order:1, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:3, name:'卫生间门', sort_order:2, layout_type:'image_top_text_bottom', columns:1 },
    { category_id:3, name:'马桶', sort_order:3, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:3, name:'蹲厕', sort_order:4, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:3, name:'水箱', sort_order:5, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:3, name:'花洒', sort_order:6, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:3, name:'水龙头', sort_order:7, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:4, name:'柜体/柜门颜色', sort_order:1, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:4, name:'橱柜台面石', sort_order:2, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:5, name:'沙发', sort_order:1, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:6, name:'床', sort_order:1, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:6, name:'餐桌餐椅', sort_order:2, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:6, name:'电视柜', sort_order:3, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:6, name:'茶几', sort_order:4, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:6, name:'床头柜', sort_order:5, layout_type:'image_top_text_bottom', columns:2 },
    { category_id:7, name:'灯具套餐', sort_order:1, layout_type:'package_card', columns:1 },
  ];
  for (const s of subs) await db('style_subcategories').insert(s);
  console.log('Done: 7 categories + ' + subs.length + ' subcategories');
  db.destroy();
})().catch(e => { console.error(e); db.destroy(); });
"
```

- [ ] **Step 4: Commit**

```bash
git add server/src/db/migrations/014_add_style_wizard_tables.js
git commit -m "feat(db): 风格选材向导 12 张新表迁移 + 种子数据"
```

---

### Task 1.2: Service — 风格/品类/子品类 CRUD

**Files:**
- Create: `server/src/services/styleWizardService.js`

**Interfaces:**
- Produces: `{ listStyles, getStyle, createStyle, updateStyle, deleteStyle, listCategories, getSubcategories, createSubcategory, updateSubcategory, deleteSubcategory, listDoorSeries, ..., saveDraft, getDraft, submitOrder, listOrders, getOrder }`

- [ ] **Step 1: 编写 Service**

创建 `server/src/services/styleWizardService.js`：

```js
const db = require('../db/connection');

const styleWizardService = {
  // ===== 风格 CRUD =====
  async listStyles(includeDisabled = false) {
    let q = db('styles').orderBy('sort_order', 'asc');
    if (!includeDisabled) q = q.where('enabled', true);
    return q;
  },
  async getStyle(id) {
    const s = await db('styles').where('id', id).first();
    if (!s) throw Object.assign(new Error('风格不存在'), { status: 404 });
    return s;
  },
  async createStyle({ name, cover_image, description, sort_order }) {
    if (!name) throw Object.assign(new Error('风格名称不能为空'), { status: 400 });
    const [id] = await db('styles').insert({
      name, cover_image: cover_image || null,
      description: description || null,
      sort_order: sort_order !== undefined ? sort_order : 0,
    });
    return db('styles').where('id', id).first();
  },
  async updateStyle(id, fields) {
    const ex = await db('styles').where('id', id).first();
    if (!ex) throw Object.assign(new Error('风格不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.cover_image !== undefined) u.cover_image = fields.cover_image;
    if (fields.description !== undefined) u.description = fields.description;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    if (fields.enabled !== undefined) u.enabled = fields.enabled;
    await db('styles').where('id', id).update(u);
    return db('styles').where('id', id).first();
  },
  async deleteStyle(id) {
    const ex = await db('styles').where('id', id).first();
    if (!ex) throw Object.assign(new Error('风格不存在'), { status: 404 });
    await db('styles').where('id', id).del();
  },

  // ===== 品类 + 子品类 =====
  async listCategories() {
    const cats = await db('style_categories').orderBy('page_number', 'asc');
    const subs = await db('style_subcategories').orderBy('sort_order', 'asc');
    return cats.map(c => ({ ...c, subcategories: subs.filter(s => s.category_id === c.id) }));
  },
  async getSubcategories(categoryId) {
    return db('style_subcategories').where('category_id', categoryId).orderBy('sort_order', 'asc');
  },
  async createSubcategory({ category_id, name, sort_order, layout_type, columns, attribute_template }) {
    if (!category_id || !name) throw Object.assign(new Error('品类和名称为必填'), { status: 400 });
    const [id] = await db('style_subcategories').insert({
      category_id, name, sort_order: sort_order || 0,
      layout_type: layout_type || 'image_top_text_bottom',
      columns: columns || 2,
      attribute_template: attribute_template || null,
    });
    return db('style_subcategories').where('id', id).first();
  },
  async updateSubcategory(id, fields) {
    const ex = await db('style_subcategories').where('id', id).first();
    if (!ex) throw Object.assign(new Error('子品类不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    if (fields.layout_type !== undefined) u.layout_type = fields.layout_type;
    if (fields.columns !== undefined) u.columns = fields.columns;
    if (fields.attribute_template !== undefined) u.attribute_template = fields.attribute_template;
    await db('style_subcategories').where('id', id).update(u);
    return db('style_subcategories').where('id', id).first();
  },
  async deleteSubcategory(id) {
    await db('style_subcategories').where('id', id).del();
  },

  // ===== 门系列 + 颜色 + 门材料 =====
  async listDoorSeries() {
    const series = await db('door_series').orderBy('sort_order', 'asc');
    for (const s of series) {
      s.colors = await db('door_colors').where('series_id', s.id).orderBy('sort_order', 'asc');
    }
    return series;
  },
  async getDoorSeries(id) {
    const s = await db('door_series').where('id', id).first();
    if (!s) throw Object.assign(new Error('门系列不存在'), { status: 404 });
    s.colors = await db('door_colors').where('series_id', id).orderBy('sort_order', 'asc');
    return s;
  },
  async createDoorSeries({ name, image_url, sort_order }) {
    if (!name) throw Object.assign(new Error('系列名称不能为空'), { status: 400 });
    const [id] = await db('door_series').insert({ name, image_url: image_url || null, sort_order: sort_order || 0 });
    return db('door_series').where('id', id).first();
  },
  async updateDoorSeries(id, fields) {
    const ex = await db('door_series').where('id', id).first();
    if (!ex) throw Object.assign(new Error('门系列不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.image_url !== undefined) u.image_url = fields.image_url;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    await db('door_series').where('id', id).update(u);
    return db('door_series').where('id', id).first();
  },
  async deleteDoorSeries(id) {
    await db('door_colors').where('series_id', id).del();
    await db('door_materials').where('series_id', id).del();
    await db('door_series').where('id', id).del();
  },
  async listDoorColors(seriesId) {
    return db('door_colors').where('series_id', seriesId).orderBy('sort_order', 'asc');
  },
  async createDoorColor({ series_id, name, image_url, sort_order }) {
    if (!series_id || !name) throw Object.assign(new Error('系列和颜色名称为必填'), { status: 400 });
    const [id] = await db('door_colors').insert({ series_id, name, image_url: image_url || null, sort_order: sort_order || 0 });
    return db('door_colors').where('id', id).first();
  },
  async deleteDoorColor(id) {
    await db('door_materials').where('color_id', id).del();
    await db('door_colors').where('id', id).del();
  },
  async listDoorMaterials(seriesId, styleId) {
    return db('door_materials')
      .select('door_materials.*', 'door_colors.name as color_name')
      .join('door_colors', 'door_materials.color_id', 'door_colors.id')
      .where('door_materials.series_id', seriesId)
      .where('door_materials.style_id', styleId)
      .orderBy('door_colors.sort_order', 'asc');
  },
  async createDoorMaterial({ series_id, color_id, style_id, image_url, original_price, discount_price, specs }) {
    const [id] = await db('door_materials').insert({
      series_id, color_id, style_id,
      image_url: image_url || null,
      original_price: original_price ?? null,
      discount_price: discount_price ?? null,
      specs: specs || null,
    });
    return db('door_materials').where('id', id).first();
  },
  async deleteDoorMaterial(id) {
    await db('door_materials').where('id', id).del();
  },

  // ===== 灯具套餐 =====
  async listLightingPackages() {
    const pkgs = await db('lighting_packages').orderBy('sort_order', 'asc');
    for (const p of pkgs) {
      p.items = await db('lighting_package_items').where('package_id', p.id).orderBy('sort_order', 'asc');
    }
    return pkgs;
  },
  async getLightingPackage(id) {
    const p = await db('lighting_packages').where('id', id).first();
    if (!p) throw Object.assign(new Error('灯具套餐不存在'), { status: 404 });
    p.items = await db('lighting_package_items').where('package_id', id).orderBy('sort_order', 'asc');
    return p;
  },
  async createLightingPackage({ name, image_url, original_price, discount_price, sort_order, items }) {
    if (!name) throw Object.assign(new Error('套餐名称不能为空'), { status: 400 });
    const [id] = await db('lighting_packages').insert({
      name, image_url: image_url || null,
      original_price: original_price ?? null,
      discount_price: discount_price ?? null,
      sort_order: sort_order || 0,
    });
    if (items && items.length > 0) {
      await db('lighting_package_items').insert(items.map(it => ({ package_id: id, ...it })));
    }
    return db('lighting_packages').where('id', id).first();
  },
  async updateLightingPackage(id, fields) {
    const ex = await db('lighting_packages').where('id', id).first();
    if (!ex) throw Object.assign(new Error('灯具套餐不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.image_url !== undefined) u.image_url = fields.image_url;
    if (fields.original_price !== undefined) u.original_price = fields.original_price;
    if (fields.discount_price !== undefined) u.discount_price = fields.discount_price;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    await db('lighting_packages').where('id', id).update(u);
    if (fields.items !== undefined) {
      await db('lighting_package_items').where('package_id', id).del();
      if (fields.items.length > 0) {
        await db('lighting_package_items').insert(fields.items.map(it => ({ package_id: id, ...it })));
      }
    }
    return db('lighting_packages').where('id', id).first();
  },
  async deleteLightingPackage(id) {
    await db('lighting_package_items').where('package_id', id).del();
    await db('lighting_packages').where('id', id).del();
  },

  // ===== 草稿 =====
  async saveDraft(userId, { style_id, current_step, data }) {
    const ex = await db('selection_drafts').where('user_id', userId).first();
    if (ex) {
      await db('selection_drafts').where('user_id', userId).update({
        style_id: style_id ?? ex.style_id,
        current_step: current_step ?? ex.current_step,
        data: data ? JSON.stringify(data) : ex.data,
        updated_at: db.fn.now(),
      });
    } else {
      await db('selection_drafts').insert({
        user_id: userId, style_id,
        current_step: current_step || 1,
        data: data ? JSON.stringify(data) : '{}',
      });
    }
    return db('selection_drafts').where('user_id', userId).first();
  },
  async getDraft(userId) {
    const draft = await db('selection_drafts').where('user_id', userId).first();
    if (!draft) return null;
    if (draft.data) draft.data = JSON.parse(draft.data);
    return draft;
  },

  // ===== 选材单 =====
  async submitOrder({ user_id, style_id, owner_name, owner_phone, community, room_number, items }) {
    if (!user_id || !items) throw Object.assign(new Error('用户和选材项为必填'), { status: 400 });
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [{ count }] = await db('selection_orders').where('order_no', 'like', `${today}%`).count('* as count');
    const orderNo = today + String(count + 1).padStart(2, '0');

    const itemsArr = typeof items === 'string' ? JSON.parse(items) : items;
    let origTotal = 0, discTotal = 0;
    for (const it of itemsArr) {
      if (it.original_price) origTotal += Number(it.original_price);
      if (it.discount_price) discTotal += Number(it.discount_price);
    }

    const [id] = await db('selection_orders').insert({
      order_no: orderNo, user_id, style_id,
      owner_name: owner_name || null, owner_phone: owner_phone || null,
      community: community || null, room_number: room_number || null,
      original_total: origTotal, discount_total: discTotal,
      items: JSON.stringify(itemsArr),
      status: 'pending', submitted_at: db.fn.now(),
    });
    await db('selection_drafts').where('user_id', user_id).del();
    return db('selection_orders').where('id', id).first();
  },
  async listOrders(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;
    let q = db('selection_orders').select('selection_orders.*', 'styles.name as style_name')
      .leftJoin('styles', 'selection_orders.style_id', 'styles.id');
    if (filters.status) q = q.where('selection_orders.status', filters.status);
    if (filters.user_id) q = q.where('selection_orders.user_id', filters.user_id);
    const [{ count }] = await q.clone().count('* as count');
    const list = await q.orderBy('selection_orders.created_at', 'desc').offset(offset).limit(pageSize);
    return { list, pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) } };
  },
  async getOrder(id) {
    const order = await db('selection_orders')
      .select('selection_orders.*', 'styles.name as style_name')
      .leftJoin('styles', 'selection_orders.style_id', 'styles.id')
      .where('selection_orders.id', id).first();
    if (!order) throw Object.assign(new Error('选材单不存在'), { status: 404 });
    if (order.items) order.items = JSON.parse(order.items);
    return order;
  },
};

module.exports = styleWizardService;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/styleWizardService.js
git commit -m "feat(server): 风格选材完整 Service（风格+品类+门+灯具+草稿+订单）"
```

---

### Task 1.3: Service — 材料 CRUD（弹性属性 + 风格关联）

**Files:**
- Create: `server/src/services/styleWizardMaterialService.js`

- [ ] **Step 1: 编写材料 Service**

创建 `server/src/services/styleWizardMaterialService.js`：

```js
const db = require('../db/connection');

const styleWizardMaterialService = {
  async listMaterials(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;
    let q = db('style_materials')
      .select('style_materials.*', 'style_subcategories.name as subcategory_name', 'style_categories.name as category_name')
      .leftJoin('style_subcategories', 'style_materials.subcategory_id', 'style_subcategories.id')
      .leftJoin('style_categories', 'style_subcategories.category_id', 'style_categories.id');
    if (filters.subcategory_id) q = q.where('style_materials.subcategory_id', parseInt(filters.subcategory_id));
    if (filters.category_id) q = q.where('style_subcategories.category_id', parseInt(filters.category_id));
    if (filters.keyword) {
      q = q.where(function () {
        this.where('style_materials.name', 'like', `%${filters.keyword}%`)
          .orWhere('style_materials.brand', 'like', `%${filters.keyword}%`);
      });
    }
    const [{ count }] = await q.clone().count('* as count');
    const list = await q.orderBy('style_materials.sort_order', 'asc').offset(offset).limit(pageSize);
    return { list, pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) } };
  },

  async getMaterial(id) {
    const m = await db('style_materials')
      .select('style_materials.*', 'style_subcategories.name as subcategory_name')
      .leftJoin('style_subcategories', 'style_materials.subcategory_id', 'style_subcategories.id')
      .where('style_materials.id', id).first();
    if (!m) throw Object.assign(new Error('材料不存在'), { status: 404 });
    m.styles = await db('material_styles').select('styles.id', 'styles.name')
      .join('styles', 'material_styles.style_id', 'styles.id')
      .where('material_styles.material_id', id);
    return m;
  },

  async createMaterial(fields) {
    const { subcategory_id, name, model, brand, brand_logo, image_url,
      original_price, discount_price, specs, attributes, has_chaise,
      old_code, new_code, applicable_scopes, sort_order, style_ids } = fields;
    if (!subcategory_id || !name) throw Object.assign(new Error('子品类和名称为必填'), { status: 400 });
    const [id] = await db('style_materials').insert({
      subcategory_id, name, model: model || null, brand: brand || null,
      brand_logo: brand_logo || null, image_url: image_url || null,
      original_price: original_price ?? null, discount_price: discount_price ?? null,
      specs: specs || null,
      attributes: attributes ? JSON.stringify(attributes) : null,
      has_chaise: has_chaise ? 1 : 0,
      old_code: old_code || null, new_code: new_code || null,
      applicable_scopes: applicable_scopes ? JSON.stringify(applicable_scopes) : null,
      sort_order: sort_order || 0,
    });
    if (style_ids && style_ids.length > 0) {
      await db('material_styles').insert(style_ids.map(sid => ({ material_id: id, style_id: sid })));
    }
    return db('style_materials').where('id', id).first();
  },

  async updateMaterial(id, fields) {
    const ex = await db('style_materials').where('id', id).first();
    if (!ex) throw Object.assign(new Error('材料不存在'), { status: 404 });
    const u = {};
    ['name', 'model', 'brand', 'brand_logo', 'image_url', 'specs', 'old_code', 'new_code'].forEach(f => {
      if (fields[f] !== undefined) u[f] = fields[f];
    });
    if (fields.subcategory_id !== undefined) u.subcategory_id = fields.subcategory_id;
    if (fields.original_price !== undefined) u.original_price = fields.original_price;
    if (fields.discount_price !== undefined) u.discount_price = fields.discount_price;
    if (fields.has_chaise !== undefined) u.has_chaise = fields.has_chaise ? 1 : 0;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    if (fields.enabled !== undefined) u.enabled = fields.enabled;
    if (fields.attributes !== undefined) u.attributes = JSON.stringify(fields.attributes);
    if (fields.applicable_scopes !== undefined) u.applicable_scopes = JSON.stringify(fields.applicable_scopes);
    await db('style_materials').where('id', id).update(u);
    if (fields.style_ids !== undefined) {
      await db('material_styles').where('material_id', id).del();
      if (fields.style_ids.length > 0) {
        await db('material_styles').insert(fields.style_ids.map(sid => ({ material_id: id, style_id: sid })));
      }
    }
    return db('style_materials').where('id', id).first();
  },

  async deleteMaterial(id) {
    await db('material_styles').where('material_id', id).del();
    await db('style_materials').where('id', id).del();
  },

  async getMaterialsByStyleAndSubcategory(styleId, subcategoryId) {
    return db('style_materials')
      .select('style_materials.*')
      .join('material_styles', 'style_materials.id', 'material_styles.material_id')
      .where('material_styles.style_id', styleId)
      .where('style_materials.subcategory_id', subcategoryId)
      .where('style_materials.enabled', true)
      .orderBy('style_materials.sort_order', 'asc');
  },
};

module.exports = styleWizardMaterialService;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/styleWizardMaterialService.js
git commit -m "feat(server): 风格选材材料 Service（弹性属性+风格关联+按风格查询）"
```

---

### Task 1.4: 后端路由 — 全部 API

**Files:**
- Create: `server/src/routes/style-wizard.js`
- Modify: `server/src/app.js` — 注册路由

- [ ] **Step 1: 编写路由**

创建 `server/src/routes/style-wizard.js`：

```js
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const svc = require('../services/styleWizardService');
const matSvc = require('../services/styleWizardMaterialService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══ 公开接口 ═══
router.get('/styles', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listStyles() }); } catch (e) { next(e); }
});
router.get('/styles/:styleId/materials', async (req, res, next) => {
  try {
    const { subcategory_id } = req.query;
    if (!subcategory_id) return res.status(400).json({ error: { message: '缺少 subcategory_id', status: 400 } });
    res.json({ success: true, data: await matSvc.getMaterialsByStyleAndSubcategory(Number(req.params.styleId), Number(subcategory_id)) });
  } catch (e) { next(e); }
});
router.get('/style-categories', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listCategories() }); } catch (e) { next(e); }
});
router.get('/door-series', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listDoorSeries() }); } catch (e) { next(e); }
});
router.get('/door-materials', async (req, res, next) => {
  try {
    const { series_id, style_id } = req.query;
    if (!series_id || !style_id) return res.status(400).json({ error: { message: '缺少 series_id 或 style_id', status: 400 } });
    res.json({ success: true, data: await svc.listDoorMaterials(Number(series_id), Number(style_id)) });
  } catch (e) { next(e); }
});
router.get('/lighting-packages', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listLightingPackages() }); } catch (e) { next(e); }
});
router.get('/lighting-packages/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getLightingPackage(Number(req.params.id)) }); } catch (e) { next(e); }
});
router.post('/drafts', authenticate, async (req, res, next) => {
  try { res.json({ success: true, data: await svc.saveDraft(req.user.id, req.body) }); } catch (e) { next(e); }
});
router.get('/drafts', authenticate, async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getDraft(req.user.id) }); } catch (e) { next(e); }
});
router.post('/orders', authenticate, async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await svc.submitOrder({ ...req.body, user_id: req.user.id }) }); } catch (e) { next(e); }
});
router.get('/orders', authenticate, async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listOrders({ user_id: req.user.id }, req.query) }); } catch (e) { next(e); }
});

// ═══ 管理端 ═══
const admin = (fn) => [authenticate, requireRole('admin'), (req, res, next) => fn(req, res).catch(next)];

router.get('/admin/styles', ...admin(() => svc.listStyles(true).then(d => ({ success: true, data: d }))));
// 为了可读性，这里用 try-catch 包装器。实际文件直接展开写。

// 管理端便捷包装
function wrap(fn) {
  return [authenticate, requireRole('admin'), async (req, res, next) => {
    try { res.json(await fn(req)); } catch (e) { next(e); }
  }];
}
function wrap201(fn) {
  return [authenticate, requireRole('admin'), async (req, res, next) => {
    try { const data = await fn(req); res.status(201).json({ success: true, data: { id: data.id } }); } catch (e) { next(e); }
  }];
}
const ok = (data) => ({ success: true, data });

// 风格
router.get('/admin/styles', ...wrap(() => svc.listStyles(true).then(ok)));
router.get('/admin/styles/:id', ...wrap(req => svc.getStyle(Number(req.params.id)).then(ok)));
router.post('/admin/styles', ...wrap201(req => svc.createStyle(req.body)));
router.put('/admin/styles/:id', ...wrap(req => svc.updateStyle(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/styles/:id', ...wrap(req => svc.deleteStyle(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 品类+子品类
router.get('/admin/style-categories', ...wrap(() => svc.listCategories().then(ok)));
router.post('/admin/subcategories', ...wrap201(req => svc.createSubcategory(req.body)));
router.put('/admin/subcategories/:id', ...wrap(req => svc.updateSubcategory(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/subcategories/:id', ...wrap(req => svc.deleteSubcategory(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 材料
router.get('/admin/style-materials', ...wrap(req => matSvc.listMaterials(
  { subcategory_id: req.query.subcategory_id, category_id: req.query.category_id, keyword: req.query.keyword },
  { page: req.query.page, page_size: req.query.page_size }
).then(ok)));
router.get('/admin/style-materials/:id', ...wrap(req => matSvc.getMaterial(Number(req.params.id)).then(ok)));
router.post('/admin/style-materials', ...wrap201(req => matSvc.createMaterial(req.body)));
router.put('/admin/style-materials/:id', ...wrap(req => matSvc.updateMaterial(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/style-materials/:id', ...wrap(req => matSvc.deleteMaterial(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 门系列+颜色+门材料
router.get('/admin/door-series', ...wrap(() => svc.listDoorSeries().then(ok)));
router.get('/admin/door-series/:id', ...wrap(req => svc.getDoorSeries(Number(req.params.id)).then(ok)));
router.post('/admin/door-series', ...wrap201(req => svc.createDoorSeries(req.body)));
router.put('/admin/door-series/:id', ...wrap(req => svc.updateDoorSeries(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/door-series/:id', ...wrap(req => svc.deleteDoorSeries(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));
router.get('/admin/door-series/:seriesId/colors', ...wrap(req => svc.listDoorColors(Number(req.params.seriesId)).then(ok)));
router.post('/admin/door-series/:seriesId/colors', ...wrap201(req => svc.createDoorColor({ series_id: Number(req.params.seriesId), ...req.body })));
router.delete('/admin/door-colors/:id', ...wrap(req => svc.deleteDoorColor(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));
router.get('/admin/door-materials', ...wrap(req => svc.listDoorMaterials(Number(req.query.series_id), Number(req.query.style_id)).then(ok)));
router.post('/admin/door-materials', ...wrap201(req => svc.createDoorMaterial(req.body)));
router.delete('/admin/door-materials/:id', ...wrap(req => svc.deleteDoorMaterial(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 灯具套餐
router.get('/admin/lighting-packages', ...wrap(() => svc.listLightingPackages().then(ok)));
router.get('/admin/lighting-packages/:id', ...wrap(req => svc.getLightingPackage(Number(req.params.id)).then(ok)));
router.post('/admin/lighting-packages', ...wrap201(req => svc.createLightingPackage(req.body)));
router.put('/admin/lighting-packages/:id', ...wrap(req => svc.updateLightingPackage(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/lighting-packages/:id', ...wrap(req => svc.deleteLightingPackage(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 选材单管理
router.get('/admin/orders', ...wrap(req => svc.listOrders({ status: req.query.status }, { page: req.query.page, page_size: req.query.page_size }).then(ok)));
router.get('/admin/orders/:id', ...wrap(req => svc.getOrder(Number(req.params.id)).then(ok)));
router.put('/admin/orders/:id', ...wrap(async (req) => {
  const { status, designer_id, supervisor_id } = req.body;
  const u = {};
  if (status) u.status = status;
  if (designer_id !== undefined) u.designer_id = designer_id;
  if (supervisor_id !== undefined) u.supervisor_id = supervisor_id;
  await db('selection_orders').where('id', Number(req.params.id)).update(u);
  return { success: true, message: '已更新' };
})));

module.exports = router;
```

- [ ] **Step 2: 注册到 app.js**

在 `server/src/app.js` 顶部新增 import：

```js
const styleWizardRoutes = require('./routes/style-wizard');
```

在 `app.use('/api/v1', reportsRoutes);` 后新增：

```js
app.use('/api/v1', styleWizardRoutes);
```

- [ ] **Step 3: 验证路由**

```bash
cd /Users/lyf/Desktop/ZHFPro/server && node -e "
const app = require('./src/app');
const srv = app.listen(3001, () => {
  require('http').get('http://localhost:3001/api/v1/styles', res => {
    let d=''; res.on('data',c=>d+=c); res.on('end',()=>{console.log(d);srv.close()});
  });
});"
```

Expected: `{"success":true,"data":[]}`

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/style-wizard.js server/src/app.js
git commit -m "feat(server): 风格选材全部 API 路由注册"
```

---

## Phase 2: 管理后台 — 路由 + 侧边栏 + 6 页面

### Task 2.1: 路由注册 + 侧边栏分组 + 面包屑

**Files:**
- Modify: `admin/src/router/index.jsx`
- Modify: `admin/src/components/Sidebar.jsx`
- Modify: `admin/src/components/HeaderBar.jsx`
- Create: `admin/src/pages/StyleWizardStyles.jsx` 等 6 个占位页面

- [ ] **Step 1: 修改路由**

在 `admin/src/router/index.jsx` 顶部新增 imports：

```js
import StyleWizardStyles from '../pages/StyleWizardStyles';
import StyleWizardCategories from '../pages/StyleWizardCategories';
import StyleWizardMaterials from '../pages/StyleWizardMaterials';
import StyleWizardDoors from '../pages/StyleWizardDoors';
import StyleWizardLighting from '../pages/StyleWizardLighting';
import StyleWizardOrders from '../pages/StyleWizardOrders';
```

在 children 数组中 `{ path: 'reports', ... }` 之前新增：

```js
{ path: 'style-wizard/styles', element: <StyleWizardStyles /> },
{ path: 'style-wizard/categories', element: <StyleWizardCategories /> },
{ path: 'style-wizard/materials', element: <StyleWizardMaterials /> },
{ path: 'style-wizard/doors', element: <StyleWizardDoors /> },
{ path: 'style-wizard/lighting', element: <StyleWizardLighting /> },
{ path: 'style-wizard/orders', element: <StyleWizardOrders /> },
```

- [ ] **Step 2: 修改侧边栏**

在 `admin/src/components/Sidebar.jsx` 的 `MENU_GROUPS` 数组中，在 `materials` 分组之后新增：

```js
{
  key: 'style-wizard',
  label: '风格选材',
  colorKey: 'marketing',
  icon: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  items: [
    { path: '/style-wizard/styles', label: '风格管理' },
    { path: '/style-wizard/categories', label: '品类管理' },
    { path: '/style-wizard/materials', label: '材料管理' },
    { path: '/style-wizard/doors', label: '门系列管理' },
    { path: '/style-wizard/lighting', label: '灯具套餐' },
    { path: '/style-wizard/orders', label: '选材单管理' },
  ],
},
```

在 `ITEM_ICONS` 对象中新增对应图标（SVG 15px，模式同现有图标）。

- [ ] **Step 3: 修改面包屑**

在 `admin/src/components/HeaderBar.jsx` 的 `BREADCRUMB_MAP` 中新增：

```js
'style-wizard': '风格选材',
styles: '风格管理',
categories: '品类管理',
materials: '材料管理',
doors: '门系列管理',
lighting: '灯具套餐',
orders: '选材单管理',
```

- [ ] **Step 4: 创建占位页面并验证构建**

```bash
cd /Users/lyf/Desktop/ZHFPro/admin && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add admin/src/router/index.jsx admin/src/components/Sidebar.jsx admin/src/components/HeaderBar.jsx admin/src/pages/StyleWizard*.jsx
git commit -m "feat(admin): 风格选材路由+侧边栏+面包屑+占位页面"
```

---

### Task 2.2-2.3: 6 个管理页面

以下页面遵循现有 admin 页面模板（表格+弹窗 CRUD+ConfirmDialog），实施时逐文件编写：

| 页面 | 关键功能 | 差异点 |
|------|---------|--------|
| **StyleWizardStyles** | 风格列表+新增/编辑弹窗（名称/封面/描述/排序/启用） | 同现有 Works.jsx 模式 |
| **StyleWizardCategories** | 品类列表（7条预置）+子品类管理 | 嵌套表格+内联编辑子品类 |
| **StyleWizardMaterials** | 材料列表（品类/子品类筛选+关键词搜索）+弹窗 CRUD | 弹窗根据子品类的 attribute_template 动态渲染属性字段；风格多选 |
| **StyleWizardDoors** | 门系列列表+颜色管理+门材料组合 | 系列→颜色两级；门材料=系列×颜色×风格 |
| **StyleWizardLighting** | 灯具套餐列表+弹窗（套餐信息+5件明细子表单） | 嵌套子表单 |
| **StyleWizardOrders** | 选材单列表（状态筛选）+详情（JSON items展开+价格） | 只读详情为主 |

每个页面实施后独立 commit。

---

## Phase 3: 小程序 — 图标 + Tab + 页面 + 组件

### Task 3.1: SVG 图标系统（~35 个）

**Files:**
- Create: `miniprogram/assets/icons/*.svg`

- [ ] **Step 1: 绘制全部 SVG 图标**

在 `miniprogram/assets/icons/` 下创建约 35 个 SVG 图标。统一规范：viewBox="0 0 24 24"、stroke-width="1.5"、stroke-linecap/join="round"。

图标清单：
- **步骤类**(7): step-tile, step-door, step-bath, step-custom, step-sofa, step-furniture, step-lighting
- **序号类**(7): num-1 ~ num-7（圆底+数字，香槟金填充）
- **功能类**(9): check, arrow-right, arrow-left, close, chevron-left, chevron-right, chevron-down, zoom-in, skip, edit
- **状态类**(3): step-done, step-active, step-pending
- **徽标类**(4): badge-cabinet-body, badge-cabinet-door, badge-kitchen-body, badge-kitchen-door
- **通用**(3): selected-mark, tag-price, tab-selection

> 实施时逐一绘制并验证视觉效果。

- [ ] **Step 2: Commit**

```bash
git add miniprogram/assets/icons/
git commit -m "feat(miniprogram): ~35 个 SVG 图标（零 emoji，微信审核合规）"
```

---

### Task 3.2: Tab 配置 + API 函数

**Files:**
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/utils/api.js`

- [ ] **Step 1: 修改 app.json**

在 `tabBar.list` 中新增第 5 个 tab（放在「在线选材」之后、「我的」之前）：

```json
{
  "pagePath": "pages/style-select/index",
  "text": "风格选材",
  "iconPath": "images/tab-style-wizard.png",
  "selectedIconPath": "images/tab-style-wizard-active.png"
}
```

在 `pages` 数组中注册 4 个新页面路径：
```json
"pages/style-select/index",
"pages/style-wizard/index",
"pages/style-summary/index",
"pages/style-my-selections/index"
```

- [ ] **Step 2: 新增 API 函数**

在 `miniprogram/utils/api.js` 末尾追加风格选材 API：

```js
function getStyles() { return http.get('/styles', {}, { auth: false, silent: true }); }
function getStyleCategories() { return http.get('/style-categories', {}, { auth: false, silent: true }); }
function getStyleMaterials(styleId, subcategoryId) { return http.get(`/styles/${styleId}/materials`, { subcategory_id: subcategoryId }, { auth: false }); }
function getDoorSeries() { return http.get('/door-series', {}, { auth: false, silent: true }); }
function getDoorMaterials(seriesId, styleId) { return http.get('/door-materials', { series_id: seriesId, style_id: styleId }, { auth: false }); }
function getLightingPackages() { return http.get('/lighting-packages', {}, { auth: false, silent: true }); }
function getLightingPackageDetail(id) { return http.get(`/lighting-packages/${id}`, {}, { auth: false }); }
function saveDraft(data) { return http.post('/drafts', data, { auth: true }); }
function getDraft() { return http.get('/drafts', {}, { auth: true, silent: true }); }
function submitStyleOrder(data) { return http.post('/orders', data, { auth: true }); }
function getMyStyleOrders(page = 1) { return http.get('/orders', { page }, { auth: true }); }
```

并在 `module.exports` 中导出这些函数。

- [ ] **Step 3: 创建 tab 图标（临时 PNG 占位）**

```bash
cp miniprogram/images/tab-material.png miniprogram/images/tab-style-wizard.png
cp miniprogram/images/tab-material-active.png miniprogram/images/tab-style-wizard-active.png
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/app.json miniprogram/utils/api.js miniprogram/images/tab-style-wizard*.png
git commit -m "feat(miniprogram): 风格选材 tab+API 函数"
```

---

### Task 3.3: 手风琴卡片 + 步骤进度条组件

**Files:**
- Create: `miniprogram/components/accordion-card/` (4 files)
- Create: `miniprogram/components/progress-steps/` (4 files)

- [ ] **Step 1: 手风琴卡片组件**

`miniprogram/components/accordion-card/index.js`：
```js
Component({
  properties: {
    title: { type: String }, number: { type: Number, value: 1 },
    selectedLabel: { type: String, value: '' },
    expanded: { type: Boolean, value: false },
    completed: { type: Boolean, value: false },
  },
  methods: { onToggle() { this.triggerEvent('toggle'); } },
});
```

`miniprogram/components/accordion-card/index.wxml`：
```xml
<view class="card {{expanded?'expanded':''}} {{completed?'completed':''}}">
  <view class="header" bindtap="onToggle">
    <view class="h-left">
      <image src="/assets/icons/num-{{number}}.svg" class="num-icon" />
      <text class="h-title">{{title}}</text>
    </view>
    <view class="h-right">
      <text wx:if="{{completed && !expanded}}" class="h-done">{{selectedLabel}}</text>
      <text wx:elif="{{!completed && !expanded}}" class="h-pending">请选择</text>
      <image src="/assets/icons/chevron-down.svg" class="chevron {{expanded?'rotated':''}}" />
    </view>
  </view>
  <view class="body" wx:if="{{expanded}}"><slot /></view>
</view>
```

`miniprogram/components/accordion-card/index.wxss`：
```css
.card { margin-bottom:16rpx; border-radius:16rpx; background:#fff; overflow:hidden; }
.header { display:flex; align-items:center; justify-content:space-between; padding:24rpx; min-height:88rpx; }
.h-left { display:flex; align-items:center; gap:16rpx; }
.num-icon { width:48rpx; height:48rpx; }
.h-title { font-size:30rpx; font-weight:600; color:#1A1A1A; }
.h-done { font-size:24rpx; color:#C9A96E; }
.h-pending { font-size:24rpx; color:#D1D5DB; }
.chevron { width:32rpx; height:32rpx; transition:transform .3s; }
.chevron.rotated { transform:rotate(180deg); }
.body { padding:0 24rpx 24rpx; }
.completed .header { border-left:4rpx solid #C9A96E; }
```

- [ ] **Step 2: 步骤进度条组件**

`miniprogram/components/progress-steps/index.js`：
```js
Component({
  properties: {
    steps: { type: Array, value: [] },
    current: { type: Number, value: 1 },
  },
});
```

`miniprogram/components/progress-steps/index.wxml`：
```xml
<view class="bar">
  <view class="row">
    <block wx:for="{{steps}}" wx:key="index">
      <view class="step">
        <image wx:if="{{index<current-1}}" src="/assets/icons/step-done.svg" class="dot" />
        <image wx:elif="{{index===current-1}}" src="/assets/icons/step-active.svg" class="dot" />
        <image wx:else src="/assets/icons/step-pending.svg" class="dot" />
        <text class="lbl {{index<current?'lbl-active':''}}">{{item.label}}</text>
      </view>
      <view wx:if="{{index<steps.length-1}}" class="line {{index<current-1?'line-done':''}}"></view>
    </block>
  </view>
</view>
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/components/accordion-card/ miniprogram/components/progress-steps/
git commit -m "feat(miniprogram): 手风琴卡片+步骤进度条组件"
```

---

### Task 3.4: 风格选择页（杂志画册式）

**Files:**
- Create: `miniprogram/pages/style-select/index.{js,wxml,wxss,json}`

- [ ] **Step 1: 编写页面**

`index.js` — onReady 门控模式，加载风格列表，选中交互，点击「开始选材」跳转向导页。
`index.wxml` — Editorial 标题带 + 竖排风格卡片（80% 大图+渐变叠底+卡片微重叠 -16rpx）+ 底部固定按钮。
`index.wxss` — 暖白奢华配色，卡片 selected 态金边+微上浮。

- [ ] **Step 2: Commit**

```bash
git add miniprogram/pages/style-select/
git commit -m "feat(miniprogram): 风格选择页（杂志画册式）"
```

---

### Task 3.5: 七步向导页 + Lightbox 组件

**Files:**
- Create: `miniprogram/pages/style-wizard/index.{js,wxml,wxss,json}`
- Create: `miniprogram/components/image-lightbox/` (4 files)

- [ ] **Step 1: 向导页**

接收 `style_id` + `step`(1-7)，根据 step 渲染对应品类的手风琴卡片列表。每个子板块为 accordion-card 组件，展开后显示 2 列网格产品卡片。底部「上一步」「下一步」按钮。每次选择后自动保存草稿。

- [ ] **Step 2: Lightbox 组件**

全屏遮罩+大图展示，左右滑动切换同类目图片，底部「选中此项」按钮，顶部进度显示（"3/8"）。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/style-wizard/ miniprogram/components/image-lightbox/
git commit -m "feat(miniprogram): 七步向导页+Lightbox组件"
```

---

### Task 3.6: 总结提交页 + 我的选材页

**Files:**
- Create: `miniprogram/pages/style-summary/index.{js,wxml,wxss,json}`
- Create: `miniprogram/pages/style-my-selections/index.{js,wxml,wxss,json}`

- [ ] **Step 1: 总结提交页**

7 步已选项分组展示（小图+名称+价格），价格汇总（原价合计划线→优惠价合计大字），业主信息表单（姓名/电话/小区/房号），提交按钮。

- [ ] **Step 2: 我的选材页**

选材单列表 + 状态标签（pending/contacted/completed）。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/style-summary/ miniprogram/pages/style-my-selections/
git commit -m "feat(miniprogram): 总结提交页+我的选材页"
```

---

## Phase 4: 联调验证

### Task 4.1: 端到端验证

- [ ] **Step 1: 后端 API 全面测试**

用 curl 测试全部公开+管理 API，确保 200/201 响应。

- [ ] **Step 2: 管理后台录入测试**

录入 1 个完整风格的全品类数据，验证弹性属性表单可用性。

- [ ] **Step 3: 小程序真机闭环**

走通：选风格→七步全选（含跳过/回改/断点续选/放大态选中）→总结→提交→后台看单。

- [ ] **Step 4: 视觉验收**

调用 design-check 审查配色/间距/动效是否符合暖白奢华规范，确认零 emoji。

- [ ] **Step 5: 最终 Commit**

```bash
git add -A && git commit -m "feat: 风格选材向导 MVP 完成 — 全栈闭环"
```

---

## 实施顺序

```
Phase 1: Task 1.1 → 1.2 → 1.3 → 1.4（后端完成）
         ↓
Phase 2: Task 2.1 → 2.2 → 2.3 各页面（管理后台完成）
         ↓
Phase 3: Task 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6（小程序完成）
         ↓
Phase 4: Task 4.1（联调验证）
```

每完成一个 Task 独立 commit。Phase 1 必须先完成（Phase 2/3 依赖 API）。
