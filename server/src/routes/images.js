const express = require('express');
const router = express.Router();
const imageService = require('../services/imageService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 图片库管理（管理端，需 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/images
 * 图片库列表 — 分页 + 按上传者/日期筛选
 *
 * Query: uploaded_by date_from date_to page page_size
 */
router.get('/admin/images', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { uploaded_by, date_from, date_to, page, page_size } = req.query;
    const result = await imageService.list(
      { uploaded_by, date_from, date_to },
      { page, page_size }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/images/:id
 * 图片详情
 */
router.get('/admin/images/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const image = await imageService.getById(Number(req.params.id));
    res.json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/images/:id
 * 删除图片（有引用时需 ?force=true 强制删除，自动处理关联作品）
 */
router.delete('/admin/images/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    await imageService.remove(Number(req.params.id), force);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/images/:id/references
 * 查询该图片被哪些作品引用，返回每个作品是否会被连带删除
 */
router.get('/admin/images/:id/references', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await imageService.getReferences(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/images/batch
 * 批量删除图片
 *
 * Body: { ids: [1, 2, 3] }
 */
router.post('/admin/images/batch', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: { message: '请选择要操作的图片' } });
    }
    if (action === 'delete') {
      const result = await imageService.removeMany(ids);
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ error: { message: `不支持的操作: ${action}` } });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
