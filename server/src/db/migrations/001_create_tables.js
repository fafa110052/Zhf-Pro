exports.up = function (knex) {
  // ========== 建表顺序：先建被引用的表，再建引用它们的表 ==========

  // 1. designers — 统一用户表（设计师 + 管理员）
  return knex.schema
    .createTable('designers', (table) => {
      table.increments('id').primary();
      table.string('openid', 64).unique().nullable();
      table.string('username', 32).unique().nullable();
      table.string('password_hash', 128).nullable();
      table.string('name', 32).notNullable();
      table.string('avatar_url', 512);
      table.string('pending_avatar_url', 512).nullable();
      table.string('avatar_review_status', 16).defaultTo(null);
      table.string('phone', 20).unique().notNullable();
      table.integer('years_of_exp').defaultTo(0);
      table.text('bio');
      table.string('role', 16).defaultTo('designer');   // designer | admin
      table.string('status', 8).defaultTo('active');     // active | inactive
      table.integer('is_bound').defaultTo(0);            // 微信绑定状态 0/1
      table.integer('login_attempts').defaultTo(0);
      table.datetime('locked_until').nullable();
      table.timestamps(true, true);                      // created_at + updated_at
    })

    // 2. categories — 分类字典（户型/部位/风格，由B端管理后台动态维护）
    .createTable('categories', (table) => {
      table.increments('id').primary();
      table.string('type', 16).notNullable();            // house_type | area | style
      table.string('name', 32).notNullable();            // 分类名称
      table.integer('sort_order').defaultTo(0);
      table.integer('is_active').defaultTo(1);           // 1=启用 0=禁用
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // 3. image_library — 全局图片库（先于 cases 建，因为 case_images 引用它）
    .createTable('image_library', (table) => {
      table.increments('id').primary();
      table.string('image_url', 512).notNullable();
      table.string('thumb_url', 512);
      table.string('original_name', 256);
      table.integer('file_size');
      table.integer('uploaded_by').references('id').inTable('designers');
      table.integer('reference_count').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // 4. cases — 装修作品
    .createTable('cases', (table) => {
      table.increments('id').primary();
      table.string('title', 128).notNullable();
      table.text('description');
      // 三维分类 FK
      table.integer('house_type_id').references('id').inTable('categories');
      table.integer('area_category_id').references('id').inTable('categories');
      table.integer('style_category_id').references('id').inTable('categories');
      table.decimal('area_sqm', 8, 2);
      table.integer('budget_min');                        // 造价下限（万元）
      table.integer('budget_max');                        // 造价上限（万元）
      table.date('completion_date');
      table.integer('designer_id').notNullable().references('id').inTable('designers');
      table.string('cover_image', 512);
      // 审核状态流转: draft → pending → approved / rejected → archived
      table.string('review_status', 16).defaultTo('draft');
      table.text('reject_reason');
      table.integer('reviewed_by').references('id').inTable('designers');
      table.datetime('reviewed_at');
      table.integer('is_hot').defaultTo(0);               // 热门推荐标记
      table.integer('view_count').defaultTo(0);
      table.timestamps(true, true);

      // 索引
      table.index('review_status');
      table.index('house_type_id');
      table.index('area_category_id');
      table.index('style_category_id');
      table.index('designer_id');
      table.index(['is_hot', 'review_status']);
      table.index('created_at');
    })

    // 5. case_images — 作品图片
    .createTable('case_images', (table) => {
      table.increments('id').primary();
      table.integer('case_id').notNullable().references('id').inTable('cases').onDelete('CASCADE');
      table.integer('library_image_id').references('id').inTable('image_library');
      table.string('image_url', 512).notNullable();
      table.string('thumb_url', 512);
      table.integer('sort_order').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // 6. homepage_config — 首页配置（轮播图 + 热门推荐）
    .createTable('homepage_config', (table) => {
      table.increments('id').primary();
      table.string('config_type', 16).notNullable();      // banner | hot_works
      table.text('config_value').notNullable();            // JSON 配置值
      table.integer('sort_order').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
  // 按外键依赖的逆序删除
  return knex.schema
    .dropTableIfExists('case_images')
    .dropTableIfExists('cases')
    .dropTableIfExists('image_library')
    .dropTableIfExists('homepage_config')
    .dropTableIfExists('categories')
    .dropTableIfExists('designers');
};
