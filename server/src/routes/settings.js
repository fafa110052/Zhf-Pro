const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 公开接口（小程序端获取首页配置）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/homepage/config
 * 小程序首页配置 — banner 轮播 + 热门推荐位
 * 无需认证，访客可见
 */
router.get('/homepage/config', async (req, res, next) => {
  try {
    const data = await settingsService.list();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 系统设置 — 首页配置（管理端，需 admin 权限）
// 支持 banner（轮播图）和 hot_works（热门推荐）两类配置
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/settings
 * 配置列表 — 按类型筛选，不传 type 则返回分组
 *
 * Query: type — banner | hot_works
 */
router.get('/admin/settings', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { type } = req.query;
    const data = await settingsService.list(type);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/settings
 * 新增首页配置
 *
 * Body: { config_type, config_value, sort_order? }
 * config_type: "banner" | "hot_works"
 * config_value: JSON 对象
 *   banner → { image_url, title?, link? }
 *   hot_works → { work_ids: [1,2,3], title? }
 */
router.post('/admin/settings', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const config = await settingsService.create(req.body);
    res.status(201).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/settings/:id
 * 编辑配置
 *
 * Body: { config_value?, sort_order? }
 */
router.put('/admin/settings/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const config = await settingsService.update(Number(req.params.id), req.body);
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/settings/:id
 * 删除配置
 */
router.delete('/admin/settings/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await settingsService.remove(Number(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
