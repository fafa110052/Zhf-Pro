const db = require('../db/connection');

/**
 * 设计团队管理
 * 基于 design_team 表
 */
const designTeamService = {
  /**
   * 设计团队列表（公开 — 小程序端）
   * @returns {Promise<Array>}
   */
  async publicList() {
    return db('design_team')
      .select('id', 'name', 'avatar_url', 'styles')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
  },

  /**
   * 设计团队列表（管理端 — 全字段）
   * @returns {Promise<Array>}
   */
  async list() {
    return db('design_team')
      .select('*')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
  },

  /**
   * 新增设计师
   * @param {object} data — { name, avatar_url?, styles?, sort_order? }
   */
  async create(data) {
    if (!data.name || !data.name.trim()) {
      throw Object.assign(new Error('姓名不能为空'), { status: 400 });
    }

    const [id] = await db('design_team').insert({
      name: data.name.trim(),
      avatar_url: data.avatar_url || '',
      styles: data.styles || '',
      sort_order: data.sort_order || 0,
    });

    return db('design_team').where('id', id).first();
  },

  /**
   * 编辑设计师
   * @param {number} id
   * @param {object} data — { name?, avatar_url?, styles?, sort_order? }
   */
  async update(id, data) {
    const row = await db('design_team').where('id', id).first();
    if (!row) {
      throw Object.assign(new Error('设计师不存在'), { status: 404 });
    }

    const updates = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;
    if (data.styles !== undefined) updates.styles = data.styles;
    if (data.sort_order !== undefined) updates.sort_order = parseInt(data.sort_order) || 0;
    updates.updated_at = db.fn.now();

    await db('design_team').where('id', id).update(updates);
    return db('design_team').where('id', id).first();
  },

  /**
   * 删除设计师
   * @param {number} id
   */
  async remove(id) {
    const row = await db('design_team').where('id', id).first();
    if (!row) {
      throw Object.assign(new Error('设计师不存在'), { status: 404 });
    }
    await db('design_team').where('id', id).del();
  },
};

module.exports = designTeamService;
