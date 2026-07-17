const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();
const db = require('../db/connection');
const svc = require('../services/styleWizardService');
const matSvc = require('../services/styleWizardMaterialService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══ 公开接口 ═══
router.get('/styles', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listStyles() }); } catch (e) { next(e); }
});
router.get('/style-select-config', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getSelectPageConfig() }); } catch (e) { next(e); }
});
// 风格 VR 链接二维码（PNG 图片）：小程序内长按识别打开非酷家乐的全景链接
router.get('/styles/:id/vr-qrcode', async (req, res, next) => {
  try {
    const style = await svc.getStyle(Number(req.params.id));
    if (!style.vr_url) return res.status(404).json({ error: { message: '该风格未配置VR链接', status: 404 } });
    const png = await QRCode.toBuffer(style.vr_url, { width: 500, margin: 2 });
    res.set('Cache-Control', 'public, max-age=3600').type('png').send(png);
  } catch (e) { next(e); }
});
router.get('/styles/:styleId/materials', async (req, res, next) => {
  try {
    const { subcategory_id } = req.query;
    if (!subcategory_id) return res.status(400).json({ error: { message: '缺少 subcategory_id', status: 400 } });
    res.json({ success: true, data: await matSvc.getMaterialsByStyleAndSubcategory(Number(req.params.styleId), Number(subcategory_id)) });
  } catch (e) { next(e); }
});
router.get('/style-categories', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listCategories() }); } catch (e) { next(e); }
});
router.get('/door-series', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listDoorSeries() }); } catch (e) { next(e); }
});
router.get('/door-materials', async (req, res, next) => {
  try {
    const { series_id, style_id } = req.query;
    if (!series_id || !style_id) return res.status(400).json({ error: { message: '缺少 series_id 或 style_id', status: 400 } });
    res.json({ success: true, data: await svc.listDoorMaterials(Number(series_id), Number(style_id)) });
  } catch (e) { next(e); }
});
router.get('/lighting-packages', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listLightingPackages() }); } catch (e) { next(e); }
});
router.get('/lighting-packages/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getLightingPackage(Number(req.params.id)) }); } catch (e) { next(e); }
});
router.post('/drafts', authenticate, async (req, res, next) => {
  try { res.json({ success: true, data: await svc.saveDraft(req.user.id, req.body) }); } catch (e) { next(e); }
});
router.get('/drafts', authenticate, async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getDraft(req.user.id) }); } catch (e) { next(e); }
});
router.post('/orders', authenticate, async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await svc.submitOrder({ ...req.body, user_id: req.user.id }) }); } catch (e) { next(e); }
});
router.get('/orders', authenticate, async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listOrders({ user_id: req.user.id }, req.query) }); } catch (e) { next(e); }
});

// ═══ 管理端 ═══
// 便捷包装：返回 [authenticate, requireRole, handler] 中间件数组，路由处用 ... 展开
function wrap(fn) {
  return [authenticate, requireRole('admin'), async (req, res, next) => {
    try { res.json(await fn(req)); } catch (e) { next(e); }
  }];
}
function wrap201(fn) {
  return [authenticate, requireRole('admin'), async (req, res, next) => {
    try { const data = await fn(req); res.status(201).json({ success: true, data: { id: data.id } }); } catch (e) { next(e); }
  }];
}
const ok = (data) => ({ success: true, data });

