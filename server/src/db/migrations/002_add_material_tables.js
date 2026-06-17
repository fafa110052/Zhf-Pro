exports.up = function (knex) {
  // ═══ V1.1 新增表：楼盘 + 材料 + 选材申请 ═══
  // 建表顺序：先建被引用的表，再建引用它们的表

  // 1. 人员表新增字段（ALTER TABLE designers）
  return knex.schema
    .alterTable('designers', (table) => {
      table.string('personnel_type', 16).defaultTo('designer');   // designer | supervisor
      table.string('employee_id', 32).unique().nullable();         // 工号
    })

    // 2. properties — 楼盘表
    .createTable('properties', (table) => {
      table.increments('id').primary();
      table.string('name', 64).notNullable();                      // 楼盘名称
      table.string('address', 256).notNullable();                  // 详细地址
      table.string('cover_image', 512);                            // 封面图
      table.string('property_code', 2).unique().notNullable();     // 小区编号（2位数字）
      table.integer('material_enabled').defaultTo(0);              // 选材功能开关
      table.timestamps(true, true);                                // created_at + updated_at

      table.index('property_code');
      table.index('material_enabled');
    })

    // 3. material_categories — 材料分类表（全局共享）
    .createTable('material_categories', (table) => {
      table.increments('id').primary();
      table.string('name', 32).notNullable();                      // 分类名称（地板/墙面/卫浴…）
      table.integer('sort_order').defaultTo(0);                    // 排序
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('sort_order');
    })

    // 4. materials — 材料表
    .createTable('materials', (table) => {
      table.increments('id').primary();
      table.integer('category_id').notNullable()
        .references('id').inTable('material_categories');         // FK → material_categories
      table.integer('property_id').notNullable()
        .references('id').inTable('properties');                   // FK → properties
      table.string('name', 128).notNullable();                     // 材料名称
      table.string('brand', 64).notNullable();                     // 品牌
      table.string('image_url', 512);                              // 材料图片
      table.decimal('unit_price', 10, 2).notNullable();            // 单价（元）
      table.string('price_unit', 8).defaultTo('/㎡');              // 计价单位 /㎡ 或 /件
      table.string('description', 256);                            // 简短描述
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('category_id');
      table.index('property_id');
      table.index(['property_id', 'category_id']);
    })

    // 5. material_orders — 选材申请表
    .createTable('material_orders', (table) => {
      table.increments('id').primary();
      table.string('order_no', 10).unique().notNullable();          // 10位订单号
      table.integer('property_id').notNullable()
        .references('id').inTable('properties');                   // FK → properties
      table.string('room_number', 64).notNullable();               // 房号
      table.integer('user_id').notNullable()
        .references('id').inTable('designers');                    // FK → designers（申请人）
      table.string('applicant_name', 32).notNullable();            // 联系人姓名
      table.string('applicant_phone', 20).notNullable();           // 联系电话
      table.string('remark', 200);                                 // 备注
      table.string('status', 16).defaultTo('pending');             // pending|approved|rejected|completed
      table.integer('designer_id')
        .references('id').inTable('designers');                    // FK → designers（分配设计师）
      table.integer('supervisor_id')
        .references('id').inTable('designers');                    // FK → designers（分配监理）
      table.integer('reviewed_by')
        .references('id').inTable('designers');                    // FK → designers（审核人）
      table.datetime('reviewed_at');                               // 审核时间
      table.text('reject_reason');                                 // 驳回原因
      table.timestamps(true, true);                                // created_at + updated_at

      table.index('order_no');
      table.index('property_id');
      table.index('status');
      table.index('user_id');
      table.index('created_at');
    })

    // 6. material_order_items — 选材材料关联表
    .createTable('material_order_items', (table) => {
      table.increments('id').primary();
      table.integer('order_id').notNullable()
        .references('id').inTable('material_orders')
        .onDelete('CASCADE');                                      // FK → material_orders
      table.integer('material_id').notNullable()
        .references('id').inTable('materials');                    // FK → materials
      table.integer('category_id')
        .references('id').inTable('material_categories');          // 冗余：材料所属分类
      table.decimal('price_snapshot', 10, 2).notNullable();        // 提交时单价快照
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('order_id');
      table.index('material_id');
    })

    // 7. material_order_logs — 操作日志表
    .createTable('material_order_logs', (table) => {
      table.increments('id').primary();
      table.integer('order_id').notNullable()
        .references('id').inTable('material_orders')
        .onDelete('CASCADE');                                      // FK → material_orders
      table.string('action', 32).notNullable();                    // submit|approve|reject|complete|assign
      table.integer('operator_id')
        .references('id').inTable('designers');                    // FK → designers（操作人）
      table.text('detail');                                        // 操作详情（JSON 或文本）
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('order_id');
    });
};

exports.down = function (knex) {
  // 按外键依赖的逆序删除
  return knex.schema
    .dropTableIfExists('material_order_logs')
    .dropTableIfExists('material_order_items')
    .dropTableIfExists('material_orders')
    .dropTableIfExists('materials')
    .dropTableIfExists('material_categories')
    .dropTableIfExists('properties')
    .alterTable('designers', (table) => {
      table.dropColumn('personnel_type');
      table.dropColumn('employee_id');
    });
};
