/**
 * 013 — 作品表增加酷家乐 VR 链接
 * vr_url 非空时，小程序作品详情页显示"VR看房"悬浮按钮
 */
exports.up = function (knex) {
  return knex.schema.alterTable('cases', (table) => {
    table.text('vr_url').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('cases', (table) => {
    table.dropColumn('vr_url');
  });
};
