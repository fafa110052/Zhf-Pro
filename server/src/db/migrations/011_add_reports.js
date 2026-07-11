/**
 * 011 — 作品举报表
 *
 * 小程序作品详情页举报入口提交，管理后台「运营工具-举报管理」处理。
 * 游客可举报（reporter_id 允许为空），可选填联系方式。
 */
exports.up = async function (knex) {
  await knex.schema.createTable('reports', (table) => {
    table.increments('id').primary();
    table.integer('case_id').notNullable().references('id').inTable('cases').comment('被举报作品');
    table.string('reason_type', 16).notNullable().comment('fake|infringe|vulgar|other');
    table.text('reason_detail').comment('举报补充说明（"其他"时填写）');
    table.string('contact', 64).comment('举报人联系方式（可选）');
    table.string('status', 16).notNullable().defaultTo('pending').comment('pending|resolved|rejected');
    table.text('admin_remark').comment('管理员处理备注');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('handled_at').comment('处理时间');
    table.index('status');
    table.index('case_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('reports');
};
