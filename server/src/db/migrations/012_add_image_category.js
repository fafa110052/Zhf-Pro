// server/src/db/migrations/012_add_image_category.js
/**
 * 012 — image_library 增加业务分类列
 *
 * 图片按 works/avatars/properties/materials/construction/banners 分类存储；
 * 老数据默认 misc（未分类），Phase 1 不迁移存量。
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('image_library', (table) => {
    table.string('category', 24).notNullable().defaultTo('misc')
      .comment('业务分类：works/avatars/properties/materials/construction/banners/misc');
    table.index('category');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('image_library', (table) => {
    table.dropIndex('category');
    table.dropColumn('category');
  });
};
