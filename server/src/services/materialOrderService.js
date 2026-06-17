const db = require('../db/connection');

/**
 * 选材申请业务逻辑（V1.1 新增）
 */
const materialOrderService = {
  // ==========================================
  // 订单号生成：YYYYMMDD(6) + property_code(2) + daily_sequence(2)
  // 带重试机制，最多重试 3 次
  // ==========================================
  async generateOrderNo(propertyCode, retries = 3) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${y}${m}${d}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      // 查询今日该楼盘最大序号
      const [row] = await db('material_orders')
        .where('order_no', 'like', `${datePrefix}${propertyCode}%`)
        .orderBy('order_no', 'desc')
        .limit(1)
        .select('order_no');

      let seq = 1;
      if (row && row.order_no) {
        const lastSeq = parseInt(row.order_no.slice(-2), 10);
        seq = lastSeq + 1;
      }

      if (seq > 99) {
        throw Object.assign(new Error('今日该楼盘订单已满，请明日再试'), { status: 429 });
      }

      const orderNo = `${datePrefix}${propertyCode}${String(seq).padStart(2, '0')}`;

      // 检查唯一性（并发安全：利用数据库 UNIQUE 约束）
      const exists = await db('material_orders').where('order_no', orderNo).first();
      if (!exists) {
        return orderNo;
      }
    }

    throw Object.assign(new Error('订单号生成失败，请重试'), { status: 500 });
  },

  // ==========================================
  // 提交选材申请
  // ==========================================
  async submitOrder(userId, { property_id, room_number, applicant_name, applicant_phone, remark, items }) {
    // ── 1. 参数校验 ──
    if (!property_id || !room_number || !applicant_name || !applicant_phone) {
      throw Object.assign(new Error('楼盘、房号、联系人姓名和电话为必填字段'), { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw Object.assign(new Error('请至少选择一种材料'), { status: 400 });
    }
    if (!/^1[3-9]\d{9}$/.test(applicant_phone)) {
      throw Object.assign(new Error('手机号格式不正确'), { status: 400 });
    }
    if (applicant_name.length > 32) {
      throw Object.assign(new Error('联系人姓名不能超过32个字符'), { status: 400 });
    }
    if (room_number.length > 64) {
      throw Object.assign(new Error('房号不能超过64个字符'), { status: 400 });
    }
    if (remark && remark.length > 200) {
      throw Object.assign(new Error('备注不能超过200个字符'), { status: 400 });
    }

    // ── 2. 校验每类单选（同一 category_id 下只能有一个 material_id）──
    const categoryMap = {};
    for (const item of items) {
      if (!item.material_id || !item.category_id) {
        throw Object.assign(new Error('材料项缺少 material_id 或 category_id'), { status: 400 });
      }
      if (categoryMap[item.category_id]) {
        throw Object.assign(
          new Error('同一材料分类下只能选择一个材料'),
          { status: 400 }
        );
      }
      categoryMap[item.category_id] = item.material_id;
    }

    // ── 3. 验证楼盘存在且已开通选材 ──
    const property = await db('properties').where('id', property_id).first();
    if (!property) {
      throw Object.assign(new Error('楼盘不存在'), { status: 404 });
    }
    if (!property.material_enabled) {
      throw Object.assign(new Error('该楼盘未开通选材功能'), { status: 400 });
    }

    // ── 4. 业主身份校验：仅该小区业主可提交 ──
    const user = await db('designers').where('id', userId).first();
    if (!user || user.role !== 'owner') {
      throw Object.assign(new Error('仅业主可提交选材申请'), { status: 403 });
    }
    if (user.owner_property_id !== property_id) {
      throw Object.assign(new Error('您不是该楼盘的业主，无法提交选材申请'), { status: 403 });
    }

    // 业主房号自动覆盖（从后台取楼栋号+房号）
    const ownerRoom = [user.building, user.room].filter(Boolean).join('');
    const effectiveRoom = ownerRoom || room_number;

    // ── 5. 验证所有材料存在、属于该楼盘、分类匹配、库存充足 ──
    const materialIds = items.map((i) => i.material_id);
    const materials = await db('materials').whereIn('id', materialIds);

    if (materials.length !== materialIds.length) {
      throw Object.assign(new Error('部分材料不存在'), { status: 400 });
    }

    for (const item of items) {
      const material = materials.find((m) => m.id === item.material_id);
      if (material.property_id !== property_id) {
        throw Object.assign(
          new Error(`材料"${material.name}"不属于该楼盘`),
          { status: 400 }
        );
      }
      if (material.category_id !== item.category_id) {
        throw Object.assign(
          new Error(`材料"${material.name}"的分类不匹配`),
          { status: 400 }
        );
      }
      // 库存校验
      if (material.quantity <= 0) {
        throw Object.assign(
          new Error(`材料"${material.name}"库存不足，无法提交`),
          { status: 400 }
        );
      }
    }

    // ── 6. 生成订单号 & 入库（事务）──
    const orderNo = await this.generateOrderNo(property.property_code);

    // 使用 Knex 事务确保原子性
    const trx = await db.transaction();

    try {
      // 6a. 创建订单
      await trx('material_orders').insert({
        order_no: orderNo,
        property_id,
        room_number: effectiveRoom,
        user_id: userId,
        applicant_name,
        applicant_phone,
        remark: remark || null,
        status: 'pending',
      });

      // 获取 order_id
      const order = await trx('material_orders').where('order_no', orderNo).first();

      // 5b. 创建订单-材料关联（含价格快照）
      const orderItems = items.map((item) => {
        const material = materials.find((m) => m.id === item.material_id);
        return {
          order_id: order.id,
          material_id: item.material_id,
          category_id: item.category_id,
          price_snapshot: material.unit_price,
        };
      });
      await trx.batchInsert('material_order_items', orderItems);

      // 6c. 扣减库存
      for (const item of items) {
        await trx('materials').where('id', item.material_id).decrement('quantity', 1);
      }

      // 6d. 记录操作日志
      await trx('material_order_logs').insert({
        order_id: order.id,
        action: 'submit',
        operator_id: userId,
        detail: `用户提交选材申请，共 ${items.length} 种材料`,
      });

      await trx.commit();

      return {
        order_no: orderNo,
        status: 'pending',
        created_at: order.created_at,
      };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },

  // ==========================================
  // 用户端 — 我的申请列表（分页）
  // ==========================================
  async listMyOrders(userId, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;

    const query = db('material_orders')
      .select(
        'material_orders.order_no',
        'material_orders.room_number',
        'material_orders.status',
        'material_orders.created_at',
        'properties.name as property_name'
      )
      .leftJoin('properties', 'material_orders.property_id', 'properties.id')
      .where('material_orders.user_id', userId);

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('material_orders.created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 用户端 — 申请详情（仅可查看自己的申请）
  // ==========================================
  async getMyOrderDetail(userId, orderNo) {
    const order = await db('material_orders')
      .select(
        'material_orders.*',
        'properties.name as property_name'
      )
      .leftJoin('properties', 'material_orders.property_id', 'properties.id')
      .where('material_orders.order_no', orderNo)
      .first();

    if (!order) {
      throw Object.assign(new Error('申请不存在'), { status: 404 });
    }

    // 权限校验：仅可查看自己的申请
    if (order.user_id !== userId) {
      throw Object.assign(new Error('无权查看该申请'), { status: 403 });
    }

    // 查询订单项
    const items = await db('material_order_items')
      .select(
        'material_categories.name as category_name',
        'materials.name as material_name',
        'materials.brand',
        'material_order_items.price_snapshot as unit_price',
        'materials.price_unit'
      )
      .leftJoin('materials', 'material_order_items.material_id', 'materials.id')
      .leftJoin('material_categories', 'material_order_items.category_id', 'material_categories.id')
      .where('material_order_items.order_id', order.id);

    // 查询操作日志
    const logs = await db('material_order_logs')
      .select('action', 'detail', 'created_at')
      .where('order_id', order.id)
      .orderBy('created_at', 'asc');

    // 查询分配的设计师和监理（仅 approved/completed 时返回）
    let designer = null;
    let supervisor = null;
    if (order.designer_id) {
      const d = await db('designers')
        .select('id', 'name', 'phone')
        .where('id', order.designer_id)
        .first();
      if (d) {
        designer = {
          id: d.id,
          name: d.name,
          phone: d.phone ? d.phone.slice(0, 3) + '****' + d.phone.slice(7) : null,
        };
      }
    }
    if (order.supervisor_id) {
      const s = await db('designers')
        .select('id', 'name', 'phone')
        .where('id', order.supervisor_id)
        .first();
      if (s) {
        supervisor = {
          id: s.id,
          name: s.name,
          phone: s.phone ? s.phone.slice(0, 3) + '****' + s.phone.slice(7) : null,
        };
      }
    }

    // 施工阶段数据（V1.3）
    let construction = null;
    try {
      const constructionPhaseService = require('./constructionPhaseService');
      construction = await constructionPhaseService.getOrderPhases(order.order_no);
    } catch (_) { /* 施工阶段可能不存在（老数据） */ }

    const result = {
      order_no: order.order_no,
      status: order.status,
      property_name: order.property_name,
      room_number: order.room_number,
      applicant_name: order.applicant_name,
      applicant_phone: order.applicant_phone,
      remark: order.remark,
      items,
      designer,
      supervisor,
      reviewed_at: order.reviewed_at,
      reject_reason: order.reject_reason,
      construction_status: order.construction_status || 'not_started',
      current_phase_order: order.current_phase_order || 0,
      construction,
      logs,
      created_at: order.created_at,
    };

    return result;
  },

  // ==========================================
  // 管理端 — 申请列表（多条件筛选 + 分页 + 手机脱敏）
  // ==========================================
  async listOrdersAdmin(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;

    let query = db('material_orders')
      .select(
        'material_orders.order_no',
        'material_orders.room_number',
        'material_orders.applicant_name',
        'material_orders.applicant_phone',
        'material_orders.status',
        'material_orders.construction_status',
        'material_orders.current_phase_order',
        'material_orders.created_at',
        'properties.name as property_name'
      )
      .leftJoin('properties', 'material_orders.property_id', 'properties.id');

    if (filters.property_id) {
      query = query.where('material_orders.property_id', parseInt(filters.property_id));
    }
    if (filters.order_no) {
      query = query.where('material_orders.order_no', filters.order_no);
    }
    if (filters.status) {
      query = query.where('material_orders.status', filters.status);
    }
    if (filters.construction_status) {
      query = query.where('material_orders.construction_status', filters.construction_status);
    }
    if (filters.date_from) {
      query = query.where('material_orders.created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('material_orders.created_at', '<=', `${filters.date_to} 23:59:59`);
    }

    const [{ count }] = await query.clone().count('* as count');

    const sortDir = filters.sort === 'asc' ? 'asc' : 'desc';
    const rows = await query
      .orderBy('material_orders.created_at', sortDir)
      .offset(offset)
      .limit(pageSize);

    // 手机号脱敏：中间4位 → ****
    const list = rows.map((row) => ({
      ...row,
      applicant_phone: row.applicant_phone
        ? row.applicant_phone.slice(0, 3) + '****' + row.applicant_phone.slice(7)
        : null,
    }));

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 管理端 — 申请详情（含完整手机号）
  // ==========================================
  async getOrderDetailAdmin(orderNo) {
    const order = await db('material_orders')
      .select(
        'material_orders.*',
        'properties.name as property_name'
      )
      .leftJoin('properties', 'material_orders.property_id', 'properties.id')
      .where('material_orders.order_no', orderNo)
      .first();

    if (!order) {
      throw Object.assign(new Error('申请不存在'), { status: 404 });
    }

    // 查询订单项
    const items = await db('material_order_items')
      .select(
        'material_categories.name as category_name',
        'materials.name as material_name',
        'materials.brand',
        'material_order_items.price_snapshot as unit_price',
        'materials.price_unit'
      )
      .leftJoin('materials', 'material_order_items.material_id', 'materials.id')
      .leftJoin('material_categories', 'material_order_items.category_id', 'material_categories.id')
      .where('material_order_items.order_id', order.id);

    // 查询操作日志
    const logs = await db('material_order_logs')
      .select('action', 'detail', 'created_at')
      .where('order_id', order.id)
      .orderBy('created_at', 'asc');

    // 查询分配的设计师和监理
    let designer = null;
    let supervisor = null;
    if (order.designer_id) {
      const d = await db('designers').select('id', 'name', 'phone').where('id', order.designer_id).first();
      if (d) designer = { id: d.id, name: d.name, phone: d.phone };
    }
    if (order.supervisor_id) {
      const s = await db('designers').select('id', 'name', 'phone').where('id', order.supervisor_id).first();
      if (s) supervisor = { id: s.id, name: s.name, phone: s.phone };
    }

    // 施工阶段数据（V1.3）
    let construction = null;
    try {
      const constructionPhaseService = require('./constructionPhaseService');
      construction = await constructionPhaseService.getOrderPhases(order.order_no);
    } catch (_) { /* 施工阶段可能不存在（老数据） */ }

    return {
      order_no: order.order_no,
      status: order.status,
      property_name: order.property_name,
      room_number: order.room_number,
      applicant_name: order.applicant_name,
      applicant_phone: order.applicant_phone,
      remark: order.remark,
      items,
      designer,
      supervisor,
      reviewed_at: order.reviewed_at,
      reject_reason: order.reject_reason,
      construction_status: order.construction_status || 'not_started',
      current_phase_order: order.current_phase_order || 0,
      construction,
      logs,
      created_at: order.created_at,
    };
  },

  // ==========================================
  // 管理端 — 审核通过
  // ==========================================
  async approveOrder(operatorId, orderNo, { designer_id, supervisor_id }) {
    if (!designer_id || !supervisor_id) {
      throw Object.assign(new Error('请指定设计师和监理'), { status: 400 });
    }

    const order = await db('material_orders').where('order_no', orderNo).first();
    if (!order) {
      throw Object.assign(new Error('申请不存在'), { status: 404 });
    }
    if (order.status !== 'pending') {
      throw Object.assign(new Error('该订单当前状态不允许审核'), { status: 400 });
    }

    // 验证设计师 personnel_type
    const designer = await db('designers').where('id', designer_id).first();
    if (!designer || designer.personnel_type !== 'designer') {
      throw Object.assign(new Error('指定的人员不是设计师'), { status: 400 });
    }

    // 验证监理 personnel_type
    const supervisor = await db('designers').where('id', supervisor_id).first();
    if (!supervisor || supervisor.personnel_type !== 'supervisor') {
      throw Object.assign(new Error('指定的人员不是监理'), { status: 400 });
    }

    const now = new Date().toISOString();

    await db('material_orders').where('order_no', orderNo).update({
      status: 'approved',
      designer_id,
      supervisor_id,
      reviewed_by: operatorId,
      reviewed_at: now,
    });

    // 记录操作日志
    await db('material_order_logs').insert({
      order_id: order.id,
      action: 'approve',
      operator_id: operatorId,
      detail: `管理员审核通过，分配设计师 ${designer.name}，监理 ${supervisor.name}`,
    });

    return { order_no: orderNo, status: 'approved', reviewed_at: now };
  },

  // ==========================================
  // 管理端 — 删除订单（级联删除关联数据）
  // ==========================================
  async deleteOrder(orderNo) {
    const order = await db('material_orders').where('order_no', orderNo).first();
    if (!order) {
      throw Object.assign(new Error('申请不存在'), { status: 404 });
    }

    // 手动级联删除（SQLite 未开启外键约束）
    // 1. 删除施工阶段日志
    const phases = await db('construction_phases').where('order_id', order.id).select('id');
    if (phases.length > 0) {
      const phaseIds = phases.map(p => p.id);
      await db('construction_phase_logs').whereIn('phase_id', phaseIds).del();
    }
    // 2. 删除施工阶段
    await db('construction_phases').where('order_id', order.id).del();
    // 3. 删除选材订单项
    await db('material_order_items').where('order_id', order.id).del();
    // 4. 删除操作日志
    await db('material_order_logs').where('order_id', order.id).del();
    // 5. 删除订单
    await db('material_orders').where('id', order.id).del();

    return { deleted: orderNo };
  },

  // ==========================================
  // 管理端 — 驳回申请
  // ==========================================
  async rejectOrder(operatorId, orderNo, reason) {
    if (!reason) {
      throw Object.assign(new Error('请填写驳回原因'), { status: 400 });
    }
    if (reason.length > 500) {
      throw Object.assign(new Error('驳回原因不能超过500个字符'), { status: 400 });
    }

    const order = await db('material_orders').where('order_no', orderNo).first();
    if (!order) {
      throw Object.assign(new Error('申请不存在'), { status: 404 });
    }
    if (order.status !== 'pending') {
      throw Object.assign(new Error('该订单当前状态不允许审核'), { status: 400 });
    }

    const now = new Date().toISOString();

    await db('material_orders').where('order_no', orderNo).update({
      status: 'rejected',
      reviewed_by: operatorId,
      reviewed_at: now,
      reject_reason: reason,
    });

    // 记录操作日志
    await db('material_order_logs').insert({
      order_id: order.id,
      action: 'reject',
      operator_id: operatorId,
      detail: `管理员驳回申请，原因：${reason}`,
    });

    return { order_no: orderNo, status: 'rejected', reject_reason: reason, reviewed_at: now };
  },

};

module.exports = materialOrderService;
