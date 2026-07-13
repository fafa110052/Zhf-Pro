/**
 * 清理测试数据 — 删除 13877776666(李工) 和 13666665555(陈设计师)
 *
 * 运行：cd server && node scripts/cleanup_test_accounts.js
 */
const knex = require('../src/db/connection');

async function cleanup() {
  const phones = ['13877776666', '13666665555'];

  for (const phone of phones) {
    const user = await knex('designers').where('phone', phone).first();
    if (!user) {
      console.log(`⚠️  ${phone} 不存在，跳过`);
      continue;
    }
    console.log(`🔍 ${phone} (${user.name}) id=${user.id}`);

    // 检查关联数据
    const refs = {};
    refs.cases_designer = (await knex('cases').where('designer_id', user.id).count('* as c'))[0].c;
    refs.cases_reviewed = (await knex('cases').where('reviewed_by', user.id).count('* as c'))[0].c;
    refs.images = (await knex('image_library').where('uploaded_by', user.id).count('* as c'))[0].c;
    refs.orders_user = (await knex('material_orders').where('user_id', user.id).count('* as c'))[0].c;
    refs.orders_designer = (await knex('material_orders').where('designer_id', user.id).count('* as c'))[0].c;
    refs.orders_supervisor = (await knex('material_orders').where('supervisor_id', user.id).count('* as c'))[0].c;
    refs.orders_reviewed = (await knex('material_orders').where('reviewed_by', user.id).count('* as c'))[0].c;
    refs.order_logs = (await knex('material_order_logs').where('operator_id', user.id).count('* as c'))[0].c;
    refs.phases = await knex('construction_phases').where(function () {
      this.where('designer_id', user.id)
        .orWhere('design_director_id', user.id)
        .orWhere('engineer_id', user.id)
        .orWhere('engineering_director_id', user.id)
        .orWhere('design_reviewed_by', user.id)
        .orWhere('construction_reviewed_by', user.id);
    }).count('* as c');
    refs.phase_logs_count = refs.phases[0]?.c || 0;
    refs.phase_logs = (await knex('construction_phase_logs').where('operator_id', user.id).count('* as c'))[0].c;

    console.log('  关联数据:', Object.entries(refs).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(', ') || '无');

    // 获取 admin ID
    const admin = await knex('designers').where('role', 'admin').first();
    const adminId = admin?.id;

    await knex.transaction(async (trx) => {
      // 清理所有 FK 引用
      if (refs.cases_designer > 0) {
        if (adminId) {
          await trx('cases').where('designer_id', user.id).update({ designer_id: adminId });
          console.log(`  ✓ cases.designer_id → admin(${adminId})`);
        }
      }
      await trx('cases').where('reviewed_by', user.id).update({ reviewed_by: null });
      await trx('image_library').where('uploaded_by', user.id).update({ uploaded_by: null });
      if (adminId) {
        await trx('material_orders').where('user_id', user.id).update({ user_id: adminId });
      }
      await trx('material_orders').where('designer_id', user.id).update({ designer_id: null });
      await trx('material_orders').where('supervisor_id', user.id).update({ supervisor_id: null });
      await trx('material_orders').where('reviewed_by', user.id).update({ reviewed_by: null });
      await trx('material_order_logs').where('operator_id', user.id).update({ operator_id: null });
      await trx('construction_phases').where('designer_id', user.id).update({ designer_id: null });
      await trx('construction_phases').where('design_director_id', user.id).update({ design_director_id: null });
      await trx('construction_phases').where('engineer_id', user.id).update({ engineer_id: null });
      await trx('construction_phases').where('engineering_director_id', user.id).update({ engineering_director_id: null });
      await trx('construction_phases').where('design_reviewed_by', user.id).update({ design_reviewed_by: null });
      await trx('construction_phases').where('construction_reviewed_by', user.id).update({ construction_reviewed_by: null });
      if (adminId) {
        await trx('construction_phase_logs').where('operator_id', user.id).update({ operator_id: adminId });
      }

      // 删除账号
      await trx('designers').where('id', user.id).del();
      console.log(`  ✅ 已删除 ${user.name} (${phone})`);
    });
  }

  console.log('\n✅ 清理完成');
  process.exit(0);
}

cleanup().catch((err) => { console.error(err); process.exit(1); });
