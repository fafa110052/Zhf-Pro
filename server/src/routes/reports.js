const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 公开接口（小程序作品详情页举报，游客可提交）
// ═══════════════════════════════════════════

/**
 * POST /api/v1/works/:id/reports
 * 提交作品举报 — 无需登录
 *
 * Body: { reason_type, reason_detail?, contact? }
 * reason_type: fake | infringe | vulgar | other
 */
router.post('/works/:id/reports', async (req, res, next) => {
  try {
    const { reason_type, reason_detail, contact } = req.body;
    await reportService.submit(Number(req.params.id), { reason_type, reason_detail, contact });
    res.status(201).json({ success: true, message: '举报已提交' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理端 — 举报管理（全部需要 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/reports
 * 举报列表 — 分页 + 按状态筛选
 *
 * Query: page page_size status(pending|resolved|rejected)
 */
router.get('/admin/reports', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, page_size, status } = req.query;
    const result = await reportService.listForAdmin({ page, page_size }, status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/reports/:id
 * 举报详情
 */
router.get('/admin/reports/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const report = await reportService.getById(Number(req.params.id));
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/reports/:id
 * 处理举报 — 改状态 + 备注
 *
 * Body: { status, admin_remark? }
 */
router.patch('/admin/reports/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, admin_remark } = req.body;
    const report = await reportService.handle(Number(req.params.id), { status, admin_remark });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
