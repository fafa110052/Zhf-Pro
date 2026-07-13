/**
 * 提审账号种子数据 — 为审核员 13800001111 创建完整的业主体验数据
 *
 * 运行方式：npx knex seed:run --specific=004_auditor_account.js
 * 或在服务器上：node src/db/seeds/004_auditor_account.js
 */
const bcrypt = require('bcryptjs');

/**
 * 作为独立脚本运行时（非 knex seed 模式）
 */
async function runStandalone(knex) {
  const pw = await bcrypt.hash('test123', 10);
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  console.log('🔍 检查现有数据…');

  // ═══ 1. 业主账号 ═══
  let owner = await knex('designers').where('phone', '13800001111').first();
  if (owner) {
    console.log(`  ✓ 账号已存在: ${owner.name} (id=${owner.id}, role=${owner.role})`);
    // 确保角色和名称为提审专用
    await knex('designers').where('id', owner.id).update({
      name: '审核员业主',
      role: 'owner',
      personnel_type: 'designer',
      status: 'active',
      username: 'auditor_owner',
      password_hash: pw,
      updated_at: now.toISOString(),
    });
    owner = await knex('designers').where('id', owner.id).first();
    console.log(`  ✓ 已更新为业主角色: ${owner.name} (role=${owner.role})`);
  } else {
      username: 'auditor_owner',
      password_hash: pw,
      name: '审核员业主',
      phone: '13800001111',
      role: 'owner',
      status: 'active',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    owner = await knex('designers').where('id', ownerId).first();
    console.log(`  ✓ 创建业主账号: 审核员业主 (id=${owner.id})`);
  }

  // ═══ 2. 楼盘 ═══
  let prop = await knex('properties').where('property_code', '01').first();
  if (!prop) {
    const [propId] = await knex('properties').insert({
      name: '碧桂园·翡翠湾',
      address: '梧州市长洲区新兴三路',
      property_code: '01',
      cover_image: '/api/v1/placeholder/11/400/300',
      material_enabled: 1,
    });
    prop = await knex('properties').where('id', propId).first();
    console.log('  ✓ 创建楼盘: 碧桂园·翡翠湾');
  } else {
    console.log(`  ✓ 楼盘已存在: ${prop.name} (id=${prop.id})`);
  }

  // 绑定业主到楼盘
  await knex('designers').where('id', owner.id).update({
    owner_property_id: prop.id,
    building: '1栋',
    room: '101',
  });
  console.log('  ✓ 绑定业主到 碧桂园·翡翠湾 1栋101');

  // ═══ 3. 获取施工角色 ═══
  const zhangsan = await knex('designers').where('phone', '13800000001').first();
  const lisi = await knex('designers').where('phone', '13800000002').first();
  const wangwu = await knex('designers').where('phone', '13800000003').first();
  const zhaoliu = await knex('designers').where('phone', '13800000004').first();
  const admin = await knex('designers').where('role', 'admin').first();

  if (!zhangsan || !lisi || !wangwu || !zhaoliu) {
    console.log('  ⚠️  施工角色账号不存在，将不创建施工阶段数据');
  }

  // ═══ 4. 选材申请订单 ═══
  const orderNo = `${ym}0102`;
  let order = await knex('material_orders').where('order_no', orderNo).first();
  if (order) {
    console.log(`  ✓ 订单已存在: ${orderNo} (id=${order.id})`);
  } else {
    const [orderId] = await knex('material_orders').insert({
      order_no: orderNo,
      property_id: prop.id,
      room_number: '1栋101',
      user_id: owner.id,
      applicant_name: '审核员业主',
      applicant_phone: '13800001111',
      status: 'approved',
      construction_status: zhangsan ? 'in_progress' : 'not_started',
      current_phase_order: zhangsan ? 1 : 0,
      remark: '提审核专用订单',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    order = await knex('material_orders').where('id', orderId).first();
    console.log(`  ✓ 创建选材订单: ${orderNo}`);
  }

  // ═══ 5. 选材明细（关联现有材料） ═══
  const existingItems = await knex('material_order_items').where('order_id', order.id).count('* as count');
  if (existingItems[0].count === 0) {
    const materials = await knex('materials').limit(4);
    if (materials.length > 0) {
      for (const m of materials) {
        await knex('material_order_items').insert({
          order_id: order.id,
          material_id: m.id,
          category_id: m.category_id,
          price_snapshot: m.price || 0,
          created_at: now.toISOString(),
        });
      }
      console.log(`  ✓ 添加 ${materials.length} 条选材明细`);
    } else {
      console.log('  ⚠️  无可用材料，跳过选材明细');
    }
  } else {
    console.log('  ✓ 选材明细已存在');
  }

  // ═══ 6. 施工阶段数据 ═══
  if (zhangsan && lisi && wangwu && zhaoliu && admin) {
    const existingPhases = await knex('construction_phases').where('order_id', order.id).count('* as count');
    if (existingPhases[0].count > 0) {
      console.log(`  ✓ 施工阶段已存在 (${existingPhases[0].count} 个阶段)`);
    } else {
      const phaseTypes = ['demolition', 'water_electric', 'painting', 'material_install', 'completion'];
      const statuses = ['owner_accepted', 'design_uploaded', 'locked', 'locked', 'locked'];
      const IMG = (n) => `/api/v1/placeholder/${(n % 100) + 10}/400/300`;

      for (let pi = 0; pi < 5; pi++) {
        const [phaseId] = await knex('construction_phases').insert({
          order_id: order.id,
          phase_type: phaseTypes[pi],
          phase_order: pi + 1,
          status: statuses[pi],
          designer_id: zhangsan.id,
          design_director_id: lisi.id,
          engineer_id: wangwu.id,
          engineering_director_id: zhaoliu.id,
          design_images: pi <= 1 ? JSON.stringify([IMG(pi * 2 + 1), IMG(pi * 2 + 2)]) : null,
          construction_images: pi === 0 ? JSON.stringify([IMG(11), IMG(12), IMG(13)]) : null,
          owner_accepted_at: pi === 0 ? new Date(Date.now() - 4 * 86400000).toISOString() : null,
          created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - (5 - pi) * 86400000).toISOString(),
        });

        // 操作日志
        const t = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
        const phaseLabel = { demolition: '打拆', water_electric: '水电', painting: '油工', material_install: '主材安装', completion: '竣工' }[phaseTypes[pi]];
        const logs = [];

        if (pi === 0) {
          logs.push({ phase_id: phaseId, action: 'assign', operator_id: admin.id, detail: `管理员指派${phaseLabel}阶段：设计师 张三，设计总监 李四，工程师 王五，工程总监 赵六`, created_at: t(28) });
          logs.push({ phase_id: phaseId, action: 'design_upload', operator_id: zhangsan.id, detail: `设计师 张三 上传${phaseLabel}阶段设计图，含平面布局图与效果图，共 2 张`, created_at: t(27) });
          logs.push({ phase_id: phaseId, action: 'design_director_approve', operator_id: lisi.id, detail: `设计总监 李四 审核通过${phaseLabel}设计图，方案符合现代简约风格要求`, created_at: t(26) });
          logs.push({ phase_id: phaseId, action: 'design_admin_approve', operator_id: admin.id, detail: `管理员二审通过${phaseLabel}设计图，进入施工准备阶段`, created_at: t(25) });
          logs.push({ phase_id: phaseId, action: 'construction_confirm', operator_id: wangwu.id, detail: `工程师 王五 确认${phaseLabel}设计图无误，材料进场，开始施工`, created_at: t(23) });
          logs.push({ phase_id: phaseId, action: 'construction_upload', operator_id: wangwu.id, detail: `工程师 王五 完成${phaseLabel}施工并上传完工图 3 张`, created_at: t(21) });
          logs.push({ phase_id: phaseId, action: 'engineering_director_approve', operator_id: zhaoliu.id, detail: `工程总监 赵六 现场核验通过${phaseLabel}完工质量`, created_at: t(20) });
          logs.push({ phase_id: phaseId, action: 'construction_admin_approve', operator_id: admin.id, detail: `管理员综合审核通过${phaseLabel}完工，通知业主 1栋101 进行验收`, created_at: t(19) });
          logs.push({ phase_id: phaseId, action: 'owner_accept', operator_id: owner.id, detail: `业主 审核员业主（1栋101）现场验收${phaseLabel}通过，确认工程质量合格`, created_at: t(17) });
        } else if (pi === 1) {
          logs.push({ phase_id: phaseId, action: 'assign', operator_id: admin.id, detail: `管理员指派${phaseLabel}阶段：设计师 张三，设计总监 李四`, created_at: t(14) });
          logs.push({ phase_id: phaseId, action: 'design_upload', operator_id: zhangsan.id, detail: `设计师 张三 上传${phaseLabel}阶段设计图，含水电走线图与点位图，共 2 张`, created_at: t(13) });
        }

        if (logs.length > 0) await knex('construction_phase_logs').insert(logs);
      }
      console.log('  ✓ 创建 5 个施工阶段 + 操作日志');
    }
  }

  // ═══ 7. 量房预约 ═══
  const existingAppt = await knex('measurement_appointments').where('phone', '13800001111').first();
  if (!existingAppt) {
    await knex('measurement_appointments').insert({
      name: '审核员业主',
      phone: '13800001111',
      property_name: '碧桂园·翡翠湾',
      room_number: '1栋101',
      area_size: 120.5,
      expected_time: '周末上午',
      budget: '15-20万',
      remark: '审核测试数据',
      source: 'miniprogram',
      status: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
    console.log('  ✓ 创建量房预约');
  } else {
    console.log('  ✓ 量房预约已存在');
  }

  console.log('\n✅ 提审账号数据准备完成！');
  console.log('   手机号: 13800001111');
  console.log('   角色: 业主');
  console.log('   楼盘: 碧桂园·翡翠湾 1栋101');
  console.log(`   订单: ${orderNo}（已审批，施工中）`);
  console.log('   施工: 打拆已验收 / 水电设计待审 / 后续阶段锁定');
}

exports.seed = async function (knex) {
  await runStandalone(knex);
};

// 支持直接运行: node src/db/seeds/004_auditor_account.js
if (require.main === module) {
  const knex = require('../connection');
  runStandalone(knex)
    .then(() => { console.log('完成，退出'); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
