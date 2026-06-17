const express = require('express');
const router = express.Router();
const categoryService = require('../services/categoryService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 公开接口（小程序端动态获取分类）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/categories
 * 获取所有启用分类，按 type 分组
 * → 小程序筛选页、设计师上传页 均动态从此接口拉取选项
 * → B端管理后台新增/禁用分类后，小程序刷新即可看到变化
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await categoryService.getAll();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理端接口（B端分类管理）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/categories
 * 管理后台获取全部分类（含已禁用的）
 */
router.get('/admin/categories', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const categories = await categoryService.getAllAdmin();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/categories
 * 新增分类
 */
router.post('/admin/categories', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { type, name, sort_order } = req.body;
    if (!type || !name) {
      return res.status(400).json({ error: { message: 'type 和 name 为必填字段' } });
    }
    const category = await categoryService.create({ type, name, sort_order });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/categories/:id
 * 编辑分类（修改名称、排序、启用/禁用）
 */
router.put('/admin/categories/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, sort_order, is_active } = req.body;
    const category = await categoryService.update(Number(req.params.id), {
      name,
      sort_order,
      is_active,
    });
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/categories/:id
 * 删除分类（被作品引用时返回 409 禁止删除）
 */
router.delete('/admin/categories/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await categoryService.remove(Number(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
