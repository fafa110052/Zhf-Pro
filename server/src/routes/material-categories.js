const express = require('express');
const router = express.Router();
const materialService = require('../services/materialService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 管理端 — 材料分类管理（全部需要 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/material-categories
 * 材料分类列表 — 分页 + 材料数量统计
 *
 * Query: page page_size
 */
router.get('/admin/material-categories', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, page_size } = req.query;
    const result = await materialService.listCategories({ page, page_size });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/material-categories
 * 新增材料分类
 *
 * Body: { name, sort_order }
 */
router.post('/admin/material-categories', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({
        error: { message: '分类名称不能为空', status: 400 },
      });
    }

    const category = await materialService.createCategory({ name, sort_order });
    res.status(201).json({ success: true, data: { id: category.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/material-categories/:id
 * 编辑材料分类
 *
 * Body: { name?, sort_order? }
 */
router.put('/admin/material-categories/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, sort_order } = req.body;
    const category = await materialService.updateCategory(Number(req.params.id), { name, sort_order });
    res.json({ success: true, data: { id: category.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/material-categories/:id
 * 删除分类（关联材料时返回 409）
 */
router.delete('/admin/material-categories/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await materialService.deleteCategory(Number(req.params.id));
    res.json({ success: true, message: '已删除' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
