const db = require('../db/connection');

/**
 * 核心抽奖逻辑
 *   活动时间校验 → 次数校验 → 概率抽取 → 库存扣减 → 记录写入
 */
const lotteryService = {

  // ==========================================
  // 摇一摇抽奖（服务端核心）
  // ==========================================
  async shake(openid) {
    // 1. 校验活动时间（日期级别比较，活动当天全天有效）
    const config = await this._getConfigMap();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const activityStart = config.activity_start_date || '2000-01-01';
    const activityEnd = config.activity_end_date || '2099-12-31';

    if (today < activityStart) {
      return { success: false, code: 'NOT_STARTED', message: '活动尚未开始' };
    }
    if (today > activityEnd) {
      return { success: false, code: 'ENDED', message: '活动已结束' };
    }

    // 2. 查找或创建用户
    let user = await db('lottery_users').where('openid', openid).first();

    if (!user) {
      const [id] = await db('lottery_users').insert({
        openid,
        daily_draws: 0,
        total_draws: 0,
        last_draw_date: today,
      });
      user = await db('lottery_users').where('id', id).first();
    }

    // 3. 检查每日次数
    const dailyInit = parseInt(config.daily_init_draws) || 2;
    const dailyMax = parseInt(config.daily_max_draws) || 5;
    const isNewDay = user.last_draw_date !== today;

    if (isNewDay) {
      // 新的一天，重置次数
      await db('lottery_users').where('id', user.id).update({ daily_draws: 0, last_draw_date: today });
      user.daily_draws = 0;
    }

    if (user.daily_draws >= dailyMax) {
      return {
        success: false,
        code: 'LIMIT_REACHED',
        message: `今日抽奖次数已用完（${dailyMax}/${dailyMax}）`,
        remaining_times: 0,
      };
    }

    // 4. 概率抽取
    const prizes = await db('lottery_prizes')
      .where('is_active', 1)
      .where(function () {
        this.where('remaining_stock', '>', 0).orWhere('remaining_stock', -1);
      });

    if (prizes.length === 0) {
      return { success: false, code: 'NO_PRIZE', message: '奖品已被领完，敬请期待下次活动' };
    }

    const totalProb = prizes.reduce((sum, p) => sum + parseFloat(p.probability), 0);
    if (totalProb <= 0) {
      return { success: false, code: 'NO_PRIZE', message: '奖品配置异常' };
    }

    // 权重随机
    let rand = Math.random() * totalProb;
    let selectedPrize = prizes[prizes.length - 1]; // 默认最后一个

    for (const prize of prizes) {
      rand -= parseFloat(prize.probability);
      if (rand <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // 5. 扣减库存（谢谢参与不限库存）
    if (selectedPrize.prize_type !== 'thanks' && selectedPrize.remaining_stock > 0) {
      await db('lottery_prizes')
        .where('id', selectedPrize.id)
        .decrement('remaining_stock', 1);
    }

    // 6. 写入中奖记录
    const [recordId] = await db('lottery_records').insert({
      user_id: user.id,
      prize_id: selectedPrize.id,
      prize_name: selectedPrize.name,
      prize_image: selectedPrize.image || '',
      status: 0,
      win_at: new Date().toISOString(),
    });

    // 7. 更新用户次数
    await db('lottery_users').where('id', user.id).update({
      daily_draws: user.daily_draws + 1,
      total_draws: user.total_draws + 1,
    });

    const remainingTimes = dailyMax - (user.daily_draws + 1);

    return {
      success: true,
      data: {
        record_id: recordId,
        prize_name: selectedPrize.name,
        prize_image: selectedPrize.image || '',
        prize_type: selectedPrize.prize_type,
        is_vip: !!selectedPrize.is_vip,
        remaining_times: Math.max(0, remainingTimes),
      },
    };
  },

  // ==========================================
  // 获取用户抽奖次数
  // ==========================================
  async getUserDraws(openid) {
    const config = await this._getConfigMap();
    const dailyMax = parseInt(config.daily_max_draws) || 5;
    const today = new Date().toISOString().slice(0, 10);

    const user = await db('lottery_users').where('openid', openid).first();
    if (!user) {
      return { daily_draws: 0, total_draws: 0, daily_max: dailyMax, remaining: dailyMax };
    }

    const isNewDay = user.last_draw_date !== today;
    const dailyDraws = isNewDay ? 0 : user.daily_draws;

    return {
      daily_draws: dailyDraws,
      total_draws: user.total_draws,
      daily_max: dailyMax,
      remaining: Math.max(0, dailyMax - dailyDraws),
    };
  },

  // ==========================================
  // 内部：获取配置键值对
  // ==========================================
  async _getConfigMap() {
    const rows = await db('lottery_config').select('config_key', 'config_value');
    const config = {};
    for (const row of rows) {
      config[row.config_key] = row.config_value;
    }
    return config;
  },
};

module.exports = lotteryService;
