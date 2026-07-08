const db = require('../db/connection');
const path = require('path');
const fs = require('fs');

// 上传目录
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'lottery');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * 抽奖页面配置 + 图片上传
 */
const lotteryConfigService = {
  // ==========================================
  // 公开：获取全部配置（H5 页面初始化用）
  // ==========================================
  async getPublicConfig() {
    const rows = await db('lottery_config')
      .select('config_key', 'config_value', 'config_type', 'category')
      .orderBy('sort_order', 'asc');

    // 转换为 { config_key: value } 的简单对象
    const config = {};
    for (const row of rows) {
      config[row.config_key] = row.config_value;
    }
    return config;
  },

  // ==========================================
  // 管理端：配置列表（按 category 分组）
  // ==========================================
  async list(category) {
    let query = db('lottery_config')
      .select('*')
      .orderBy('sort_order', 'asc');

    if (category) {
      query = query.where('category', category);
    }

    const rows = await query;

    // 按 category 分组
    if (!category) {
      const grouped = {};
      for (const row of rows) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push(row);
      }
      return grouped;
    }

    return rows;
  },

  // ==========================================
  // 管理端：更新配置
  // ==========================================
  async update(configKey, data) {
    const row = await db('lottery_config').where('config_key', configKey).first();
    if (!row) {
      throw Object.assign(new Error('配置项不存在'), { status: 404 });
    }

    const updates = {};
    if (data.config_value !== undefined) {
      updates.config_value = data.config_value;
    }
    if (data.config_type !== undefined) {
      updates.config_type = data.config_type;
    }

    await db('lottery_config').where('config_key', configKey).update(updates);
    return db('lottery_config').where('config_key', configKey).first();
  },

  // ==========================================
  // 管理端：上传图片并更新配置
  // ==========================================
  async uploadImage(configKey, file) {
    const row = await db('lottery_config').where('config_key', configKey).first();
    if (!row) {
      throw Object.assign(new Error('配置项不存在'), { status: 404 });
    }
    if (row.config_type !== 'image') {
      throw Object.assign(new Error('该配置项不是图片类型'), { status: 400 });
    }

    // 生成文件名：configKey-时间戳.扩展名
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${configKey}-${Date.now()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // 删除旧图片
    if (row.config_value) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(row.config_value));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // 写入新图片
    fs.writeFileSync(filepath, file.buffer);

    // 更新数据库（存相对路径）
    const imageUrl = `/uploads/lottery/${filename}`;
    await db('lottery_config').where('config_key', configKey).update({
      config_value: imageUrl,
    });

    return { config_key: configKey, config_value: imageUrl };
  },
};

module.exports = lotteryConfigService;
