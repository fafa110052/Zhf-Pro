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
