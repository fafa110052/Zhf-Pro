/**
 * 风格选材向导 — 7 品类 + 20 子品类种子数据
 *
 * 幂等：style_categories 已有数据则整体跳过（不清空——生产环境可能有后台编辑过的数据）。
 * 显式指定 id，保证 style_subcategories.category_id 外键引用成立。
 *
 * 运行方式：npx knex seed:run --specific=005_style_wizard_categories.js
 */

const categories = [
  { id: 1, name: '瓷砖选材', page_number: 1, sort_order: 0 },
  { id: 2, name: '室内木门', page_number: 2, sort_order: 0 },
  { id: 3, name: '卫浴选材', page_number: 3, sort_order: 0 },
  { id: 4, name: '装饰定制', page_number: 4, sort_order: 0 },
  { id: 5, name: '沙发选材', page_number: 5, sort_order: 0 },
  { id: 6, name: '家具选材', page_number: 6, sort_order: 0 },
  { id: 7, name: '装饰灯具', page_number: 7, sort_order: 0 },
];

const subcategories = [
  { id: 1, category_id: 1, name: '客餐厅/房间/阳台地板砖', sort_order: 1, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 2, category_id: 1, name: '厨房/卫生间墙砖', sort_order: 2, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 3, category_id: 1, name: '卫生间地板砖', sort_order: 3, layout_type: 'image_left_text_right', columns: 2 },
  { id: 4, category_id: 2, name: '门系列选择', sort_order: 1, layout_type: 'color_swatch', columns: 1 },
  { id: 5, category_id: 3, name: '浴室柜组合', sort_order: 1, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 6, category_id: 3, name: '卫生间门', sort_order: 2, layout_type: 'image_top_text_bottom', columns: 1 },
  { id: 7, category_id: 3, name: '马桶', sort_order: 3, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 8, category_id: 3, name: '蹲厕', sort_order: 4, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 9, category_id: 3, name: '水箱', sort_order: 5, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 10, category_id: 3, name: '花洒', sort_order: 6, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 11, category_id: 3, name: '水龙头', sort_order: 7, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 12, category_id: 4, name: '柜体/柜门颜色', sort_order: 1, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 13, category_id: 4, name: '橱柜台面石', sort_order: 2, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 14, category_id: 5, name: '沙发', sort_order: 1, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 15, category_id: 6, name: '床', sort_order: 1, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 16, category_id: 6, name: '餐桌餐椅', sort_order: 2, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 17, category_id: 6, name: '电视柜', sort_order: 3, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 18, category_id: 6, name: '茶几', sort_order: 4, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 19, category_id: 6, name: '床头柜', sort_order: 5, layout_type: 'image_top_text_bottom', columns: 2 },
  { id: 20, category_id: 7, name: '灯具套餐', sort_order: 1, layout_type: 'package_card', columns: 1 },
];

exports.seed = async function (knex) {
  const row = await knex('style_categories').count('* as c').first();
  if (Number(row.c) > 0) {
    console.log(`  ✓ style_categories 已有 ${row.c} 条数据，跳过种子（幂等保护）`);
    return;
  }
  await knex('style_categories').insert(categories);
  await knex('style_subcategories').insert(subcategories);
  console.log('  ✓ 已插入 7 个品类 + 20 个子品类');
};
