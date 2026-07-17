/**
 * 016 — 品类表增加步骤封面图
 * cover_image 非空时，小程序向导页该步骤顶部显示品类头图（上滑卡片覆盖+虚化交互）
 */
exports.up = function (knex) {
  return knex.schema.alterTable('style_categories', (table) => {
    table.text('cover_image').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('style_categories', (table) => {
    table.dropColumn('cover_image');
  });
};
