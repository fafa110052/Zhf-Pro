/**
 * V1.3 — 施工全流程管理
 *
 * 新增：
 *   1. construction_phases — 施工阶段表
 *   2. construction_phase_logs — 阶段操作日志
 *
 * 修改：
 *   3. material_orders — 新增 construction_status、current_phase_order
 *   4. designers — personnel_type CHECK 约束扩展
 */
exports.up = async function (knex) {
  // ── 1. construction_phases ──
  await knex.schema.createTable('construction_phases', (table) => {
    table.increments('id').primary();
    table.integer('order_id').notNullable().references('id').inTable('material_orders');
    table.string('phase_type', 32).notNullable();
    // 'demolition'|'water_electric'|'painting'|'material_install'|'completion'
    table.integer('phase_order').notNullable(); // 1-5
    table.string('status', 32).notNullable().defaultTo('assigned');

    // 派单 4 人
    table.integer('designer_id').references('id').inTable('designers');
    table.integer('design_director_id').references('id').inTable('designers');
    table.integer('engineer_id').references('id').inTable('designers');
    table.integer('engineering_director_id').references('id').inTable('designers');

    // 设计图
    table.text('design_images');           // JSON array
    table.string('design_uploaded_at');

    // 设计总监审核
    table.string('design_director_reviewed_at');
    table.text('design_director_reject_reason');

    // 管理员设计审核
    table.integer('design_reviewed_by').references('id').inTable('designers');
    table.string('design_reviewed_at');
    table.text('design_reject_reason');

    // 工程师确认
    table.string('construction_confirmed_at');

    // 完工图
    table.text('construction_images');      // JSON array
    table.string('construction_uploaded_at');

    // 工程总监审核
    table.string('engineering_director_reviewed_at');
    table.text('engineering_director_reject_reason');

    // 管理员完工审核
    table.integer('construction_reviewed_by').references('id').inTable('designers');
    table.string('construction_reviewed_at');
    table.text('construction_reject_reason');

    // 业主验收
    table.string('owner_accepted_at');
    table.text('dispute_reason');
    table.text('dispute_images');           // JSON array

    table.timestamps(true, true);
  });

  // ── 2. construction_phase_logs ──
  await knex.schema.createTable('construction_phase_logs', (table) => {
    table.increments('id').primary();
    table.integer('phase_id').notNullable().references('id').inTable('construction_phases');
    table.string('action', 64).notNullable();
    // 'assign'|'design_upload'|'design_director_approve'|'design_director_reject'
    // |'design_admin_approve'|'design_admin_reject'
    // |'construction_confirm'|'construction_upload'
    // |'engineering_director_approve'|'engineering_director_reject'
    // |'construction_admin_approve'|'construction_admin_reject'
    // |'owner_accept'|'owner_dispute'
    table.integer('operator_id').notNullable().references('id').inTable('designers');
    table.text('detail');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── 3. material_orders 新增字段 ──
  await knex.raw('ALTER TABLE material_orders ADD COLUMN construction_status TEXT DEFAULT \'not_started\'');
  await knex.raw('ALTER TABLE material_orders ADD COLUMN current_phase_order INTEGER DEFAULT 0');

  // ── 4. designers personnel_type 扩展 ──
  // SQLite 不支持直接修改 CHECK 约束，但 Knex 在 SQLite 中不强制 CHECK，
  // 实际校验在代码层 designerService.js 中完成。
  // 此处仅记录迁移意图；新 personnel_type 值（engineer/design_director/engineering_director）
  // 由应用层 designerService.js 校验。
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('construction_phase_logs');
  await knex.schema.dropTableIfExists('construction_phases');
  // SQLite 不支持 DROP COLUMN，Knex 会模拟
  await knex.schema.alterTable('material_orders', (table) => {
    table.dropColumn('current_phase_order');
    table.dropColumn('construction_status');
  });
};
