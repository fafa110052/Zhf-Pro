const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 仪表盘统计（管理端，需 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/dashboard/overview
 * 概览卡片 — 作品数/设计师数/浏览量/待审核数/分类数/最近作品
 */
router.get('/admin/dashboard/overview', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = await dashboardService.overview();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/dashboard/trends
 * 趋势数据 — 按月统计新增作品量 + 浏览量
 *
 * Query: months — 统计月数，默认 12，上限 24
 */
router.get('/admin/dashboard/trends', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const months = req.query.months || 12;
    const data = await dashboardService.trends(months);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/dashboard/distribution
 * 分类分布 — 按户型/部位/风格统计作品数量
 */
router.get('/admin/dashboard/distribution', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = await dashboardService.distribution();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
