/**
 * 017 — 新增通用门颜色库（独立于系列）
 *
 * door_color_library  通用颜色库（名称+色块图），供各系列从中挑选
 *
 * 存量 door_colors 去重后入库，系列颜色关联不变。
 */

exports.up = function (knex) {
  return knex.schema
    .createTable('door_color_library', (table) => {
      table.increments('id');
      table.string('name', 32).notNullable();
      table.string('image_url').notNullable().comment('色块图');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    })
    .then(() =>
      // 将存量 door_colors 按名称去重后汇入颜色库（保留最小 id 的 image_url）
      knex.raw(`
        INSERT INTO door_color_library (name, image_url, sort_order, created_at, updated_at)
        SELECT name, MIN(COALESCE(image_url, '')), MIN(sort_order), datetime('now'), datetime('now')
        FROM door_colors
        GROUP BY name
      `)
    )
    .then(() =>
      // 新模型下门材料图片取自颜色色块图：补齐存量缺图的门材料
      knex.raw(`
        UPDATE door_materials
        SET image_url = (SELECT image_url FROM door_colors WHERE door_colors.id = door_materials.color_id)
        WHERE image_url IS NULL
      `)
    );
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('door_color_library');
};
