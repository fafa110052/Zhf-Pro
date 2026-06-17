const express = require('express');
const router = express.Router();
const designerService = require('../services/designerService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 管理端 — 人员管理（全部需要 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/users
 * 人员列表（含设计师/监理/业主）— 支持角色筛选
 *
 * Query: role(designer|owner) status keyword personnel_type page page_size
 */
router.get('/admin/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, status, personnel_type, keyword, page, page_size } = req.query;
    const result = await designerService.listUsers(
      { role, status, personnel_type, keyword },
      { page, page_size }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理端 — 设计师管理（全部需要 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/designers
 * 设计师列表 — 搜索 + 状态筛选 + 分页
 *
 * Query: keyword(姓名/手机) status(active|inactive) personnel_type(designer|supervisor) page page_size
 */
router.get('/admin/designers', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { keyword, status, personnel_type, page, page_size } = req.query;
    const result = await designerService.list(
      { keyword, status, personnel_type },
      { page, page_size }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/designers/:id
 * 设计师详情（含作品统计）
 */
router.get('/admin/designers/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const designer = await designerService.getById(Number(req.params.id));
    res.json({ success: true, data: designer });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/designers
 * 新增设计师（管理后台手动录入）
 */
router.post('/admin/designers', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const designer = await designerService.create(req.body);
    res.status(201).json({ success: true, data: designer });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/designers/:id
 * 编辑设计师信息
 */
router.put('/admin/designers/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const designer = await designerService.update(Number(req.params.id), req.body);
    res.json({ success: true, data: designer });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/designers/:id/status
 * 切换设计师启用/禁用状态
 *
 * Body 可为空 — 自动反转当前状态
 * 禁用后该设计师无法登录小程序
 */
router.patch('/admin/designers/:id/status', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const designer = await designerService.toggleStatus(Number(req.params.id));
    res.json({ success: true, data: designer });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/designers/:id
 * 删除设计师
 *
 * Query params:
 *   keep_works  —  "true"  保留作品，转移至管理员
 *                  "false" 一并删除所有作品
 *                  不传 → 有作品时拒绝（409，返回作品数量）
 */
router.delete('/admin/designers/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const keepWorks = req.query.keep_works === undefined
      ? undefined
      : req.query.keep_works === 'true';
    const result = await designerService.remove(Number(req.params.id), keepWorks);

    let message = '删除成功';
    if (result.kept_works > 0) message = `设计师已删除，${result.kept_works} 个作品已转移至管理员`;
    if (result.deleted_works > 0) message = `设计师及 ${result.deleted_works} 个作品已一并删除`;

    res.json({ success: true, message, data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 设计师端 — 个人资料管理（需设计师身份）
// ═══════════════════════════════════════════

/**
 * PUT /api/v1/designer/profile
 * 设计师自行编辑个人资料
 *
 * Body: { name?, phone?, avatar_url?, years_of_exp?, bio? }（全部可选）
 * 注意：手机号变更会触发唯一性校验
 */
router.put('/designer/profile', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    const designer = await designerService.update(req.user.id, req.body);
    res.json({ success: true, data: designer });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理端 — 头像审核（需 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/avatar-reviews
 * 待审核头像列表
 */
router.get('/admin/avatar-reviews', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, page_size } = req.query;
    const result = await designerService.listAvatarReviews({ page, page_size });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/avatar-reviews/:id/approve
 * 头像审核通过
 */
router.post('/admin/avatar-reviews/:id/approve', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await designerService.approveAvatar(Number(req.params.id));
    res.json({ success: true, data: result, message: '头像审核已通过' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/avatar-reviews/:id/reject
 * 头像审核驳回
 */
router.post('/admin/avatar-reviews/:id/reject', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await designerService.rejectAvatar(Number(req.params.id));
    res.json({ success: true, data: result, message: '头像已驳回' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
