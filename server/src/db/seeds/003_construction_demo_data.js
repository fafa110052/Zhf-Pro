/**
 * V1.3 — 施工流程测试种子数据（8 组，覆盖全部状态）
 */
const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // 清空施工阶段数据（逆序）
  await knex('construction_phase_logs').del();
  await knex('construction_phases').del();

  const pw = await bcrypt.hash('test123', 10);

  // ═══ 1. 施工角色测试账号 ═══
  const users = {};
  const upsertUser = async (data) => {
    const exists = await knex('designers').where('phone', data.phone).first();
    if (exists) {
      await knex('designers').where('id', exists.id).update(data);
      data.id = exists.id;
    } else {
      const [id] = await knex('designers').insert(data);
      data.id = id;
    }
    users[data.name] = data;
  };

  await upsertUser({ username: 'zhangsan', password_hash: pw, name: '张三', phone: '13800000001', role: 'designer', status: 'active', personnel_type: 'designer', employee_id: 'D003', years_of_exp: 6 });
  await upsertUser({ username: 'lisi', password_hash: pw, name: '李四', phone: '13800000002', role: 'designer', status: 'active', personnel_type: 'design_director', employee_id: 'DD001', years_of_exp: 15 });
  await upsertUser({ username: 'wangwu', password_hash: pw, name: '王五', phone: '13800000003', role: 'designer', status: 'active', personnel_type: 'engineer', employee_id: 'E001', years_of_exp: 10 });
  await upsertUser({ username: 'zhaoliu', password_hash: pw, name: '赵六', phone: '13800000004', role: 'designer', status: 'active', personnel_type: 'engineering_director', employee_id: 'ED001', years_of_exp: 18 });
  await upsertUser({ username: 'owner_a', password_hash: pw, name: '测试业主A', phone: '13800000011', role: 'owner', status: 'active', owner_property_id: null, building: '1栋', room: '101' });
  await upsertUser({ username: 'owner_b', password_hash: pw, name: '测试业主B', phone: '13800000012', role: 'owner', status: 'active', owner_property_id: null, building: '2栋', room: '202' });
  await upsertUser({ username: 'owner_c', password_hash: pw, name: '测试业主C', phone: '13800000013', role: 'owner', status: 'active', owner_property_id: null, building: '3栋', room: '301' });
  await upsertUser({ username: 'owner_d', password_hash: pw, name: '测试业主D', phone: '13800000014', role: 'owner', status: 'active', owner_property_id: null, building: '5栋', room: '501' });
  await upsertUser({ username: 'owner_e', password_hash: pw, name: '测试业主E', phone: '13800000015', role: 'owner', status: 'active', owner_property_id: null, building: '1栋', room: '102' });
  await upsertUser({ username: 'owner_f', password_hash: pw, name: '测试业主F', phone: '13800000016', role: 'owner', status: 'active', owner_property_id: null, building: '3栋', room: '302' });
  await upsertUser({ username: 'owner_g', password_hash: pw, name: '测试业主G', phone: '13800000017', role: 'owner', status: 'active', owner_property_id: null, building: '2栋', room: '201' });
  await upsertUser({ username: 'owner_h', password_hash: pw, name: '测试业主H', phone: '13800000018', role: 'owner', status: 'active', owner_property_id: null, building: '6栋', room: '601' });

  // ═══ 2. 楼盘（不存在则创建）═══
  const props = {};
  for (const [code, name] of [['01', '碧桂园·翡翠湾'], ['02', '万科·金域华府'], ['03', '保利·天悦'], ['04', '中海·锦城']]) {
    let p = await knex('properties').where('property_code', code).first();
    if (!p) {
      const [id] = await knex('properties').insert({ name, address: `${name}（测试地址）`, property_code: code, cover_image: `https://picsum.photos/id/${10 + parseInt(code)}/400/300`, material_enabled: 1 });
      p = { id, name, property_code: code };
    }
    props[p.property_code] = p;
  }

  // 更新业主的 owner_property_id
  await knex('designers').where('phone', '13800000011').update({ owner_property_id: props['01'].id });
  await knex('designers').where('phone', '13800000012').update({ owner_property_id: props['01'].id });
  await knex('designers').where('phone', '13800000013').update({ owner_property_id: props['02'].id });
  await knex('designers').where('phone', '13800000014').update({ owner_property_id: props['02'].id });
  await knex('designers').where('phone', '13800000015').update({ owner_property_id: props['03'].id });
  await knex('designers').where('phone', '13800000016').update({ owner_property_id: props['03'].id });
  await knex('designers').where('phone', '13800000017').update({ owner_property_id: props['04'].id });
  await knex('designers').where('phone', '13800000018').update({ owner_property_id: props['04'].id });

  // ═══ 3. 创建 8 个 approved 订单 ═══
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seedOrders = [
    { code: '01', user: '测试业主A', room: '1栋101', id: null },  // 种子1: 碧桂园
    { code: '01', user: '测试业主B', room: '2栋202', id: null },  // 种子2: 碧桂园
    { code: '02', user: '测试业主C', room: '3栋301', id: null },  // 种子3: 万科
    { code: '02', user: '测试业主D', room: '5栋501', id: null },  // 种子4: 万科
    { code: '03', user: '测试业主E', room: '1栋102', id: null },  // 种子5: 保利
    { code: '03', user: '测试业主F', room: '3栋302', id: null },  // 种子6: 保利
    { code: '04', user: '测试业主G', room: '2栋201', id: null },  // 种子7: 中海
    { code: '04', user: '测试业主H', room: '6栋601', id: null },  // 种子8: 中海
  ];

  for (let i = 0; i < seedOrders.length; i++) {
    const s = seedOrders[i];
    const prop = props[s.code];
    const seq = String(i + 1).padStart(2, '0');
    const orderNo = `${ym}${s.code}${seq}`;
    const userId = users[s.user]?.id;
    const exists = await knex('material_orders').where('order_no', orderNo).first();
    if (exists) { s.id = exists.id; s.order_no = orderNo; continue; }
    const [id] = await knex('material_orders').insert({
      order_no: orderNo, property_id: prop.id, room_number: s.room,
      user_id: userId, applicant_name: s.user, applicant_phone: users[s.user]?.phone || '',
      status: 'approved', construction_status: 'in_progress', current_phase_order: 1,
      created_at: now.toISOString(), updated_at: now.toISOString(),
    });
    s.id = id; s.order_no = orderNo;
  }

  // ═══ 4. 创建施工阶段 ═══
  const phaseTypes = ['demolition', 'water_electric', 'painting', 'material_install', 'completion'];
  const IMG = (n) => `https://picsum.photos/id/${(n % 100) + 10}/400/300`;

  // 种子状态矩阵：[phase1_status, phase2_status, phase3_status, phase4_status, phase5_status]
  const matrix = [
    ['owner_accepted', 'design_uploaded', 'locked', 'locked', 'locked'],                       // 1: 设计总监待审核
    ['owner_accepted', 'owner_accepted', 'construction_admin_approved', 'locked', 'locked'],    // 2: 业主待验收
    ['owner_accepted', 'owner_accepted', 'owner_accepted', 'unassigned', 'locked'],               // 3: 未派单
    ['owner_accepted', 'owner_accepted', 'owner_accepted', 'owner_accepted', 'construction_confirmed'], // 4: 工程师施工中
    ['design_director_rejected', 'locked', 'locked', 'locked', 'locked'],                       // 5: 设计总监驳回
    ['owner_accepted', 'owner_accepted', 'engineering_director_rejected', 'locked', 'locked'],  // 6: 工程总监驳回
    ['owner_accepted', 'owner_accepted', 'owner_accepted', 'owner_accepted', 'owner_disputed'], // 7: 业主驳回
    ['owner_accepted', 'owner_accepted', 'owner_accepted', 'owner_accepted', 'owner_accepted'], // 8: 全部完成
  ];

  const phaseIds = [];

  for (let si = 0; si < seedOrders.length; si++) {
    const orderId = seedOrders[si].id;
    const orderNo = seedOrders[si].order_no;
    const statuses = matrix[si];

    // 找到当前活跃阶段
    let currentPhase = 1;
    for (let pi = 0; pi < 5; pi++) {
      if (statuses[pi] !== 'owner_accepted' && statuses[pi] !== 'locked') { currentPhase = pi + 1; break; }
      if (pi === 4 && statuses[pi] === 'owner_accepted') currentPhase = 5;
    }
    await knex('material_orders').where('id', orderId).update({
      current_phase_order: currentPhase,
      construction_status: statuses[4] === 'owner_accepted' ? 'completed' : 'in_progress',
    });

    for (let pi = 0; pi < 5; pi++) {
      const status = statuses[pi];
      const [phaseId] = await knex('construction_phases').insert({
        order_id: orderId,
        phase_type: phaseTypes[pi],
        phase_order: pi + 1,
        status,
        designer_id: users['张三']?.id,
        design_director_id: users['李四']?.id,
        engineer_id: users['王五']?.id,
        engineering_director_id: users['赵六']?.id,
        design_images: pi === 0 || status === 'owner_accepted' || status.includes('rejected') || status === 'design_uploaded' || status === 'construction_admin_approved'
          ? JSON.stringify([IMG(si * 10 + pi * 2 + 1), IMG(si * 10 + pi * 2 + 2)]) : null,
        construction_images: (status === 'owner_accepted' || status === 'construction_admin_approved' || status === 'owner_disputed' || status.includes('rejected'))
          ? JSON.stringify([IMG(si * 10 + pi * 2 + 10), IMG(si * 10 + pi * 2 + 11), IMG(si * 10 + pi * 2 + 12)]) : null,
        dispute_reason: status === 'owner_disputed' ? '部分瓷砖铺设不平整，请重新检查并修复' : null,
        dispute_images: status === 'owner_disputed' ? JSON.stringify([IMG(si * 20 + 1), IMG(si * 20 + 2)]) : null,
        design_director_reject_reason: status === 'design_director_rejected' ? '设计方案与楼盘整体风格不匹配，请调整配色方案' : null,
        engineering_director_reject_reason: status === 'engineering_director_rejected' ? '完工图中可见墙面存在明显裂缝，请返工修补' : null,
        owner_accepted_at: status === 'owner_accepted' ? new Date(Date.now() - (5 - pi) * 86400000).toISOString() : null,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - (5 - pi) * 86400000).toISOString(),
      });
      phaseIds.push({ id: phaseId, si, pi, status, order_no: orderNo });

      // ═══ 操作日志（丰富版）═══
      const logs = [];
      const adminId = (await knex('designers').where('role', 'admin').first())?.id || users['张三']?.id;
      const t = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
      const phaseLabel = { demolition: '打拆', water_electric: '水电', painting: '油工', material_install: '主材安装', completion: '竣工' }[phaseTypes[pi]];
      const roomLabel = `${seedOrders[si].room}`;

      // 已指派或更后的阶段才有派单日志
      if (status !== 'locked' && status !== 'unassigned') {
        logs.push({ phase_id: phaseId, action: 'assign', operator_id: adminId, detail: `管理员指派${phaseLabel}阶段：设计师 ${users['张三']?.name}，设计总监 ${users['李四']?.name}，工程师 ${users['王五']?.name}，工程总监 ${users['赵六']?.name}`, created_at: t(28 - pi * 5) });
      }

      // 有设计动作的阶段
      if (['design_uploaded', 'design_director_approved', 'design_admin_approved', 'construction_confirmed', 'construction_uploaded', 'engineering_director_approved', 'construction_admin_approved', 'owner_accepted', 'design_director_rejected', 'engineering_director_rejected', 'owner_disputed'].includes(status)) {
        logs.push({ phase_id: phaseId, action: 'design_upload', operator_id: users['张三']?.id, detail: `设计师 ${users['张三']?.name} 上传${phaseLabel}阶段设计图 ${si % 2 === 0 ? '，含平面布局图与立面图' : '，含效果图与施工节点图'}，共 2 张`, created_at: t(27 - pi * 5) });
      }

      if (status === 'design_director_rejected') {
        logs.push({ phase_id: phaseId, action: 'design_director_reject', operator_id: users['李四']?.id, detail: `设计总监 ${users['李四']?.name} 驳回${phaseLabel}设计：设计方案与楼盘整体风格不匹配，请调整配色方案并重新提交`, created_at: t(26 - pi * 5) });
      } else if (['design_director_approved', 'design_admin_approved', 'construction_confirmed', 'construction_uploaded', 'engineering_director_approved', 'construction_admin_approved', 'owner_accepted'].includes(status)) {
        logs.push({ phase_id: phaseId, action: 'design_director_approve', operator_id: users['李四']?.id, detail: `设计总监 ${users['李四']?.name} 审核通过${phaseLabel}设计图，认为方案符合${['现代简约','北欧','新中式','轻奢'][si % 4]}风格要求`, created_at: t(26 - pi * 5) });
        logs.push({ phase_id: phaseId, action: 'design_admin_approve', operator_id: adminId, detail: `管理员二审通过${phaseLabel}设计图，进入施工准备阶段`, created_at: t(25 - pi * 5) });
      }

      if (['construction_confirmed', 'construction_uploaded', 'engineering_director_approved', 'construction_admin_approved', 'owner_accepted'].includes(status)) {
        logs.push({ phase_id: phaseId, action: 'construction_confirm', operator_id: users['王五']?.id, detail: `工程师 ${users['王五']?.name} 确认${phaseLabel}设计图无误，材料已进场，开始施工`, created_at: t(23 - pi * 5) });
      }

      if (['construction_uploaded', 'engineering_director_approved', 'construction_admin_approved', 'owner_accepted', 'engineering_director_rejected'].includes(status)) {
        logs.push({ phase_id: phaseId, action: 'construction_upload', operator_id: users['王五']?.id, detail: `工程师 ${users['王五']?.name} 完成${phaseLabel}施工并上传完工图 ${si % 3 + 2} 张，涵盖关键节点验收照片`, created_at: t(21 - pi * 5) });
      }

      if (status === 'engineering_director_rejected') {
        logs.push({ phase_id: phaseId, action: 'engineering_director_reject', operator_id: users['赵六']?.id, detail: `工程总监 ${users['赵六']?.name} 驳回${phaseLabel}完工：现场核验发现完工图中墙面存在明显裂缝，需返工修补后重新提交验收`, created_at: t(20 - pi * 5) });
      } else if (['engineering_director_approved', 'construction_admin_approved', 'owner_accepted'].includes(status)) {
        logs.push({ phase_id: phaseId, action: 'engineering_director_approve', operator_id: users['赵六']?.id, detail: `工程总监 ${users['赵六']?.name} 现场核验通过${phaseLabel}完工质量，符合施工规范`, created_at: t(20 - pi * 5) });
        logs.push({ phase_id: phaseId, action: 'construction_admin_approve', operator_id: adminId, detail: `管理员综合审核通过${phaseLabel}完工，通知业主 ${roomLabel} 进行验收`, created_at: t(19 - pi * 5) });
      }

      if (status === 'owner_accepted') {
        const ownerName = seedOrders[si].user;
        logs.push({ phase_id: phaseId, action: 'owner_accept', operator_id: users[ownerName]?.id, detail: `业主 ${ownerName}（${roomLabel}）现场验收${phaseLabel}通过，确认工程质量合格`, created_at: t(17 - pi * 5) });
      } else if (status === 'owner_disputed') {
        const ownerName = seedOrders[si].user;
        logs.push({ phase_id: phaseId, action: 'owner_dispute', operator_id: users[ownerName]?.id, detail: `业主 ${ownerName}（${roomLabel}）驳回${phaseLabel}验收：部分瓷砖铺设不平整，存在空鼓现象，请重新检查并修复，附现场照片 2 张`, created_at: t(17 - pi * 5) });
      }

      if (logs.length > 0) await knex('construction_phase_logs').insert(logs);
    }
  }

  console.log(`✅ 施工种子数据完成：${seedOrders.length} 个订单，40 个阶段，${phaseIds.length * 5} 条日志`);
};
