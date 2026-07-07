const express = require('express');
const router = express.Router();
const appointmentService = require('../services/measurementAppointmentService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 公开接口（小程序端提交预约）
// ═══════════════════════════════════════════

/**
 * POST /api/v1/measurement-appointments
 * 提交量房预约（无需登录）
 *
 * Body: name(必填) phone(必填) property_name(必填) room_number area_size
 *       expected_time budget remark source source_page
 */
router.post('/measurement-appointments', async (req, res, next) => {
  try {
    const {
      name, phone, property_name, room_number,
      area_size, expected_time, budget, remark,
      source, source_page,
    } = req.body;

    if (!name || !phone || !property_name) {
      return res.status(400).json({
        error: { message: '姓名、手机号和楼盘名称为必填字段', status: 400 },
      });
    }

    const appointment = await appointmentService.create({
      name, phone, property_name, room_number,
      area_size, expected_time, budget, remark,
      source, source_page,
    });

    res.status(201).json({ success: true, data: { id: appointment.id } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理端接口（需要 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/measurement-appointments
 * 预约列表 — 筛选 + 分页
 *
 * Query: status source date_from date_to keyword page page_size
 */
router.get('/admin/measurement-appointments', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, source, date_from, date_to, keyword, page, page_size } = req.query;
    const result = await appointmentService.listAdmin(
      { status, source, date_from, date_to, keyword },
      { page, page_size }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/measurement-appointments/:id
 * 预约详情
 */
router.get('/admin/measurement-appointments/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const appointment = await appointmentService.getById(Number(req.params.id));
    res.json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/measurement-appointments/:id
 * 编辑预约信息
 */
router.put('/admin/measurement-appointments/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, phone, property_name, room_number, area_size, expected_time, budget, remark } = req.body;
    const appointment = await appointmentService.update(Number(req.params.id), {
      name, phone, property_name, room_number,
      area_size, expected_time, budget, remark,
    });
    res.json({ success: true, data: { id: appointment.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/measurement-appointments/:id/status
 * 变更预约状态
 *
 * Body: { status: 0|1|2|3|4 }
 *   0=待处理 1=已联系 2=已上门 3=已签约 4=已放弃
 */
router.put('/admin/measurement-appointments/:id/status', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({
        error: { message: '请提供状态值', status: 400 },
      });
    }

    const appointment = await appointmentService.updateStatus(Number(req.params.id), parseInt(status));
    res.json({ success: true, data: { id: appointment.id, status: appointment.status } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
