const express = require('express');
const router = express.Router();
const designTeamService = require('../services/designTeamService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 公开接口（小程序端获取设计团队）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/design-team
 * 设计团队列表 — 无需认证
 */
router.get('/design-team', async (req, res, next) => {
  try {
    const list = await designTeamService.publicList();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理端接口（需 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/design-team
 * 设计团队列表（管理端 — 全字段）
 */
router.get('/admin/design-team', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const list = await designTeamService.list();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/design-team
 * 新增设计师
 *
 * Body: { name, avatar_url?, styles?, sort_order? }
 */
router.post('/admin/design-team', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const designer = await designTeamService.create(req.body);
    res.status(201).json({ success: true, data: designer });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/design-team/:id
 * 编辑设计师
 *
 * Body: { name?, avatar_url?, styles?, sort_order? }
 */
router.put('/admin/design-team/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const designer = await designTeamService.update(Number(req.params.id), req.body);
    res.json({ success: true, data: designer });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/design-team/:id
 * 删除设计师
 */
router.delete('/admin/design-team/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await designTeamService.remove(Number(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
