/**
 * 施工阶段业务逻辑（V1.3）
 *
 * 全流程（5 个阶段均需设计师 + 设计总监参与）：
 *   unassigned → assigned → design_uploaded → design_director_approved → design_admin_approved
 *   → owner_design_reviewed → engineer_design_confirmed → construction_confirmed → construction_uploaded
 *   → engineering_director_approved → construction_admin_approved → owner_accepted
 *
 * 驳回路径见各方法注释
 */
const db = require('../db/connection');
const config = require('../config');
const wechatService = require('./wechatService');

// ═══════════════════════════════════════════
// 内部工具
// ═══════════════════════════════════════════

/** 获取阶段，不存在抛 404 */
async function findPhase(phaseId) {
  const phase = await db('construction_phases').where('id', phaseId).first();
  if (!phase) {
    throw Object.assign(new Error('施工阶段不存在'), { status: 404 });
  }
  return phase;
}

/** 获取阶段关联的订单 */
async function findOrderForPhase(phaseId) {
  const phase = await findPhase(phaseId);
  const order = await db('material_orders').where('id', phase.order_id).first();
  if (!order) {
    throw Object.assign(new Error('关联订单不存在'), { status: 404 });
  }
  return { phase, order };
}

/** 获取用户 openid */
async function getUserOpenid(userId) {
  const user = await db('designers').select('openid').where('id', userId).first();
  return user?.openid || null;
}

/** 获取用户完整信息 */
async function getUser(userId) {
  return db('designers').select('id', 'name', 'role', 'personnel_type', 'openid')
    .where('id', userId).first();
}

/** 写操作日志 */
async function logAction(phaseId, action, operatorId, detail) {
  await db('construction_phase_logs').insert({
    phase_id: phaseId,
    action,
    operator_id: operatorId,
    detail,
  });
}

/** 尝试推送订阅消息（失败不阻塞） */
async function tryPush(openid, templateId, data, page) {
  if (!openid || !templateId) return;
  try {
    await wechatService.sendSubscribeMessage(openid, templateId, data, page);
  } catch (_) { /* 静默失败 */ }
}

/** 获取楼盘名+房号，用于推送消息 */
async function getProjectLabel(orderId) {
  const order = await db('material_orders')
    .select('properties.name as property_name', 'material_orders.room_number')
    .leftJoin('properties', 'material_orders.property_id', 'properties.id')
    .where('material_orders.id', orderId).first();
  if (!order) return '';
  return `${order.property_name || ''}-${order.room_number || ''}`;
}

/** 校验阶段状态是否为目标状态 */
function requireStatus(phase, ...allowed) {
  if (!allowed.includes(phase.status)) {
    throw Object.assign(
      new Error(`当前阶段状态不允许此操作（当前：${phase.status}）`),
      { status: 400 }
    );
  }
}

/** 校验角色分离 */
function requireRoleSeparation(designerId, designDirId, engineerId, engDirId) {
  if (designerId && designDirId && designerId === designDirId) {
    throw Object.assign(
      new Error('设计师和设计总监不能是同一人'),
      { status: 400 }
    );
  }
  if (engineerId && engDirId && engineerId === engDirId) {
    throw Object.assign(
      new Error('工程师和工程总监不能是同一人'),
      { status: 400 }
    );
  }
}

// ═══════════════════════════════════════════
// 公开方法
// ═══════════════════════════════════════════

