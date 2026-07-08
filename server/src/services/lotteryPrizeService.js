const db = require('../db/connection');

/**
 * 奖品管理 CRUD
 */
const lotteryPrizeService = {
  // ==========================================
  // 奖品列表
  // ==========================================
  async list(isActive) {
    let query = db('lottery_prizes')
      .select('*')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');

    if (isActive !== undefined) {
      query = query.where('is_active', isActive);
    }

    return query;
  },

  // ==========================================
  // 奖品详情
  // ==========================================
  async getById(id) {
    const prize = await db('lottery_prizes').where('id', id).first();
    if (!prize) {
      throw Object.assign(new Error('奖品不存在'), { status: 404 });
    }
    return prize;
  },

  // ==========================================
  // 新增奖品
  // ==========================================
  async create(data) {
    const { name, image, prize_type, probability, total_stock, is_vip, sort_order } = data;

    if (!name) {
      throw Object.assign(new Error('奖品名称不能为空'), { status: 400 });
    }
    if (!prize_type || !['physical', 'virtual', 'thanks'].includes(prize_type)) {
      throw Object.assign(new Error('奖品类型无效，可选：physical / virtual / thanks'), { status: 400 });
    }

    const [id] = await db('lottery_prizes').insert({
      name,
      image: image || '',
      prize_type,
      probability: parseFloat(probability) || 0,
      total_stock: parseInt(total_stock) || 0,
      remaining_stock: parseInt(total_stock) || 0,
      is_vip: is_vip ? 1 : 0,
      sort_order: parseInt(sort_order) || 0,
    });

    return db('lottery_prizes').where('id', id).first();
  },

  // ==========================================
  // 编辑奖品
  // ==========================================
  async update(id, data) {
    const prize = await db('lottery_prizes').where('id', id).first();
    if (!prize) {
      throw Object.assign(new Error('奖品不存在'), { status: 404 });
    }

    const updates = {};
    const fields = ['name', 'image', 'prize_type', 'probability', 'total_stock', 'remaining_stock', 'is_vip', 'is_active', 'sort_order'];

    for (const field of fields) {
      if (data[field] !== undefined) {
        if (field === 'probability' || field === 'total_stock' || field === 'remaining_stock') {
          updates[field] = parseFloat(data[field]) || 0;
        } else if (field === 'is_vip' || field === 'is_active') {
          updates[field] = data[field] ? 1 : 0;
        } else if (field === 'sort_order') {
          updates[field] = parseInt(data[field]) || 0;
        } else {
          updates[field] = data[field];
        }
      }
    }

    // 如果更新了 total_stock，同步调整 remaining_stock 的差值
    if (data.total_stock !== undefined && data.remaining_stock === undefined) {
      const diff = parseInt(data.total_stock) - prize.total_stock;
      updates.remaining_stock = prize.remaining_stock + diff;
    }

    await db('lottery_prizes').where('id', id).update(updates);
    return db('lottery_prizes').where('id', id).first();
  },

  // ==========================================
  // 删除奖品
  // ==========================================
  async remove(id) {
    const prize = await db('lottery_prizes').where('id', id).first();
    if (!prize) {
      throw Object.assign(new Error('奖品不存在'), { status: 404 });
    }

    // 检查是否有中奖记录引用
    const recordCount = await db('lottery_records').where('prize_id', id).count('* as count').first();
    if (recordCount.count > 0) {
      throw Object.assign(new Error(`该奖品已有 ${recordCount.count} 条中奖记录，无法删除。请改为禁用`), { status: 409 });
    }

    await db('lottery_prizes').where('id', id).del();
  },
};

module.exports = lotteryPrizeService;
