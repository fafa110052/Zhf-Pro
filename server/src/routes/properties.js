const express = require('express');
const router = express.Router();
const propertyService = require('../services/propertyService');
const materialService = require('../services/materialService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 管理端接口（需要 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/properties
 * 楼盘列表 — 搜索 + 筛选 + 分页
 *
 * Query: keyword(名称/地址) material_enabled(0/1) page page_size
 */
router.get('/admin/properties', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { keyword, material_enabled, page, page_size } = req.query;
    const result = await propertyService.listAdmin(
      { keyword, material_enabled },
      { page, page_size }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/properties/:id
 * 楼盘详情（含材料数量统计）
 */
router.get('/admin/properties/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const property = await propertyService.getById(Number(req.params.id));
    res.json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/properties
 * 新增楼盘
 */
router.post('/admin/properties', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, address, cover_image, property_code, material_enabled } = req.body;

    if (!name || !address || !property_code) {
      return res.status(400).json({
        error: { message: '楼盘名称、地址和小区编号为必填字段', status: 400 },
      });
    }

    const property = await propertyService.create({
      name, address, cover_image, property_code, material_enabled,
    });
    res.status(201).json({ success: true, data: { id: property.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/properties/:id
 * 编辑楼盘（不支持修改 property_code）
 */
router.put('/admin/properties/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, address, cover_image, material_enabled } = req.body;
    const property = await propertyService.update(Number(req.params.id), {
      name, address, cover_image, material_enabled,
    });
    res.json({ success: true, data: { id: property.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/properties/:id
 * 删除楼盘（关联材料时返回 409）
 */
router.delete('/admin/properties/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await propertyService.remove(Number(req.params.id));
    res.json({ success: true, message: '已删除' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 公开接口（小程序端）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/properties
 * 已开通选材的楼盘列表（无需认证）
 *
 * Query: keyword(楼盘名称模糊搜索)
 */
router.get('/properties', async (req, res, next) => {
  try {
    const { keyword } = req.query;
    const result = await propertyService.listPublic(keyword);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/properties/:propertyId/materials
 * 某楼盘的材料列表 — 按分类分组（无需认证）
 *
 * Query: keyword(材料名称模糊搜索)
 */
router.get('/properties/:propertyId/materials', async (req, res, next) => {
  try {
    const { keyword } = req.query;
    const result = await materialService.getMaterialsByProperty(
      Number(req.params.propertyId),
      keyword
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 业主身份检查（需认证）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/properties/:propertyId/owner-check
 * 检查当前登录用户是否是指定楼盘的业主
 *
 * Response: { is_owner: boolean, building: string|null, room: string|null }
 */
router.get('/properties/:propertyId/owner-check', authenticate, async (req, res, next) => {
  try {
    const result = await propertyService.getOwnerCheck(
      req.user.id,
      Number(req.params.propertyId)
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
