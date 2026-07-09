/**
 * 006 — construction_phases 新增施工描述字段
 *
 *   1. construction_phases 新增 construction_description（可选文本描述）
 */
exports.up = async function (knex) {
  await knex.schema.table('construction_phases', (table) => {
    table.text('construction_description'); // 工程师上传完工图时的可选描述
  });
};

exports.down = async function (knex) {
  await knex.schema.table('construction_phases', (table) => {
    table.dropColumn('construction_description');
  });
};
