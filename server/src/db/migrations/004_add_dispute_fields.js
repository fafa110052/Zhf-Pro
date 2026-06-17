/**
 * V1.2 — 业主验收异议字段
 *
 * 新增：
 *   material_orders.dispute_reason TEXT  — 异议原因
 *   material_orders.dispute_images TEXT  — 异议图片 JSON 数组
 */
exports.up = async function (knex) {
  // material_orders 有来自 material_order_items / material_order_logs 的 FK 引用，
  // 用 raw SQL ADD COLUMN 避免 SQLite alterTable 重建问题
  await knex.raw('ALTER TABLE material_orders ADD COLUMN dispute_reason TEXT');
  await knex.raw('ALTER TABLE material_orders ADD COLUMN dispute_images TEXT');
};

exports.down = async function (knex) {
  // SQLite 不支持原生 DROP COLUMN，Knex 会模拟，但此处仅开发/测试环境使用
  await knex.schema.alterTable('material_orders', (table) => {
    table.dropColumn('dispute_images');
    table.dropColumn('dispute_reason');
  });
};
