/**
 * 施工阶段路由（V1.3 新增）
 *
 * 包含：管理端（admin）、设计师端（designer）、设计总监端（design_director）、
 *       工程师端（engineer）、工程总监端（engineering_director）、通用端点
 */
const express = require('express');
const router = express.Router();
const svc = require('../services/constructionPhaseService');
const { authenticate, requireRole, requirePersonnelType } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 管理端（全部 requireRole('admin')）
// ═══════════════════════════════════════════

/** POST /api/v1/admin/material-orders/:orderNo/start-construction */
router.post('/admin/material-orders/:orderNo/start-construction', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await svc.startConstruction(req.user.id, req.params.orderNo);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** PUT /api/v1/admin/construction-phases/:phaseId/assign */
router.put('/admin/construction-phases/:phaseId/assign', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { designer_id, design_director_id, engineer_id, engineering_director_id } = req.body;
    const result = await svc.assignPhase(req.user.id, Number(req.params.phaseId), {
      designer_id, design_director_id, engineer_id, engineering_director_id,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** PUT /api/v1/admin/construction-phases/:phaseId/assign-engineer — 指派施工人员 */
router.put('/admin/construction-phases/:phaseId/assign-engineer', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { engineer_id, engineering_director_id } = req.body;
    if (!engineer_id || !engineering_director_id) {
      return res.status(400).json({
        error: { message: '请指定工程师和工程总监', status: 400 },
      });
    }
    const result = await svc.assignEngineer(req.user.id, Number(req.params.phaseId), {
      engineer_id, engineering_director_id,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/admin/construction-phases/:phaseId/approve-design */
router.post('/admin/construction-phases/:phaseId/approve-design', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await svc.reviewDesignAdmin(req.user.id, Number(req.params.phaseId), { action: 'approve' });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/admin/construction-phases/:phaseId/reject-design */
router.post('/admin/construction-phases/:phaseId/reject-design', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await svc.reviewDesignAdmin(req.user.id, Number(req.params.phaseId), { action: 'reject', reason: req.body.reason });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/admin/construction-phases/:phaseId/approve-construction */
router.post('/admin/construction-phases/:phaseId/approve-construction', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await svc.reviewConstructionAdmin(req.user.id, Number(req.params.phaseId), { action: 'approve' });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/admin/construction-phases/:phaseId/reject-construction */
router.post('/admin/construction-phases/:phaseId/reject-construction', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await svc.reviewConstructionAdmin(req.user.id, Number(req.params.phaseId), { action: 'reject', reason: req.body.reason });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** GET /api/v1/admin/material-orders/:orderNo/phases */
router.get('/admin/material-orders/:orderNo/phases', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await svc.getOrderPhases(req.params.orderNo);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════
// 设计师端
// ═══════════════════════════════════════════

/** GET /api/v1/designer/construction-phases */
router.get('/designer/construction-phases', authenticate, requirePersonnelType('designer'), async (req, res, next) => {
  try {
    const db = require('../db/connection');
    const phases = await db('construction_phases')
      .select('construction_phases.*', 'material_orders.order_no',
        'properties.name as property_name', 'material_orders.room_number')
      .leftJoin('material_orders', 'construction_phases.order_id', 'material_orders.id')
      .leftJoin('properties', 'material_orders.property_id', 'properties.id')
      .where('construction_phases.designer_id', req.user.id)
      .whereIn('construction_phases.status', ['assigned', 'design_uploaded', 'design_director_rejected',
        'design_director_approved', 'design_admin_approved', 'design_admin_rejected',
        'engineer_design_confirmed', 'construction_confirmed', 'construction_uploaded',
        'engineering_director_approved', 'engineering_director_rejected',
        'construction_admin_approved', 'construction_admin_rejected',
        'owner_accepted', 'owner_disputed'])
      .orderBy('construction_phases.updated_at', 'desc');

    res.json({ success: true, data: { list: phases } });
  } catch (err) { next(err); }
});

/** PUT /api/v1/construction-phases/:phaseId/upload-design */
router.put('/construction-phases/:phaseId/upload-design', authenticate, async (req, res, next) => {
  try {
    const result = await svc.uploadDesign(req.user.id, Number(req.params.phaseId), { images: req.body.images });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════
// 设计总监端
// ═══════════════════════════════════════════

/** GET /api/v1/director/design/phases */
router.get('/director/design/phases', authenticate, requirePersonnelType('design_director'), async (req, res, next) => {
  try {
    const db = require('../db/connection');
    const phases = await db('construction_phases')
      .select('construction_phases.*', 'material_orders.order_no',
        'properties.name as property_name', 'material_orders.room_number')
      .leftJoin('material_orders', 'construction_phases.order_id', 'material_orders.id')
      .leftJoin('properties', 'material_orders.property_id', 'properties.id')
      .where('construction_phases.design_director_id', req.user.id)
      .whereIn('construction_phases.status', ['design_uploaded', 'design_director_approved', 'design_director_rejected',
        'design_admin_approved', 'design_admin_rejected', 'engineer_design_confirmed',
        'construction_confirmed', 'construction_uploaded',
        'engineering_director_approved', 'engineering_director_rejected', 'construction_admin_approved',
        'construction_admin_rejected', 'owner_accepted', 'owner_disputed'])
      .orderBy('construction_phases.updated_at', 'desc');

    res.json({ success: true, data: { list: phases } });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/approve-design-director */
router.post('/construction-phases/:phaseId/approve-design-director', authenticate, async (req, res, next) => {
  try {
    const result = await svc.reviewDesignDirector(req.user.id, Number(req.params.phaseId), { action: 'approve' });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/reject-design-director */
router.post('/construction-phases/:phaseId/reject-design-director', authenticate, async (req, res, next) => {
  try {
    const result = await svc.reviewDesignDirector(req.user.id, Number(req.params.phaseId), { action: 'reject', reason: req.body.reason });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════
// 工程师端
// ═══════════════════════════════════════════

/** GET /api/v1/engineer/construction-phases */
router.get('/engineer/construction-phases', authenticate, requirePersonnelType('engineer'), async (req, res, next) => {
  try {
    const db = require('../db/connection');
    const phases = await db('construction_phases')
      .select('construction_phases.*', 'material_orders.order_no',
        'properties.name as property_name', 'material_orders.room_number')
      .leftJoin('material_orders', 'construction_phases.order_id', 'material_orders.id')
      .leftJoin('properties', 'material_orders.property_id', 'properties.id')
      .where('construction_phases.engineer_id', req.user.id)
      .whereIn('construction_phases.status', ['assigned', 'design_admin_approved', 'owner_design_reviewed',
        'owner_design_disputed', 'engineer_design_confirmed', 'construction_confirmed',
        'construction_uploaded', 'engineering_director_approved', 'engineering_director_rejected',
        'construction_admin_approved', 'construction_admin_rejected', 'owner_accepted', 'owner_disputed'])
      .orderBy('construction_phases.updated_at', 'desc');

    res.json({ success: true, data: { list: phases } });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/confirm-design */
router.post('/construction-phases/:phaseId/confirm-design', authenticate, async (req, res, next) => {
  try {
    const result = await svc.confirmDesign(req.user.id, Number(req.params.phaseId));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** PUT /api/v1/construction-phases/:phaseId/upload-construction */
router.put('/construction-phases/:phaseId/upload-construction', authenticate, async (req, res, next) => {
  try {
    const result = await svc.uploadConstruction(req.user.id, Number(req.params.phaseId), { images: req.body.images, description: req.body.description || '' });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════
// 工程总监端
// ═══════════════════════════════════════════

/** GET /api/v1/director/engineering/phases */
router.get('/director/engineering/phases', authenticate, requirePersonnelType('engineering_director'), async (req, res, next) => {
  try {
    const db = require('../db/connection');
    const phases = await db('construction_phases')
      .select('construction_phases.*', 'material_orders.order_no',
        'properties.name as property_name', 'material_orders.room_number')
      .leftJoin('material_orders', 'construction_phases.order_id', 'material_orders.id')
      .leftJoin('properties', 'material_orders.property_id', 'properties.id')
      .where('construction_phases.engineering_director_id', req.user.id)
      .whereIn('construction_phases.status', ['engineer_design_confirmed', 'construction_uploaded',
        'engineering_director_approved', 'engineering_director_rejected',
        'construction_admin_approved', 'construction_admin_rejected',
        'owner_accepted', 'owner_disputed'])
      .orderBy('construction_phases.updated_at', 'desc');

    res.json({ success: true, data: { list: phases } });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/director-confirm-design */
router.post('/construction-phases/:phaseId/director-confirm-design', authenticate, async (req, res, next) => {
  try {
    const result = await svc.directorConfirmDesign(req.user.id, Number(req.params.phaseId));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/approve-engineering-director */
router.post('/construction-phases/:phaseId/approve-engineering-director', authenticate, async (req, res, next) => {
  try {
    const result = await svc.reviewEngineeringDirector(req.user.id, Number(req.params.phaseId), { action: 'approve' });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/reject-engineering-director */
router.post('/construction-phases/:phaseId/reject-engineering-director', authenticate, async (req, res, next) => {
  try {
    const result = await svc.reviewEngineeringDirector(req.user.id, Number(req.params.phaseId), { action: 'reject', reason: req.body.reason });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════
// 业主审核设计图
// ═══════════════════════════════════════════

/** POST /api/v1/construction-phases/:phaseId/owner-approve-design */
router.post('/construction-phases/:phaseId/owner-approve-design', authenticate, async (req, res, next) => {
  try {
    const result = await svc.ownerApproveDesign(req.user.id, Number(req.params.phaseId));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/owner-dispute-design */
router.post('/construction-phases/:phaseId/owner-dispute-design', authenticate, async (req, res, next) => {
  try {
    const { reason, images } = req.body;
    const result = await svc.ownerDisputeDesign(req.user.id, Number(req.params.phaseId), { reason, images });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════
// 通用端点
// ═══════════════════════════════════════════

/** GET /api/v1/construction-phases/:phaseId */
router.get('/construction-phases/:phaseId', authenticate, async (req, res, next) => {
  try {
    const result = await svc.getPhaseDetail(Number(req.params.phaseId));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** GET /api/v1/material-orders/:orderNo/phases */
router.get('/material-orders/:orderNo/phases', authenticate, async (req, res, next) => {
  try {
    const result = await svc.getOrderPhases(req.params.orderNo);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/accept */
router.post('/construction-phases/:phaseId/accept', authenticate, async (req, res, next) => {
  try {
    const result = await svc.acceptPhase(req.user.id, Number(req.params.phaseId));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/** POST /api/v1/construction-phases/:phaseId/dispute */
router.post('/construction-phases/:phaseId/dispute', authenticate, async (req, res, next) => {
  try {
    const { reason, images } = req.body;
    const result = await svc.disputePhase(req.user.id, Number(req.params.phaseId), { reason, images });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
