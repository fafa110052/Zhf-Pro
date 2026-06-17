const express = require('express');
const router = express.Router();
const materialService = require('../services/materialService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 管理端 — 材料管理（全部需要 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/materials
 * 材料列表 — 多条件筛选 + 分页
 *
 * Query: property_id category_id keyword page page_size
 */
router.get('/admin/materials', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { property_id, category_id, keyword, page, page_size } = req.query;
    const result = await materialService.listMaterials(
      { property_id, category_id, keyword },
      { page, page_size }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/materials/:id
 * 材料详情
 */
router.get('/admin/materials/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const material = await materialService.getMaterialById(Number(req.params.id));
    res.json({ success: true, data: material });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/materials
 * 新增材料
 *
 * Body: { category_id, property_id, name, brand, image_url?, unit_price, price_unit?, description? }
 */
router.post('/admin/materials', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { category_id, property_id, name, brand, image_url, unit_price, price_unit, description, quantity } = req.body;

    if (!category_id || !property_id || !name || !brand || unit_price === undefined) {
      return res.status(400).json({
        error: { message: '分类、楼盘、名称、品牌和单价为必填字段', status: 400 },
      });
    }

    const material = await materialService.createMaterial({
      category_id, property_id, name, brand, image_url, unit_price, price_unit, description, quantity,
    });
    res.status(201).json({ success: true, data: { id: material.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/materials/:id
 * 编辑材料
 *
 * Body: 同 POST，所有字段可选
 */
router.put('/admin/materials/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { category_id, property_id, name, brand, image_url, unit_price, price_unit, description, quantity } = req.body;
    const material = await materialService.updateMaterial(Number(req.params.id), {
      category_id, property_id, name, brand, image_url, unit_price, price_unit, description, quantity,
    });
    res.json({ success: true, data: { id: material.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/materials/:id
 * 删除材料（被选材申请引用时返回 409）
 */
router.delete('/admin/materials/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await materialService.deleteMaterial(Number(req.params.id));
    res.json({ success: true, message: '已删除' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
