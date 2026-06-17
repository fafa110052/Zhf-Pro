/**
 * V1.3 — 新增业主审核设计图字段
 */
exports.up = async function (knex) {
  await knex.schema.table('construction_phases', (t) => {
    t.text('owner_design_reviewed_at');
    t.text('owner_design_dispute_reason');
    t.text('owner_design_dispute_images');
  });
};

exports.down = async function (knex) {
  await knex.schema.table('construction_phases', (t) => {
    t.dropColumn('owner_design_dispute_images');
    t.dropColumn('owner_design_dispute_reason');
    t.dropColumn('owner_design_reviewed_at');
  });
};
