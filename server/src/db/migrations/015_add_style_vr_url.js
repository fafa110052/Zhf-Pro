/**
 * 015 — 风格表增加 VR 看房链接
 * vr_url 非空时，小程序风格选择页卡片显示"VR看房"按钮，跳转全景720查看
 */
exports.up = function (knex) {
  return knex.schema.alterTable('styles', (table) => {
    table.text('vr_url').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('styles', (table) => {
    table.dropColumn('vr_url');
  });
};
