/**
 * 008 — 新增量房预约表
 *
 *   1. 新建 measurement_appointments 表
 *   2. 记录小程序/官网用户提交的免费量房预约信息
 *   3. 支持管理后台状态流转：待处理→已联系→已上门→已签约/已放弃
 *   4. source 字段区分来源（miniprogram / website）
 */
exports.up = async function (knex) {
  await knex.schema.createTable('measurement_appointments', (table) => {
    table.increments('id').primary();
    table.string('name', 32).notNullable().comment('联系人姓名');
    table.string('phone', 20).notNullable().comment('手机号');
    table.string('property_name', 64).notNullable().comment('楼盘/小区名称');
    table.string('room_number', 32).comment('房号');
    table.decimal('area_size', 8, 2).comment('面积(㎡)');
    table.string('expected_time', 64).comment('期望上门时间');
    table.string('budget', 32).comment('装修预算范围');
    table.text('remark').comment('备注');
    table.string('source', 20).notNullable().defaultTo('miniprogram').comment('来源: miniprogram / website');
    table.string('source_page', 32).comment('来源子页面');
    table.integer('status').defaultTo(0).comment('0待处理 1已联系 2已上门 3已签约 4已放弃');
    table.timestamps(true, true);
    table.index('phone');
    table.index('status');
    table.index('source');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('measurement_appointments');
};
