const db = require('../db/connection');

// 允许的配置类型
const ALLOWED_TYPES = ['banner', 'hot_works'];

/**
 * 系统设置业务逻辑（B端管理后台）
 * 基于 homepage_config 表，存储 banner 和 hot_works 配置
 */
const settingsService = {
  // ==========================================
  // 配置列表（按类型筛选）
  // ==========================================
  async list(type) {
    let query = db('homepage_config')
      .select('id', 'config_type', 'config_value', 'sort_order', 'created_at')
      .orderBy('sort_order', 'asc')
      .orderBy('created_at', 'desc');

    if (type) {
      if (!ALLOWED_TYPES.includes(type)) {
        throw Object.assign(new Error(`无效的配置类型: ${type}，仅允许 ${ALLOWED_TYPES.join('/')}`), { status: 400 });
      }
      query = query.where('config_type', type);
    }

    const rows = await query;

    // 解析 config_value（DB 中存的是 JSON 字符串）
    const list = rows.map((row) => {
      let parsed = row.config_value;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
      }
      return { ...row, config_value: parsed };
    });

    // 按类型分组返回
    if (!type) {
      const grouped = {};
      for (const item of list) {
        if (!grouped[item.config_type]) grouped[item.config_type] = [];
        grouped[item.config_type].push(item);
      }
      return grouped;
    }

    return list;
  },

  // ==========================================
  // 新增配置
  // ==========================================
  async create(data) {
    const { config_type, config_value, sort_order } = data;

    if (!config_type || !ALLOWED_TYPES.includes(config_type)) {
      throw Object.assign(
        new Error(`无效的配置类型: ${config_type}，仅允许 ${ALLOWED_TYPES.join('/')}`),
        { status: 400 }
      );
    }

    if (!config_value) {
      throw Object.assign(new Error('配置值不能为空'), { status: 400 });
    }

    // 验证 config_value 为合法 JSON
    let parsed;
    try {
      parsed = typeof config_value === 'string' ? JSON.parse(config_value) : config_value;
    } catch {
      throw Object.assign(new Error('配置值不是合法的 JSON 格式'), { status: 400 });
    }

    const [id] = await db('homepage_config').insert({
      config_type,
      config_value: JSON.stringify(parsed),
      sort_order: sort_order || 0,
    });

    return db('homepage_config').where('id', id).first();
  },

  // ==========================================
  // 编辑配置
  // ==========================================
  async update(id, data) {
    const config = await db('homepage_config').where('id', id).first();
    if (!config) {
      throw Object.assign(new Error('配置不存在'), { status: 404 });
    }

    const updates = {};

    if (data.config_value !== undefined) {
      let parsed;
      try {
        parsed = typeof data.config_value === 'string' ? JSON.parse(data.config_value) : data.config_value;
      } catch {
        throw Object.assign(new Error('配置值不是合法的 JSON 格式'), { status: 400 });
      }
      updates.config_value = JSON.stringify(parsed);
    }

    if (data.sort_order !== undefined) {
      updates.sort_order = parseInt(data.sort_order) || 0;
    }

    await db('homepage_config').where('id', id).update(updates);
    return db('homepage_config').where('id', id).first();
  },

  // ==========================================
  // 删除配置
  // ==========================================
  async remove(id) {
    const config = await db('homepage_config').where('id', id).first();
    if (!config) {
      throw Object.assign(new Error('配置不存在'), { status: 404 });
    }

    await db('homepage_config').where('id', id).del();
  },
};

module.exports = settingsService;
