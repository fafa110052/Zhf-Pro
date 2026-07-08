const db = require('../db/connection');

/**
 * 抽奖用户管理
 */
const lotteryUserService = {
  // ==========================================
  // 用户列表（管理端，分页）
  // ==========================================
  async list({ page = 1, pageSize = 20, keyword } = {}) {
    page = Math.max(1, parseInt(page));
    pageSize = Math.min(50, Math.max(1, parseInt(pageSize) || 20));
    const offset = (page - 1) * pageSize;

    let query = db('lottery_users')
      .select('*')
      .orderBy('created_at', 'desc');

    let countQuery = db('lottery_users').count('* as total');

    if (keyword) {
      query = query.where('phone', 'like', `%${keyword}%`);
      countQuery = countQuery.where('phone', 'like', `%${keyword}%`);
    }

    const [{ total }] = await countQuery;
    const list = await query.limit(pageSize).offset(offset);

    return {
      list,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };
  },

  // ==========================================
  // 绑定/更新用户信息
  // ==========================================
  async bindInfo(openid, { phone, name }) {
    let user = await db('lottery_users').where('openid', openid).first();

    if (!user) {
      const [id] = await db('lottery_users').insert({
        openid,
        phone: phone || '',
        name: name || '',
      });
      return db('lottery_users').where('id', id).first();
    }

    const updates = {};
    if (phone) updates.phone = phone;
    if (name) updates.name = name;

    await db('lottery_users').where('id', user.id).update(updates);
    return db('lottery_users').where('id', user.id).first();
  },

  // ==========================================
  // 根据 openid 查用户
  // ==========================================
  async getByOpenid(openid) {
    return db('lottery_users').where('openid', openid).first();
  },
};

module.exports = lotteryUserService;
