const db = require('../db/connection');

/**
 * 中奖记录管理
 */
const lotteryRecordService = {
  // ==========================================
  // 中奖记录列表（管理端，分页+筛选）
  // ==========================================
  async list({ page = 1, pageSize = 20, status, keyword, startDate, endDate } = {}) {
    page = Math.max(1, parseInt(page));
    pageSize = Math.min(50, Math.max(1, parseInt(pageSize) || 20));
    const offset = (page - 1) * pageSize;

    let query = db('lottery_records')
      .join('lottery_users', 'lottery_records.user_id', 'lottery_users.id')
      .select(
        'lottery_records.*',
        'lottery_users.phone as user_phone',
        'lottery_users.name as user_name',
        'lottery_users.openid as user_openid'
      )
      .orderBy('lottery_records.created_at', 'desc');

    if (status !== undefined && status !== '') {
      query = query.where('lottery_records.status', parseInt(status));
    }
    if (keyword) {
      query = query.where(function () {
        this.where('lottery_users.phone', 'like', `%${keyword}%`)
          .orWhere('lottery_records.prize_name', 'like', `%${keyword}%`);
      });
    }
    if (startDate) {
      query = query.where('lottery_records.win_at', '>=', startDate);
    }
    if (endDate) {
      query = query.where('lottery_records.win_at', '<=', `${endDate} 23:59:59`);
    }

    // 总数
    const countQuery = db('lottery_records')
      .join('lottery_users', 'lottery_records.user_id', 'lottery_users.id')
      .count('* as total');

    if (status !== undefined && status !== '') {
      countQuery.where('lottery_records.status', parseInt(status));
    }
    if (keyword) {
      countQuery.where(function () {
        this.where('lottery_users.phone', 'like', `%${keyword}%`)
          .orWhere('lottery_records.prize_name', 'like', `%${keyword}%`);
      });
    }
    if (startDate) {
      countQuery.where('lottery_records.win_at', '>=', startDate);
    }
    if (endDate) {
      countQuery.where('lottery_records.win_at', '<=', `${endDate} 23:59:59`);
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
  // 用户的中奖记录（H5 我的奖品页面）
  // ==========================================
  async getUserRecords(openid, status) {
    const user = await db('lottery_users').where('openid', openid).first();
    if (!user) return [];

    let query = db('lottery_records')
      .where('user_id', user.id)
      .orderBy('created_at', 'desc');

    if (status !== undefined && status !== '') {
      query = query.where('status', parseInt(status));
    }

    return query;
  },

  // ==========================================
  // 变更领取状态
  // ==========================================
  async updateStatus(id, status) {
    const record = await db('lottery_records').where('id', id).first();
    if (!record) {
      throw Object.assign(new Error('记录不存在'), { status: 404 });
    }

    const updates = {
      status: parseInt(status),
    };

    if (parseInt(status) === 1) {
      updates.claimed_at = new Date().toISOString();
    }

    await db('lottery_records').where('id', id).update(updates);
    return db('lottery_records').where('id', id).first();
  },

  // ==========================================
  // 数据概览统计
  // ==========================================
  async getStats() {
    const today = new Date().toISOString().slice(0, 10);

    const [todayUsers] = await db('lottery_users')
      .where('last_draw_date', today)
      .count('* as total');

    const [todayWins] = await db('lottery_records')
      .where('win_at', '>=', today)
      .count('* as total');

    const [totalWins] = await db('lottery_records').count('* as total');
    const [totalUsers] = await db('lottery_users').where('total_draws', '>', 0).count('* as total');

    const [stockResult] = await db('lottery_prizes')
      .where('is_active', 1)
      .where('remaining_stock', '>', 0)
      .sum('remaining_stock as total');

    return {
      today_users: todayUsers.total,
      today_wins: todayWins.total,
      total_wins: totalWins.total,
      total_users: totalUsers.total,
      remaining_stock: stockResult.total || 0,
    };
  },
};

module.exports = lotteryRecordService;
