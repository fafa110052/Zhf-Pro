const db = require('../db/connection');

/**
 * 楼盘管理业务逻辑
 */
const propertyService = {
  // ==========================================
  // 管理端 — 楼盘列表（分页 + 筛选）
  // ==========================================
  async listAdmin(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;

    let query = db('properties')
      .select('properties.*')
      .select(db.raw('(SELECT COUNT(*) FROM materials WHERE materials.property_id = properties.id) as material_count'));

    // 关键词搜索（名称 / 地址）
    if (filters.keyword) {
      query = query.where(function () {
        this.where('properties.name', 'like', `%${filters.keyword}%`)
          .orWhere('properties.address', 'like', `%${filters.keyword}%`);
      });
    }

    // 按选材功能开关筛选
    if (filters.material_enabled !== undefined && filters.material_enabled !== '') {
      query = query.where('properties.material_enabled', parseInt(filters.material_enabled));
    }

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('properties.created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 管理端 — 楼盘详情
  // ==========================================
  async getById(id) {
    const property = await db('properties')
      .select('properties.*')
      .select(db.raw('(SELECT COUNT(*) FROM materials WHERE materials.property_id = properties.id) as material_count'))
      .where('properties.id', id)
      .first();

    if (!property) {
      throw Object.assign(new Error('楼盘不存在'), { status: 404 });
    }

    return property;
  },

  // ==========================================
  // 管理端 — 新增楼盘
  // ==========================================
  async create({ name, address, cover_image, property_code, material_enabled }) {
    if (!name || !address || !property_code) {
      throw Object.assign(new Error('楼盘名称、地址和小区编号为必填字段'), { status: 400 });
    }

    if (name.length > 64) {
      throw Object.assign(new Error('楼盘名称不能超过64个字符'), { status: 400 });
    }
    if (address.length > 256) {
      throw Object.assign(new Error('详细地址不能超过256个字符'), { status: 400 });
    }
    if (!/^\d{2}$/.test(property_code)) {
      throw Object.assign(new Error('小区编号必须为2位数字'), { status: 400 });
    }

    // 检查 property_code 唯一性
    const existing = await db('properties').where('property_code', property_code).first();
    if (existing) {
      throw Object.assign(new Error('小区编号已存在'), { status: 409 });
    }

    const [id] = await db('properties').insert({
      name,
      address,
      cover_image: cover_image || null,
      property_code,
      material_enabled: material_enabled !== undefined ? material_enabled : 0,
    });

    return db('properties').where('id', id).first();
  },

  // ==========================================
  // 管理端 — 编辑楼盘（不支持修改 property_code）
  // ==========================================
  async update(id, { name, address, cover_image, material_enabled }) {
    const existing = await db('properties').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('楼盘不存在'), { status: 404 });
    }

    const updates = {};

    if (name !== undefined) {
      if (name.length > 64) {
        throw Object.assign(new Error('楼盘名称不能超过64个字符'), { status: 400 });
      }
      updates.name = name;
    }
    if (address !== undefined) {
      if (address.length > 256) {
        throw Object.assign(new Error('详细地址不能超过256个字符'), { status: 400 });
      }
      updates.address = address;
    }
    if (cover_image !== undefined) updates.cover_image = cover_image;
    if (material_enabled !== undefined) updates.material_enabled = material_enabled;

    // updated_at 由 Knex timestamps 自动处理（仅当使用了 timestamps(true,true)）
    // better-sqlite3 需要手动更新
    updates.updated_at = db.fn.now();

    await db('properties').where('id', id).update(updates);
    return db('properties').where('id', id).first();
  },

  // ==========================================
  // 管理端 — 删除楼盘（关联材料时返回 409）
  // ==========================================
  async remove(id) {
    const existing = await db('properties').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('楼盘不存在'), { status: 404 });
    }

    // 检查是否有关联材料
    const [{ count }] = await db('materials')
      .where('property_id', id)
      .count('* as count');

    if (count > 0) {
      throw Object.assign(
        new Error(`该楼盘下存在 ${count} 条材料，无法删除`),
        { status: 409 }
      );
    }

    await db('properties').where('id', id).del();
  },

  // ==========================================
  // 业主身份检查 — 当前用户是否是某楼盘的业主
  // ==========================================
  async getOwnerCheck(userId, propertyId) {
    const user = await db('designers')
      .select('id', 'role', 'owner_property_id', 'building', 'room')
      .where('id', userId)
      .first();

    if (!user) {
      throw Object.assign(new Error('用户不存在'), { status: 404 });
    }

    const isOwner = user.role === 'owner' && user.owner_property_id === propertyId;

    return {
      is_owner: isOwner,
      building: isOwner ? user.building : null,
      room: isOwner ? user.room : null,
    };
  },

  // ==========================================
  // 公开接口 — 已开通选材的楼盘列表
  // ==========================================
  async listPublic(keyword) {
    let query = db('properties')
      .select('id', 'name', 'address', 'cover_image', 'material_enabled')
      .where('material_enabled', 1)
      .orderBy('created_at', 'desc');

    if (keyword) {
      query = query.where('name', 'like', `%${keyword}%`);
    }

    const list = await query;

    return { list };
  },
};

module.exports = propertyService;
