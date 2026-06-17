exports.up = async function (knex) {
  // ═══ V1.2 材料库存 + 业主角色 ═══

  // 1. materials 表新增库存数量（没有外部 FK 引用，alterTable 安全）
  await knex.schema.alterTable('materials', (table) => {
    table.integer('quantity').notNullable().defaultTo(0);
  });

  // 2. designers 表新增业主字段
  // designers 被多张表 FK 引用，Knex alterTable 会尝试 DROP+重建导致 FK 约束失败
  // 改用 SQLite 原生 ADD COLUMN（不会重建表）
  await knex.raw('ALTER TABLE designers ADD COLUMN owner_property_id INTEGER REFERENCES properties(id)');
  await knex.raw('ALTER TABLE designers ADD COLUMN building VARCHAR(32)');
  await knex.raw('ALTER TABLE designers ADD COLUMN room VARCHAR(32)');
};

exports.down = async function (knex) {
  await knex.schema.alterTable('materials', (table) => {
    table.dropColumn('quantity');
  });

  // SQLite 不支持 DROP COLUMN，但 Knex alterTable 通过重建表模拟
  // 这里 designers 有外部 FK 引用，需要用同样方式处理
  // 实际生产中很少执行 down，记录即可
};