// 风格
router.get('/admin/styles', ...wrap(() => svc.listStyles(true).then(ok)));
router.get('/admin/styles/:id', ...wrap(req => svc.getStyle(Number(req.params.id)).then(ok)));
router.post('/admin/styles', ...wrap201(req => svc.createStyle(req.body)));
router.put('/admin/styles/:id', ...wrap(req => svc.updateStyle(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/styles/:id', ...wrap(req => svc.deleteStyle(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));
router.put('/admin/style-select-config', ...wrap(req => svc.updateSelectPageConfig(req.body || {}).then(ok)));

// 品类+子品类
router.get('/admin/style-categories', ...wrap(() => svc.listCategories().then(ok)));
router.put('/admin/style-categories/:id', ...wrap(req => svc.updateCategory(Number(req.params.id), req.body || {}).then(ok)));
router.post('/admin/subcategories', ...wrap201(req => svc.createSubcategory(req.body)));
router.put('/admin/subcategories/:id', ...wrap(req => svc.updateSubcategory(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/subcategories/:id', ...wrap(req => svc.deleteSubcategory(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 材料
router.get('/admin/style-materials', ...wrap(req => matSvc.listMaterials(
  { subcategory_id: req.query.subcategory_id, category_id: req.query.category_id, keyword: req.query.keyword },
  { page: req.query.page, page_size: req.query.page_size }
).then(ok)));
router.get('/admin/style-materials/:id', ...wrap(req => matSvc.getMaterial(Number(req.params.id)).then(ok)));
router.post('/admin/style-materials', ...wrap201(req => matSvc.createMaterial(req.body)));
router.put('/admin/style-materials/:id', ...wrap(req => matSvc.updateMaterial(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/style-materials/:id', ...wrap(req => matSvc.deleteMaterial(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 门系列+颜色+门材料
router.get('/admin/door-series', ...wrap(() => svc.listDoorSeries().then(ok)));
router.get('/admin/door-series/:id', ...wrap(req => svc.getDoorSeries(Number(req.params.id)).then(ok)));
router.post('/admin/door-series', ...wrap201(req => svc.createDoorSeries(req.body)));
router.put('/admin/door-series/:id', ...wrap(req => svc.updateDoorSeries(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/door-series/:id', ...wrap(req => svc.deleteDoorSeries(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));
router.get('/admin/door-series/:seriesId/colors', ...wrap(req => svc.listDoorColors(Number(req.params.seriesId)).then(ok)));
router.post('/admin/door-series/:seriesId/colors', ...wrap201(req => svc.createDoorColor({ series_id: Number(req.params.seriesId), ...req.body })));
router.delete('/admin/door-colors/:id', ...wrap(req => svc.deleteDoorColor(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));
router.get('/admin/door-materials', ...wrap(req => svc.listDoorMaterials(Number(req.query.series_id), Number(req.query.style_id)).then(ok)));
router.post('/admin/door-materials', ...wrap201(req => svc.createDoorMaterial(req.body)));
router.delete('/admin/door-materials/:id', ...wrap(req => svc.deleteDoorMaterial(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 通用颜色库（系列添加颜色时从中挑选）
router.get('/admin/door-color-library', ...wrap(() => svc.listColorLibrary().then(ok)));
router.post('/admin/door-color-library', ...wrap201(req => svc.createLibraryColor(req.body)));
router.put('/admin/door-color-library/:id', ...wrap(req => svc.updateLibraryColor(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/door-color-library/:id', ...wrap(req => svc.deleteLibraryColor(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 灯具套餐
router.get('/admin/lighting-packages', ...wrap(() => svc.listLightingPackages().then(ok)));
router.get('/admin/lighting-packages/:id', ...wrap(req => svc.getLightingPackage(Number(req.params.id)).then(ok)));
router.post('/admin/lighting-packages', ...wrap201(req => svc.createLightingPackage(req.body)));
router.put('/admin/lighting-packages/:id', ...wrap(req => svc.updateLightingPackage(Number(req.params.id), req.body).then(() => ({ success: true, message: '已更新' }))));
router.delete('/admin/lighting-packages/:id', ...wrap(req => svc.deleteLightingPackage(Number(req.params.id)).then(() => ({ success: true, message: '已删除' }))));

// 选材单管理
router.get('/admin/orders', ...wrap(req => svc.listOrders({ status: req.query.status }, { page: req.query.page, page_size: req.query.page_size }).then(ok)));
router.get('/admin/orders/:id', ...wrap(req => svc.getOrder(Number(req.params.id)).then(ok)));
router.put('/admin/orders/:id', ...wrap(async (req) => {
  const id = Number(req.params.id);
  const exists = await db('selection_orders').where('id', id).first('id');
  if (!exists) throw Object.assign(new Error('订单不存在'), { status: 404 });
  const { status, designer_id, supervisor_id } = req.body;
  if (status && !['pending', 'contacted', 'completed'].includes(status)) {
    throw Object.assign(new Error('无效状态'), { status: 400 });
  }
  const u = {};
  if (status) u.status = status;
  if (designer_id !== undefined) u.designer_id = designer_id;
  if (supervisor_id !== undefined) u.supervisor_id = supervisor_id;
  if (Object.keys(u).length === 0) return { success: true, message: '无变更' };
  await db('selection_orders').where('id', id).update(u);
  return { success: true, message: '已更新' };
}));

module.exports = router;
