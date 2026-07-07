const db = require('../db/connection');

/**
 * 量房预约管理业务逻辑
 */
const measurementAppointmentService = {
  // ==========================================
  // 公开接口 — 提交预约（无需登录）
  // ==========================================
  async create({ name, phone, property_name, room_number, area_size, expected_time, budget, remark, source, source_page }) {
    if (!name || !phone || !property_name) {
      throw Object.assign(new Error('姓名、手机号和楼盘名称为必填字段'), { status: 400 });
    }

    if (!/^1\d{10}$/.test(phone)) {
      throw Object.assign(new Error('手机号格式不正确'), { status: 400 });
    }

    if (name.length > 32) {
      throw Object.assign(new Error('姓名不能超过32个字符'), { status: 400 });
    }
    if (property_name.length > 64) {
      throw Object.assign(new Error('楼盘名称不能超过64个字符'), { status: 400 });
    }

    const [id] = await db('measurement_appointments').insert({
      name: name.trim(),
      phone,
      property_name: property_name.trim(),
      room_number: room_number || null,
      area_size: area_size || null,
      expected_time: expected_time || null,
      budget: budget || null,
      remark: remark || null,
      source: source || 'miniprogram',
      source_page: source_page || null,
      status: 0,
    });

    return db('measurement_appointments').where('id', id).first();
  },

  // ==========================================
  // 管理端 — 列表（分页 + 筛选）
  // ==========================================
  async listAdmin(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;

    let query = db('measurement_appointments').select('*');

    // 状态筛选
    if (filters.status !== undefined && filters.status !== '') {
      query = query.where('status', parseInt(filters.status));
    }

    // 来源筛选
    if (filters.source) {
      query = query.where('source', filters.source);
    }

    // 日期范围筛选
    if (filters.date_from) {
      query = query.where('created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('created_at', '<=', filters.date_to + ' 23:59:59');
    }

    // 关键词搜索（姓名 / 手机号）
    if (filters.keyword) {
      query = query.where(function () {
        this.where('name', 'like', `%${filters.keyword}%`)
          .orWhere('phone', 'like', `%${filters.keyword}%`);
      });
    }

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 管理端 — 详情
  // ==========================================
  async getById(id) {
    const appointment = await db('measurement_appointments').where('id', id).first();
    if (!appointment) {
      throw Object.assign(new Error('预约记录不存在'), { status: 404 });
    }
    return appointment;
  },

  // ==========================================
  // 管理端 — 编辑（备注等信息）
  // ==========================================
  async update(id, { name, phone, property_name, room_number, area_size, expected_time, budget, remark }) {
    const existing = await db('measurement_appointments').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('预约记录不存在'), { status: 404 });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone;
    if (property_name !== undefined) updates.property_name = property_name.trim();
    if (room_number !== undefined) updates.room_number = room_number;
    if (area_size !== undefined) updates.area_size = area_size;
    if (expected_time !== undefined) updates.expected_time = expected_time;
    if (budget !== undefined) updates.budget = budget;
    if (remark !== undefined) updates.remark = remark;
    updates.updated_at = db.fn.now();

    await db('measurement_appointments').where('id', id).update(updates);
    return db('measurement_appointments').where('id', id).first();
  },

  // ==========================================
  // 管理端 — 状态变更
  // ==========================================
  async updateStatus(id, status) {
    const existing = await db('measurement_appointments').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('预约记录不存在'), { status: 404 });
    }

    const validStatuses = [0, 1, 2, 3, 4];
    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error('无效的状态值'), { status: 400 });
    }

    await db('measurement_appointments')
      .where('id', id)
      .update({ status, updated_at: db.fn.now() });

    return db('measurement_appointments').where('id', id).first();
  },
};

module.exports = measurementAppointmentService;
