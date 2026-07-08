const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const lotteryConfigService = require('../services/lotteryConfigService');
const lotteryPrizeService = require('../services/lotteryPrizeService');
const lotteryService = require('../services/lotteryService');
const lotteryRecordService = require('../services/lotteryRecordService');
const lotteryUserService = require('../services/lotteryUserService');
const { authenticate, requireRole } = require('../middleware/auth');

// ── 抽奖图片上传 Multer 配置 ──
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'lottery');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const lotteryUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const key = req.params.configKey || 'unknown';
      const name = `${key}-${Date.now()}${ext}`;
      cb(null, name);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式，仅允许 jpg/png/gif/webp'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ═══════════════════════════════════════════
// 公开接口（H5 页面使用，无需登录）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/lottery/config
 * H5 页面初始化 — 返回全部配置键值对
 */
router.get('/lottery/config', async (req, res, next) => {
  try {
    const config = await lotteryConfigService.getPublicConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/lottery/shake
 * 摇一摇抽奖
 *
 * Body: { openid }
 * 返回：{ success, data: { record_id, prize_name, prize_image, prize_type, is_vip, remaining_times } }
 * 失败：{ success: false, code: 'NOT_STARTED' | 'ENDED' | 'LIMIT_REACHED' | 'NO_PRIZE' }
 */
router.post('/lottery/shake', async (req, res, next) => {
  try {
    const { openid } = req.body;
    if (!openid) {
      return res.status(400).json({ success: false, message: '缺少 openid' });
    }
    const result = await lotteryService.shake(openid);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/lottery/user-draws
 * 查询用户剩余抽奖次数
 *
 * Query: openid
 */
router.get('/lottery/user-draws', async (req, res, next) => {
  try {
    const { openid } = req.query;
    if (!openid) {
      return res.status(400).json({ success: false, message: '缺少 openid' });
    }
    const data = await lotteryService.getUserDraws(openid);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/lottery/my-prizes
 * 查询当前用户的中奖记录
 *
 * Query: openid, status (可选: 0未领取 1已领取 2已失效)
 */
router.get('/lottery/my-prizes', async (req, res, next) => {
  try {
    const { openid, status } = req.query;
    if (!openid) {
      return res.status(400).json({ success: false, message: '缺少 openid' });
    }
    const data = await lotteryRecordService.getUserRecords(openid, status);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/lottery/bind-info
 * 绑定用户信息（手机号、姓名）
 *
 * Body: { openid, phone, name }
 */
router.post('/lottery/bind-info', async (req, res, next) => {
  try {
    const { openid, phone, name } = req.body;
    if (!openid) {
      return res.status(400).json({ success: false, message: '缺少 openid' });
    }
    const user = await lotteryUserService.bindInfo(openid, { phone, name });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理接口（需 admin 登录）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/lottery/config
 * 配置列表（按 category 分组）
 *
 * Query: category (可选)
 */
router.get('/admin/lottery/config', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { category } = req.query;
    const data = await lotteryConfigService.list(category);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/lottery/config/:configKey
 * 更新单项配置（文本类）
 *
 * Body: { config_value }
 */
router.put('/admin/lottery/config/:configKey', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = await lotteryConfigService.update(req.params.configKey, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/lottery/upload/:configKey
 * 上传图片并更新配置
 *
 * 请求：multipart/form-data，字段名 "file"
 * URL 参数：configKey — 如 banner_1、consultant_avatar 等
 */
router.post('/admin/lottery/upload/:configKey', authenticate, requireRole('admin'), lotteryUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的图片' });
    }

    // 构造图片 URL
    const imageUrl = `/uploads/lottery/${req.file.filename}`;

    // 删除旧图片
    const oldRow = await lotteryConfigService.list();
    const configs = Array.isArray(oldRow) ? oldRow : [];
    // 直接用 service update 更新
    await lotteryConfigService.update(req.params.configKey, { config_value: imageUrl });

    res.json({ success: true, data: { config_key: req.params.configKey, config_value: imageUrl } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/lottery/prizes
 * 奖品列表
 */
router.get('/admin/lottery/prizes', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { is_active } = req.query;
    const data = await lotteryPrizeService.list(is_active === undefined ? undefined : parseInt(is_active));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/lottery/prizes
 * 新增奖品
 */
router.post('/admin/lottery/prizes', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const prize = await lotteryPrizeService.create(req.body);
    res.status(201).json({ success: true, data: prize });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/lottery/prizes/:id
 * 编辑奖品
 */
router.put('/admin/lottery/prizes/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const prize = await lotteryPrizeService.update(Number(req.params.id), req.body);
    res.json({ success: true, data: prize });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/lottery/prizes/:id
 * 删除奖品
 */
router.delete('/admin/lottery/prizes/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await lotteryPrizeService.remove(Number(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/lottery/records
 * 中奖记录列表（分页+筛选）
 */
router.get('/admin/lottery/records', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = await lotteryRecordService.list(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/lottery/records/:id/status
 * 变更领取状态
 *
 * Body: { status } — 0未领取 1已领取 2已失效
 */
router.put('/admin/lottery/records/:id/status', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const record = await lotteryRecordService.updateStatus(Number(req.params.id), req.body.status);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/lottery/users
 * 用户列表（分页）
 */
router.get('/admin/lottery/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = await lotteryUserService.list(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/lottery/stats
 * 数据概览
 */
router.get('/admin/lottery/stats', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const stats = await lotteryRecordService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// ── Multer 错误处理 ──
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: '文件大小不能超过 10MB',
      LIMIT_FILE_COUNT: '文件数量超过限制',
      LIMIT_UNEXPECTED_FILE: '上传字段名不正确',
    };
    return res.status(400).json({
      error: { message: messages[err.code] || `上传错误: ${err.message}`, status: 400 },
    });
  }
  next(err);
});

module.exports = router;
