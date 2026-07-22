/**
 * 020 — 瓷砖品牌 Logo 已不再使用，从 style_materials 表移除
 * 存量图片文件保留不删（防止被其他地方引用），仅删列
 */
exports.up = (knex) =>
  knex.schema.table('style_materials', (table) => {
    table.dropColumn('brand_logo');
  });

exports.down = (knex) =>
  knex.schema.table('style_materials', (table) => {
    table.string('brand_logo').nullable();
  });
