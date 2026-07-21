/**
 * 019 — 合并沙发选材到家具选材
 *
 * 1. 将沙发子品类 (id=14) 从 category 5 移到 category 6，sort_order=0
 * 2. 家具原有子品类 sort_order 顺延
 * 3. 删除沙发选材品类 (id=5)
 * 4. 重新编号 page_number：6→5（家具选材），7→6（装饰灯具）
 */
exports.up = async function (knex) {
  // 1. 移动沙发子品类到家具品类
  await knex('style_subcategories')
    .where({ id: 14 })
    .update({ category_id: 6, sort_order: 0 });

  // 2. 家具原有子品类 sort_order 顺延
  await knex('style_subcategories')
    .where({ category_id: 6 })
    .whereNot({ id: 14 })
    .increment('sort_order', 1);

  // 3. 删除沙发选材品类
  await knex('style_categories').where({ id: 5 }).del();

  // 4. 重新编号 page_number
  await knex('style_categories').where({ page_number: 6 }).update({ page_number: 5 });
  await knex('style_categories').where({ page_number: 7 }).update({ page_number: 6 });
};

exports.down = async function (knex) {
  // 还原 page_number
  await knex('style_categories').where({ page_number: 6 }).update({ page_number: 7 });
  await knex('style_categories').where({ page_number: 5, name: '家具选材' }).update({ page_number: 6 });

  // 重建沙发选材品类
  await knex('style_categories').insert({ id: 5, name: '沙发选材', page_number: 5, sort_order: 0 });

  // 沙发子品类移回
  await knex('style_subcategories')
    .where({ id: 14 })
    .update({ category_id: 5, sort_order: 1 });

  // 家具子品类 sort_order 恢复
  await knex('style_subcategories')
    .where({ category_id: 6 })
    .decrement('sort_order', 1);
};