const constructionPhaseService = {

  // ═══════ 开启施工 ═══════

  /**
   * 管理员开启施工，为已 accepted 的订单创建 5 个阶段
   * 阶段 1 = assigned，阶段 2-5 = locked
   */
  async startConstruction(operatorId, orderNo) {
    const order = await db('material_orders').where('order_no', orderNo).first();
    if (!order) {
      throw Object.assign(new Error('订单不存在'), { status: 404 });
    }
    if (order.status !== 'approved') {
      throw Object.assign(new Error('仅已通过的订单可开启施工'), { status: 400 });
    }
    if (order.construction_status !== 'not_started') {
      throw Object.assign(new Error('施工已开启，请勿重复操作'), { status: 400 });
    }

    const phaseTypes = ['demolition', 'water_electric', 'painting', 'material_install', 'completion'];

    await db.transaction(async (trx) => {
      for (let i = 0; i < 5; i++) {
        await trx('construction_phases').insert({
          order_id: order.id,
          phase_type: phaseTypes[i],
          phase_order: i + 1,
          status: i === 0 ? 'unassigned' : 'locked',
        });
      }

      await trx('material_orders').where('id', order.id).update({
        construction_status: 'in_progress',
        current_phase_order: 1,
        updated_at: db.fn.now(),
      });
    });

    return {
      order_no: orderNo,
      construction_status: 'in_progress',
      current_phase_order: 1,
      phases_created: 5,
    };
  },

  // ═══════ 审核派单（合并：审核通过 + 开启施工 + 派单） ═══════

  /**
   * 管理员一步完成：审核订单 + 开启施工 + 指派设计人员
   * 仅指派设计师和设计总监，工程师/工程总监后续在施工管理模块另行指派
   */
  async approveAndAssign(operatorId, orderNo, { designer_id, design_director_id }) {
    if (!designer_id || !design_director_id) {
      throw Object.assign(new Error('请指定设计师和设计总监'), { status: 400 });
    }

    // 校验 personnel_type
    const personIds = [designer_id, design_director_id];
    const persons = await db('designers').whereIn('id', personIds);
    const byId = {};
    persons.forEach(p => { byId[p.id] = p; });

    if (!byId[designer_id] || byId[designer_id].personnel_type !== 'designer') {
      throw Object.assign(new Error('指定的设计师 personnel_type 不正确'), { status: 400 });
    }
    if (!byId[design_director_id] || byId[design_director_id].personnel_type !== 'design_director') {
      throw Object.assign(new Error('指定的设计总监 personnel_type 不正确'), { status: 400 });
    }

    if (designer_id === design_director_id) {
      throw Object.assign(new Error('设计师和设计总监不能是同一人'), { status: 400 });
    }

    const order = await db('material_orders').where('order_no', orderNo).first();
    if (!order) {
      throw Object.assign(new Error('订单不存在'), { status: 404 });
    }
    if (order.status !== 'pending') {
      throw Object.assign(new Error('仅待审核的订单可进行此操作'), { status: 400 });
    }

    const phaseTypes = ['demolition', 'water_electric', 'painting', 'material_install', 'completion'];

    // 事务内仅做核心数据变更
    const txResult = await db.transaction(async (trx) => {
      // ① 审核通过订单
      await trx('material_orders').where('id', order.id).update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        updated_at: db.fn.now(),
      });

      // ② 创建 5 个阶段，仅填入设计人员，工程师字段留空
      const phaseIds = [];
      for (let i = 0; i < 5; i++) {
        const [phaseId] = await trx('construction_phases').insert({
          order_id: order.id,
          phase_type: phaseTypes[i],
          phase_order: i + 1,
          status: i === 0 ? 'assigned' : 'locked',
          designer_id,
          design_director_id,
        });
        phaseIds.push(phaseId);
      }

      // ③ 更新订单施工状态为设计阶段（施工尚未开始）
      await trx('material_orders').where('id', order.id).update({
        construction_status: 'design_phase',
        current_phase_order: 1,
        updated_at: db.fn.now(),
      });

      return { phaseIds };
    });

    // 事务已提交，以下副作用可安全使用全局 db 连接
    const phase1Id = txResult.phaseIds[0];
    const designerName = byId[designer_id]?.name || '';
    const designDirName = byId[design_director_id]?.name || '';

    // ④ 写操作日志
    await logAction(phase1Id, 'assign', operatorId,
      `管理员审核派单：设计师 ${designerName}，设计总监 ${designDirName}`);

    // ⑤ 推送订阅消息给设计师
    const projectLabel = await getProjectLabel(order.id);
    const designerOpenid = byId[designer_id]?.openid;
    await tryPush(designerOpenid, config.subscribeMessage.templates.todoNotify, {
      thing1: { value: projectLabel },
      thing2: { value: '打拆' },
      thing3: { value: '请上传设计图' },
      time4: { value: new Date().toISOString().slice(0, 10) },
    }, `pages/designer-task-detail/index?phaseId=${phase1Id}`);

    return {
      order_no: order.order_no,
      construction_status: 'in_progress',
      current_phase_order: 1,
      phases_created: 5,
    };
  },

  // ═══════ 派单 ═══════

  /**
   * 管理员派单 — 指派 4 个角色到阶段
   * 设计师和设计总监为必选项
   */
  async assignPhase(operatorId, phaseId, { designer_id, design_director_id, engineer_id, engineering_director_id }) {
    if (!designer_id || !design_director_id || !engineer_id || !engineering_director_id) {
      throw Object.assign(new Error('请指定设计师、设计总监、工程师和工程总监'), { status: 400 });
    }

    requireRoleSeparation(designer_id, design_director_id, engineer_id, engineering_director_id);

    const phase = await findPhase(phaseId);
    requireStatus(phase, 'unassigned');

    // 设计阶段仅在阶段1（打拆）执行，后续阶段跳过设计，直接指派施工人员
    if (phase.phase_order > 1) {
      throw Object.assign(new Error('阶段2-5无需设计审核，请使用指派施工人员接口'), { status: 400 });
    }

    // 校验 personnel_type
    const personIds = [designer_id, design_director_id, engineer_id, engineering_director_id];
    const persons = await db('designers').whereIn('id', personIds);
    const byId = {};
    persons.forEach(p => { byId[p.id] = p; });

    if (!byId[designer_id] || byId[designer_id].personnel_type !== 'designer') {
      throw Object.assign(new Error('指定的设计师 personnel_type 不正确'), { status: 400 });
    }
    if (!byId[design_director_id] || byId[design_director_id].personnel_type !== 'design_director') {
      throw Object.assign(new Error('指定的设计总监 personnel_type 不正确'), { status: 400 });
    }
    if (!byId[engineer_id] || byId[engineer_id].personnel_type !== 'engineer') {
      throw Object.assign(new Error('指定的工程师 personnel_type 不正确'), { status: 400 });
    }
    if (!byId[engineering_director_id] || byId[engineering_director_id].personnel_type !== 'engineering_director') {
      throw Object.assign(new Error('指定的工程总监 personnel_type 不正确'), { status: 400 });
    }

    const now = new Date().toISOString();

    await db('construction_phases').where('id', phaseId).update({
      status: 'assigned',
      designer_id,
      design_director_id,
      engineer_id,
      engineering_director_id,
      updated_at: db.fn.now(),
    });

    const designerName = byId[designer_id]?.name || '';
    const designDirName = byId[design_director_id]?.name || '';
    const engName = byId[engineer_id]?.name || '';
    const engDirName = byId[engineering_director_id]?.name || '';
    await logAction(phaseId, 'assign', operatorId, `管理员派单：设计师 ${designerName}，设计总监 ${designDirName}，工程师 ${engName}，工程总监 ${engDirName}`);

    // 推送通知给设计师
    const projectLabel = await getProjectLabel(phase.order_id);
    const designerOpenid = byId[designer_id]?.openid;
    await tryPush(designerOpenid, config.subscribeMessage.templates.todoNotify, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      thing3: { value: '请上传设计图' },
      time4: { value: now.slice(0, 10) },
    }, `pages/designer-task-detail/index?phaseId=${phaseId}`);

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 指派施工人员 ═══════

  /**
   * 管理员指派工程师+工程总监到阶段
   * - unassigned（阶段 2-5）→ 跳过设计链，直接 construction_confirmed
   * - owner_design_reviewed（阶段 1 设计完成）→ 仅填入人员，等待工程师 confirmDesign
   */
  async assignEngineer(operatorId, phaseId, { engineer_id, engineering_director_id }) {
    if (!engineer_id || !engineering_director_id) {
      throw Object.assign(new Error('请指定工程师和工程总监'), { status: 400 });
    }

    if (engineer_id === engineering_director_id) {
      throw Object.assign(new Error('工程师和工程总监不能是同一人'), { status: 400 });
    }

    const phase = await findPhase(phaseId);
    requireStatus(phase, 'unassigned', 'owner_design_reviewed');

    // 校验 personnel_type
    const persons = await db('designers').whereIn('id', [engineer_id, engineering_director_id]);
    const byId = {};
    persons.forEach(p => { byId[p.id] = p; });

    if (!byId[engineer_id] || byId[engineer_id].personnel_type !== 'engineer') {
      throw Object.assign(new Error('指定的工程师 personnel_type 不正确'), { status: 400 });
    }
    if (!byId[engineering_director_id] || byId[engineering_director_id].personnel_type !== 'engineering_director') {
      throw Object.assign(new Error('指定的工程总监 personnel_type 不正确'), { status: 400 });
    }

    const now = new Date().toISOString();
    const skipDesign = phase.status === 'unassigned';
    const targetStatus = skipDesign ? 'construction_confirmed' : phase.status;

    await db('construction_phases').where('id', phaseId).update({
      status: targetStatus,
      engineer_id,
      engineering_director_id,
      ...(skipDesign ? { construction_confirmed_at: now } : {}),
      updated_at: db.fn.now(),
    });

    // 首次从设计阶段转入施工，更新订单施工状态
    if (!skipDesign) {
      await db('material_orders').where('id', phase.order_id).update({
        construction_status: 'in_progress',
        updated_at: db.fn.now(),
      });
    }

    const engName = byId[engineer_id]?.name || '';
    const engDirName = byId[engineering_director_id]?.name || '';
    const detail = skipDesign
      ? `管理员指派施工人员（跳过设计环节）：工程师 ${engName}，工程总监 ${engDirName}`
      : `管理员指派施工人员：工程师 ${engName}，工程总监 ${engDirName}`;
    await logAction(phaseId, 'assign', operatorId, detail);

    // 推送通知给工程师
    const projectLabel = await getProjectLabel(phase.order_id);
    const engineerOpenid = byId[engineer_id]?.openid;
    await tryPush(engineerOpenid, config.subscribeMessage.templates.todoNotify, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      thing3: { value: skipDesign ? '请开始施工并上传完工图' : '设计已通过业主审核，请确认并开始施工' },
      time4: { value: now.slice(0, 10) },
    }, `pages/engineer-task-detail/index?phaseId=${phaseId}`);

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 设计师上传设计图 ═══════

  async uploadDesign(userId, phaseId, { images }) {
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw Object.assign(new Error('请至少上传一张设计图'), { status: 400 });
    }
    if (images.length > 9) {
      throw Object.assign(new Error('最多上传9张设计图'), { status: 400 });
    }

    const phase = await findPhase(phaseId);
    if (phase.designer_id !== userId) {
      throw Object.assign(new Error('您不是该阶段指派的设计师'), { status: 403 });
    }
    requireStatus(phase, 'assigned', 'design_director_rejected', 'design_admin_rejected');

    const now = new Date().toISOString();

    // 清除之前的驳回原因
    await db('construction_phases').where('id', phaseId).update({
      status: 'design_uploaded',
      design_images: JSON.stringify(images),
      design_uploaded_at: now,
      design_director_reject_reason: null,
      updated_at: db.fn.now(),
    });

    await logAction(phaseId, 'design_upload', userId, `设计师上传设计图，共 ${images.length} 张`);

    // 推送给设计总监
    const projectLabel = await getProjectLabel(phase.order_id);
    const directorOpenid = await getUserOpenid(phase.design_director_id);
    await tryPush(directorOpenid, config.subscribeMessage.templates.todoNotify, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      thing3: { value: '设计图已上传，请审核' },
      time4: { value: now.slice(0, 10) },
    }, `pages/design-director-review-detail/index?phaseId=${phaseId}`);

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 设计总监审核 ═══════

  async reviewDesignDirector(userId, phaseId, { action, reason }) {
    if (!['approve', 'reject'].includes(action)) {
      throw Object.assign(new Error('无效的审核操作'), { status: 400 });
    }

    const phase = await findPhase(phaseId);
    if (phase.design_director_id !== userId) {
      throw Object.assign(new Error('您不是该阶段指派的设计总监'), { status: 403 });
    }
    requireStatus(phase, 'design_uploaded');

    if (action === 'reject') {
      if (!reason || !reason.trim()) {
        throw Object.assign(new Error('驳回设计必须填写原因'), { status: 400 });
      }
      if (reason.length > 500) {
        throw Object.assign(new Error('驳回原因不能超过500个字符'), { status: 400 });
      }
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      await db('construction_phases').where('id', phaseId).update({
        status: 'design_director_approved',
        design_director_reviewed_at: now,
        design_director_reject_reason: null,
        updated_at: db.fn.now(),
      });

      await logAction(phaseId, 'design_director_approve', userId, '设计总监审核通过设计图');

      // 推送管理员二审
      const projectLabel = await getProjectLabel(phase.order_id);
      const adminOpenid = await getUserOpenid(phase.design_reviewed_by || null);
      // 管理员在小程序端可能没有 openid，改为推送到管理后台概念（不推送小程序端管理员）
      // 管理员在管理后台查看，此处仅记录日志
    } else {
      await db('construction_phases').where('id', phaseId).update({
        status: 'design_director_rejected',
        design_director_reviewed_at: now,
        design_director_reject_reason: reason.trim(),
        updated_at: db.fn.now(),
      });

      await logAction(phaseId, 'design_director_reject', userId, `设计总监驳回设计，原因：${reason.trim()}`);

      // 推送给设计师
      const projectLabel = await getProjectLabel(phase.order_id);
      const designerOpenid = await getUserOpenid(phase.designer_id);
      await tryPush(designerOpenid, config.subscribeMessage.templates.reviewResult, {
        thing1: { value: projectLabel },
        thing2: { value: PHASE_LABELS[phase.phase_type] },
        phrase3: { value: '驳回' },
        thing4: { value: reason.trim() },
      }, `pages/designer-task-detail/index?phaseId=${phaseId}`);
    }

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 管理员二审设计 ═══════

  async reviewDesignAdmin(operatorId, phaseId, { action, reason }) {
    if (!['approve', 'reject'].includes(action)) {
      throw Object.assign(new Error('无效的审核操作'), { status: 400 });
    }

    const phase = await findPhase(phaseId);
    if (phase.status !== 'design_director_approved') {
      requireStatus(phase, 'design_director_approved');
    }

    if (action === 'reject') {
      if (!reason || !reason.trim()) {
        throw Object.assign(new Error('驳回设计必须填写原因'), { status: 400 });
      }
      if (reason.length > 500) {
        throw Object.assign(new Error('驳回原因不能超过500个字符'), { status: 400 });
      }
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      await db('construction_phases').where('id', phaseId).update({
        status: 'design_admin_approved',
        design_reviewed_by: operatorId,
        design_reviewed_at: now,
        design_reject_reason: null,
        updated_at: db.fn.now(),
      });

      await logAction(phaseId, 'design_admin_approve', operatorId, '管理员二审通过设计图');

      // 推送给业主审核设计图
      const projectLabel = await getProjectLabel(phase.order_id);
      const order = await db('material_orders').where('id', phase.order_id).first();
      const ownerOpenid = await getUserOpenid(order.user_id);
      await tryPush(ownerOpenid, config.subscribeMessage.templates.acceptNotify, {
        thing1: { value: projectLabel },
        thing2: { value: PHASE_LABELS[phase.phase_type] },
        thing3: { value: '设计图已通过管理员审核，请审核设计图' },
      }, `pages/material-order-detail/index?orderNo=${order.order_no}`);
    } else {
      await db('construction_phases').where('id', phaseId).update({
        status: 'design_admin_rejected',
        design_reviewed_by: operatorId,
        design_reviewed_at: now,
        design_reject_reason: reason.trim(),
        updated_at: db.fn.now(),
      });

      await logAction(phaseId, 'design_admin_reject', operatorId, `管理员二审驳回设计，原因：${reason.trim()}`);
    }

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 业主审核设计图 ═══════

  /**
   * 业主通过设计图 — design_admin_approved → owner_design_reviewed
   */
  async ownerApproveDesign(userId, phaseId) {
    const phase = await findPhase(phaseId);
    const order = await db('material_orders').where('id', phase.order_id).first();
    if (!order) {
      throw Object.assign(new Error('关联订单不存在'), { status: 404 });
    }
    if (order.user_id !== userId) {
      throw Object.assign(new Error('您不是该订单的业主'), { status: 403 });
    }
    requireStatus(phase, 'design_admin_approved');

    const now = new Date().toISOString();
    await db('construction_phases').where('id', phaseId).update({
      status: 'owner_design_reviewed',
      owner_design_reviewed_at: now,
      owner_design_dispute_reason: null,
      owner_design_dispute_images: null,
      updated_at: db.fn.now(),
    });

    await logAction(phaseId, 'owner_design_approve', userId, '业主审核通过设计图');

    // 推送给工程师
    const projectLabel = await getProjectLabel(phase.order_id);
    const engineerOpenid = await getUserOpenid(phase.engineer_id);
    await tryPush(engineerOpenid, config.subscribeMessage.templates.todoNotify, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      thing3: { value: '设计图已通过业主审核，请确认并开始施工' },
      time4: { value: now.slice(0, 10) },
    }, `pages/engineer-task-detail/index?phaseId=${phaseId}`);

    return db('construction_phases').where('id', phaseId).first();
  },

  /**
   * 业主驳回设计图 — design_admin_approved → owner_design_disputed
   */
  async ownerDisputeDesign(userId, phaseId, { reason, images }) {
    const phase = await findPhase(phaseId);
    const order = await db('material_orders').where('id', phase.order_id).first();
    if (!order) {
      throw Object.assign(new Error('关联订单不存在'), { status: 404 });
    }
    if (order.user_id !== userId) {
      throw Object.assign(new Error('您不是该订单的业主'), { status: 403 });
    }
    requireStatus(phase, 'design_admin_approved');

    if (!reason || !reason.trim()) {
      throw Object.assign(new Error('请填写驳回原因'), { status: 400 });
    }
    if (reason.length > 500) {
      throw Object.assign(new Error('驳回原因不能超过500个字符'), { status: 400 });
    }
    const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
    if (imageList.length > 9) {
      throw Object.assign(new Error('最多上传9张图片'), { status: 400 });
    }

    await db('construction_phases').where('id', phaseId).update({
      status: 'owner_design_disputed',
      owner_design_dispute_reason: reason.trim(),
      owner_design_dispute_images: imageList.length > 0 ? JSON.stringify(imageList) : null,
      updated_at: db.fn.now(),
    });

    const detail = imageList.length > 0
      ? `业主驳回设计图，原因：${reason.trim()}，附 ${imageList.length} 张图片`
      : `业主驳回设计图，原因：${reason.trim()}`;
    await logAction(phaseId, 'owner_design_dispute', userId, detail);

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 工程师确认设计 ═══════

  /**
   * 工程师确认设计图 → engineer_design_confirmed
   * 等待工程总监二次确认后进入施工
   */
  async confirmDesign(userId, phaseId) {
    const phase = await findPhase(phaseId);
    if (phase.engineer_id !== userId) {
      throw Object.assign(new Error('您不是该阶段指派的工程师'), { status: 403 });
    }
    requireStatus(phase, 'design_admin_approved', 'owner_design_reviewed');

    const now = new Date().toISOString();
    await db('construction_phases').where('id', phaseId).update({
      status: 'engineer_design_confirmed',
      updated_at: db.fn.now(),
    });

    await logAction(phaseId, 'engineer_design_confirm', userId, '工程师确认设计图无误，等待工程总监确认');

    // 推送给工程总监
    const projectLabel = await getProjectLabel(phase.order_id);
    const directorOpenid = await getUserOpenid(phase.engineering_director_id);
    await tryPush(directorOpenid, config.subscribeMessage.templates.todoNotify, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      thing3: { value: '工程师已确认设计图，请审核确认' },
      time4: { value: now.slice(0, 10) },
    }, `pages/engineering-director-review-detail/index?phaseId=${phaseId}`);

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 工程总监确认设计 ═══════

  /**
   * 工程总监确认设计图 → construction_confirmed
   * 确认后工程师可开始施工
   */
  async directorConfirmDesign(userId, phaseId) {
    const phase = await findPhase(phaseId);
    if (phase.engineering_director_id !== userId) {
      throw Object.assign(new Error('您不是该阶段指派的工程总监'), { status: 403 });
    }
    requireStatus(phase, 'engineer_design_confirmed');

    const now = new Date().toISOString();
    await db('construction_phases').where('id', phaseId).update({
      status: 'construction_confirmed',
      construction_confirmed_at: now,
      updated_at: db.fn.now(),
    });

    await logAction(phaseId, 'director_design_confirm', userId, '工程总监确认设计图，进入施工阶段');

    // 推送给工程师开始施工
    const projectLabel = await getProjectLabel(phase.order_id);
    const engineerOpenid = await getUserOpenid(phase.engineer_id);
    await tryPush(engineerOpenid, config.subscribeMessage.templates.todoNotify, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      thing3: { value: '设计已通过总监确认，请开始施工并上传完工图' },
      time4: { value: now.slice(0, 10) },
    }, `pages/engineer-task-detail/index?phaseId=${phaseId}`);

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 工程师上传完工图 ═══════

  async uploadConstruction(userId, phaseId, { images }) {
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw Object.assign(new Error('请至少上传一张完工图'), { status: 400 });
    }
    if (images.length > 9) {
      throw Object.assign(new Error('最多上传9张完工图'), { status: 400 });
    }

    const phase = await findPhase(phaseId);
    if (phase.engineer_id !== userId) {
      throw Object.assign(new Error('您不是该阶段指派的工程师'), { status: 403 });
    }
    requireStatus(phase, 'construction_confirmed', 'engineering_director_rejected');

    const now = new Date().toISOString();
    await db('construction_phases').where('id', phaseId).update({
      status: 'construction_uploaded',
      construction_images: JSON.stringify(images),
      construction_uploaded_at: now,
      engineering_director_reject_reason: null,
      updated_at: db.fn.now(),
    });

    await logAction(phaseId, 'construction_upload', userId, `工程师上传完工图，共 ${images.length} 张`);

    // 推送给工程总监
    const projectLabel = await getProjectLabel(phase.order_id);
    const directorOpenid = await getUserOpenid(phase.engineering_director_id);
    await tryPush(directorOpenid, config.subscribeMessage.templates.todoNotify, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      thing3: { value: '完工图已上传，请审核' },
      time4: { value: now.slice(0, 10) },
    }, `pages/engineering-director-review-detail/index?phaseId=${phaseId}`);

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 工程总监审核 ═══════

  async reviewEngineeringDirector(userId, phaseId, { action, reason }) {
    if (!['approve', 'reject'].includes(action)) {
      throw Object.assign(new Error('无效的审核操作'), { status: 400 });
    }

    const phase = await findPhase(phaseId);
    if (phase.engineering_director_id !== userId) {
      throw Object.assign(new Error('您不是该阶段指派的工程总监'), { status: 403 });
    }
    requireStatus(phase, 'construction_uploaded');

    if (action === 'reject') {
      if (!reason || !reason.trim()) {
        throw Object.assign(new Error('驳回完工必须填写原因'), { status: 400 });
      }
      if (reason.length > 500) {
        throw Object.assign(new Error('驳回原因不能超过500个字符'), { status: 400 });
      }
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      await db('construction_phases').where('id', phaseId).update({
        status: 'engineering_director_approved',
        engineering_director_reviewed_at: now,
        engineering_director_reject_reason: null,
        updated_at: db.fn.now(),
      });
      await logAction(phaseId, 'engineering_director_approve', userId, '工程总监审核通过完工图');
    } else {
      await db('construction_phases').where('id', phaseId).update({
        status: 'engineering_director_rejected',
        engineering_director_reviewed_at: now,
        engineering_director_reject_reason: reason.trim(),
        updated_at: db.fn.now(),
      });
      await logAction(phaseId, 'engineering_director_reject', userId, `工程总监驳回完工，原因：${reason.trim()}`);

      // 推送给工程师
      const projectLabel = await getProjectLabel(phase.order_id);
      const engineerOpenid = await getUserOpenid(phase.engineer_id);
      await tryPush(engineerOpenid, config.subscribeMessage.templates.reviewResult, {
        thing1: { value: projectLabel },
        thing2: { value: PHASE_LABELS[phase.phase_type] },
        phrase3: { value: '驳回' },
        thing4: { value: reason.trim() },
      }, `pages/engineer-task-detail/index?phaseId=${phaseId}`);
    }

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 管理员二审完工 ═══════

  async reviewConstructionAdmin(operatorId, phaseId, { action, reason }) {
    if (!['approve', 'reject'].includes(action)) {
      throw Object.assign(new Error('无效的审核操作'), { status: 400 });
    }

    const phase = await findPhase(phaseId);
    requireStatus(phase, 'engineering_director_approved', 'owner_disputed');

    if (action === 'reject') {
      if (!reason || !reason.trim()) {
        throw Object.assign(new Error('驳回完工必须填写原因'), { status: 400 });
      }
      if (reason.length > 500) {
        throw Object.assign(new Error('驳回原因不能超过500个字符'), { status: 400 });
      }
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      await db('construction_phases').where('id', phaseId).update({
        status: 'construction_admin_approved',
        construction_reviewed_by: operatorId,
        construction_reviewed_at: now,
        construction_reject_reason: null,
        updated_at: db.fn.now(),
      });
      await logAction(phaseId, 'construction_admin_approve', operatorId, '管理员二审通过完工图');

      // 推送给业主
      const projectLabel = await getProjectLabel(phase.order_id);
      const order = await db('material_orders').where('id', phase.order_id).first();
      const ownerOpenid = await getUserOpenid(order.user_id);
      await tryPush(ownerOpenid, config.subscribeMessage.templates.acceptNotify, {
        thing1: { value: projectLabel },
        thing2: { value: PHASE_LABELS[phase.phase_type] },
        thing3: { value: '已完工，请验收' },
      }, `pages/material-order-detail/index?orderNo=${order.order_no}`);
    } else {
      await db('construction_phases').where('id', phaseId).update({
        status: 'construction_admin_rejected',
        construction_reviewed_by: operatorId,
        construction_reviewed_at: now,
        construction_reject_reason: reason.trim(),
        updated_at: db.fn.now(),
      });
      await logAction(phaseId, 'construction_admin_reject', operatorId, `管理员二审驳回完工，原因：${reason.trim()}`);

      // 推送给工程师
      const projectLabel = await getProjectLabel(phase.order_id);
      const engineerOpenid = await getUserOpenid(phase.engineer_id);
      await tryPush(engineerOpenid, config.subscribeMessage.templates.reviewResult, {
        thing1: { value: projectLabel },
        thing2: { value: PHASE_LABELS[phase.phase_type] },
        phrase3: { value: '驳回' },
        thing4: { value: reason.trim() },
      }, `pages/engineer-task-detail/index?phaseId=${phaseId}`);
    }

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 业主验收通过 ═══════

  async acceptPhase(userId, phaseId) {
    const phase = await findPhase(phaseId);
    const order = await db('material_orders').where('id', phase.order_id).first();
    if (!order) {
      throw Object.assign(new Error('关联订单不存在'), { status: 404 });
    }
    if (order.user_id !== userId) {
      throw Object.assign(new Error('您不是该订单的业主'), { status: 403 });
    }
    requireStatus(phase, 'construction_admin_approved');

    const now = new Date().toISOString();

    // 事务内仅做核心数据变更
    const txResult = await db.transaction(async (trx) => {
      await trx('construction_phases').where('id', phaseId).update({
        status: 'owner_accepted',
        owner_accepted_at: now,
        dispute_reason: null,
        dispute_images: null,
        updated_at: db.fn.now(),
      });

      // 解锁下一阶段
      const nextPhase = await trx('construction_phases')
        .where('order_id', phase.order_id)
        .where('phase_order', phase.phase_order + 1)
        .where('status', 'locked')
        .first();

      let nextPhaseId = null;
      if (nextPhase) {
        await trx('construction_phases').where('id', nextPhase.id).update({
          status: 'unassigned',
          updated_at: db.fn.now(),
        });
        await trx('material_orders').where('id', order.id).update({
          current_phase_order: nextPhase.phase_order,
          updated_at: db.fn.now(),
        });
        nextPhaseId = nextPhase.id;
      }

      // 阶段5验收通过 → 整个项目竣工
      if (phase.phase_order === 5) {
        await trx('material_orders').where('id', order.id).update({
          construction_status: 'completed',
          status: 'construction_completed',
          updated_at: db.fn.now(),
        });
      }

      return { nextPhaseId, nextPhaseOrder: nextPhase?.phase_order || null, isCompleted: phase.phase_order === 5 };
    });

    // 事务已提交，写操作日志（事务外）
    await logAction(phaseId, 'owner_accept', userId, '业主验收通过');
    if (txResult.nextPhaseId) {
      await logAction(txResult.nextPhaseId, 'assign', userId, `阶段${txResult.nextPhaseOrder}已解锁，等待管理员派单`);
    }

    // 推送管理员
    const projectLabel = await getProjectLabel(phase.order_id);
    const adminOpenid = await getUserOpenid(1); // 管理员通常 id=1
    await tryPush(adminOpenid, config.subscribeMessage.templates.acceptResult, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      phrase3: { value: '通过' },
      thing4: { value: phase.phase_order === 5 ? '项目全部竣工' : '进入下一阶段' },
    }, '');

    // 推送业主（阶段通过）
    const orderForPush = await db('material_orders').where('id', phase.order_id).first();
    const ownerOpenid = await getUserOpenid(orderForPush.user_id);
    if (phase.phase_order < 5) {
      const nextLabel = PHASE_LABELS[
        ['demolition', 'water_electric', 'painting', 'material_install', 'completion'][phase.phase_order]
      ];
      await tryPush(ownerOpenid, config.subscribeMessage.templates.phasePass, {
        thing1: { value: projectLabel },
        thing2: { value: PHASE_LABELS[phase.phase_type] },
        thing3: { value: nextLabel },
        thing4: { value: '请等待管理员派单' },
      }, `pages/material-order-detail/index?orderNo=${orderForPush.order_no}`);
    }

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 业主驳回 ═══════

  async disputePhase(userId, phaseId, { reason, images }) {
    const phase = await findPhase(phaseId);
    const order = await db('material_orders').where('id', phase.order_id).first();
    if (!order) {
      throw Object.assign(new Error('关联订单不存在'), { status: 404 });
    }
    if (order.user_id !== userId) {
      throw Object.assign(new Error('您不是该订单的业主'), { status: 403 });
    }
    requireStatus(phase, 'construction_admin_approved');

    if (!reason || !reason.trim()) {
      throw Object.assign(new Error('请填写驳回原因'), { status: 400 });
    }
    if (reason.length > 500) {
      throw Object.assign(new Error('驳回原因不能超过500个字符'), { status: 400 });
    }
    const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
    if (imageList.length > 9) {
      throw Object.assign(new Error('最多上传9张图片'), { status: 400 });
    }

    await db('construction_phases').where('id', phaseId).update({
      status: 'owner_disputed',
      dispute_reason: reason.trim(),
      dispute_images: imageList.length > 0 ? JSON.stringify(imageList) : null,
      updated_at: db.fn.now(),
    });

    const detail = imageList.length > 0
      ? `业主驳回验收，原因：${reason.trim()}，附 ${imageList.length} 张图片`
      : `业主驳回验收，原因：${reason.trim()}`;
    await logAction(phaseId, 'owner_dispute', userId, detail);

    // 推送管理员
    const projectLabel = await getProjectLabel(phase.order_id);
    const adminOpenid = await getUserOpenid(1);
    await tryPush(adminOpenid, config.subscribeMessage.templates.acceptResult, {
      thing1: { value: projectLabel },
      thing2: { value: PHASE_LABELS[phase.phase_type] },
      phrase3: { value: '驳回' },
      thing4: { value: reason.trim() },
    }, '');

    return db('construction_phases').where('id', phaseId).first();
  },

  // ═══════ 查询方法 ═══════

  /** 单阶段详情（含日志 + 人员名称） */
  async getPhaseDetail(phaseId) {
    const phase = await db('construction_phases')
      .select('construction_phases.*', 'material_orders.order_no', 'material_orders.current_phase_order')
      .leftJoin('material_orders', 'construction_phases.order_id', 'material_orders.id')
      .where('construction_phases.id', phaseId)
      .first();
    if (!phase) {
      throw Object.assign(new Error('施工阶段不存在'), { status: 404 });
    }

    // 解析 JSON 字段
    phase.design_images = safeJsonParse(phase.design_images);
    phase.construction_images = safeJsonParse(phase.construction_images);
    phase.dispute_images = safeJsonParse(phase.dispute_images);
    phase.owner_design_dispute_images = safeJsonParse(phase.owner_design_dispute_images);

    // 查询人员名称
    const personIds = [phase.designer_id, phase.design_director_id, phase.engineer_id,
      phase.engineering_director_id, phase.design_reviewed_by, phase.construction_reviewed_by].filter(Boolean);
    const persons = personIds.length > 0
      ? await db('designers').select('id', 'name', 'phone', 'personnel_type').whereIn('id', personIds)
      : [];
    phase.persons = persons;

    // 查询操作日志
    const logs = await db('construction_phase_logs')
      .select('construction_phase_logs.*', 'designers.name as operator_name')
      .leftJoin('designers', 'construction_phase_logs.operator_id', 'designers.id')
      .where('phase_id', phaseId)
      .orderBy('created_at', 'asc');
    phase.logs = logs;

    return phase;
  },

  /** 获取订单全部 5 阶段 */
  async getOrderPhases(orderNo) {
    const order = await db('material_orders')
      .select('id', 'order_no', 'status', 'construction_status', 'current_phase_order')
      .where('order_no', orderNo).first();
    if (!order) {
      throw Object.assign(new Error('订单不存在'), { status: 404 });
    }

    const phases = await db('construction_phases')
      .where('order_id', order.id)
      .orderBy('phase_order', 'asc');

    // 解析 JSON + 查询人员
    const personIds = new Set();
    for (const p of phases) {
      p.design_images = safeJsonParse(p.design_images);
      p.construction_images = safeJsonParse(p.construction_images);
      p.dispute_images = safeJsonParse(p.dispute_images);
      p.owner_design_dispute_images = safeJsonParse(p.owner_design_dispute_images);
      [p.designer_id, p.design_director_id, p.engineer_id, p.engineering_director_id].forEach(id => {
        if (id) personIds.add(id);
      });
    }

    const persons = personIds.size > 0
      ? await db('designers').select('id', 'name', 'phone', 'personnel_type').whereIn('id', [...personIds])
      : [];
    const personMap = {};
    persons.forEach(p => { personMap[p.id] = p; });

    for (const p of phases) {
      p.designer = personMap[p.designer_id] || null;
      p.design_director = personMap[p.design_director_id] || null;
      p.engineer = personMap[p.engineer_id] || null;
      p.engineering_director = personMap[p.engineering_director_id] || null;
    }

    // 查询所有阶段的操作日志
    const phaseIds = phases.map(p => p.id);
    const allLogs = phaseIds.length > 0
      ? await db('construction_phase_logs')
          .select('*')
          .whereIn('phase_id', phaseIds)
          .orderBy('created_at', 'asc')
      : [];

    const logsByPhase = {};
    allLogs.forEach(log => {
      if (!logsByPhase[log.phase_id]) logsByPhase[log.phase_id] = [];
      logsByPhase[log.phase_id].push(log);
    });

    for (const p of phases) {
      p.logs = logsByPhase[p.id] || [];
    }

    return { order, phases };
  },
};

/** 安全解析 JSON 数组 */
function safeJsonParse(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch (_) { return []; }
}

// 阶段中文名
const PHASE_LABELS = {
  demolition: '打拆',
  water_electric: '水电',
  painting: '油工',
  material_install: '主材安装',
  completion: '竣工',
};

module.exports = constructionPhaseService;
