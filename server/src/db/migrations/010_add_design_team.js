/**
 * 010 — 设计团队表
 *
 * 用于小程序首页展示设计团队成员，管理后台可 CRUD
 */
exports.up = async function (knex) {
  await knex.schema.createTable('design_team', (table) => {
    table.increments('id').primary();
    table.string('name', 32).notNullable().comment('设计师姓名');
    table.string('avatar_url', 255).comment('头像图片 URL');
    table.string('styles', 128).comment('擅长风格，如：现代·轻奢');
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('design_team');
};
