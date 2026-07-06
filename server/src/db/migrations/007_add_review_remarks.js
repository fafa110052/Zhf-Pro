/**
 * 007 — construction_phases 新增审核备注字段
 *
 *   1. construction_phases 新增 engineering_director_remark（工程总监审核通过时的可选备注）
 *   2. construction_phases 新增 admin_construction_remark（管理员二审通过时的可选备注）
 *   3. 以上备注对业主可见
 */
exports.up = async function (knex) {
  await knex.schema.table('construction_phases', (table) => {
    table.text('engineering_director_remark');   // 工程总监审核通过时的可选备注
    table.text('admin_construction_remark');     // 管理员二审通过时的可选备注
  });
};

exports.down = async function (knex) {
  await knex.schema.table('construction_phases', (table) => {
    table.dropColumn('admin_construction_remark');
    table.dropColumn('engineering_director_remark');
  });
};
