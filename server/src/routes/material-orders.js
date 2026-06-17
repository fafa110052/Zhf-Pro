const express = require('express');
const router = express.Router();
const materialOrderService = require('../services/materialOrderService');
const constructionPhaseService = require('../services/constructionPhaseService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 用户端接口（需要 JWT 认证）
// ═══════════════════════════════════════════

/**
 * POST /api/v1/material-orders
 * 提交选材申请
 *
 * Body: { property_id, room_number, applicant_name, applicant_phone, remark?, items }
 * items: [{ material_id, category_id }, ...]
 *
 * 校验规则:
 * - 同一 category_id 下只能有 1 个 material_id
 * - material_id 必须存在且属于指定 property_id
 * - category_id 必须与 material 的 category_id 一致
 */
router.post('/material-orders', authenticate, async (req, res, next) => {
  try {
    const { property_id, room_number, applicant_name, applicant_phone, remark, items } = req.body;

    if (!property_id || !room_number || !applicant_name || !applicant_phone) {
      return res.status(400).json({
        error: { message: '楼盘、房号、联系人姓名和电话为必填字段', status: 400 },
      });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: { message: '请至少选择一种材料', status: 400 },
      });
    }

    const result = await materialOrderService.submitOrder(req.user.id, {
      property_id,
      room_number,
      applicant_name,
      applicant_phone,
      remark,
      items,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/material-orders/my
 * 我的申请列表（分页）
 *
 * Query: page page_size
 */
router.get('/material-orders/my', authenticate, async (req, res, next) => {
  try {
    const { page, page_size } = req.query;
    const result = await materialOrderService.listMyOrders(req.user.id, { page, page_size });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/material-orders/detail/:orderNo
 * 申请详情（仅可查看自己的申请）
 */
router.get('/material-orders/detail/:orderNo', authenticate, async (req, res, next) => {
  try {
    const result = await materialOrderService.getMyOrderDetail(
      req.user.id,
      req.params.orderNo
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理端接口（需要 admin 权限）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/material-orders
 * 申请列表 — 多条件筛选 + 分页 + 手机脱敏
 *
 * Query: property_id order_no status date_from date_to page page_size
 */
router.get('/admin/material-orders', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { property_id, order_no, status, construction_status, date_from, date_to, sort, page, page_size } = req.query;
    const result = await materialOrderService.listOrdersAdmin(
      { property_id, order_no, status, construction_status, date_from, date_to, sort },
      { page, page_size }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/material-orders/:orderNo
 * 申请详情（含完整手机号）
 */
router.get('/admin/material-orders/:orderNo', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await materialOrderService.getOrderDetailAdmin(req.params.orderNo);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/material-orders/:orderNo/approve
 * 审核通过 — 分配设计师和监理
 *
 * Body: { designer_id, supervisor_id }
 */
router.post('/admin/material-orders/:orderNo/approve', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { designer_id, supervisor_id } = req.body;

    if (!designer_id || !supervisor_id) {
      return res.status(400).json({
        error: { message: '请指定设计师和监理', status: 400 },
      });
    }

    const result = await materialOrderService.approveOrder(req.user.id, req.params.orderNo, {
      designer_id,
      supervisor_id,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/material-orders/:orderNo/approve-and-assign
 * 审核派单（合并）：审核通过 + 开启施工 + 指派设计人员
 *
 * Body: { designer_id, design_director_id }
 */
router.post('/admin/material-orders/:orderNo/approve-and-assign', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { designer_id, design_director_id } = req.body;

    if (!designer_id || !design_director_id) {
      return res.status(400).json({
        error: { message: '请指定设计师和设计总监', status: 400 },
      });
    }

    const result = await constructionPhaseService.approveAndAssign(
      req.user.id,
      req.params.orderNo,
      { designer_id, design_director_id }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/material-orders/:orderNo
 * 删除订单（级联删除关联的施工阶段、日志等）
 */
router.delete('/admin/material-orders/:orderNo', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await materialOrderService.deleteOrder(req.params.orderNo);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/material-orders/batch-delete
 * 批量删除订单
 *
 * Body: { order_nos: string[] }
 */
router.post('/admin/material-orders/batch-delete', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { order_nos } = req.body;
    if (!order_nos || !Array.isArray(order_nos) || order_nos.length === 0) {
      return res.status(400).json({
        error: { message: '请提供要删除的订单号列表', status: 400 },
      });
    }

    const results = [];
    const errors = [];
    for (const orderNo of order_nos) {
      try {
        results.push(await materialOrderService.deleteOrder(orderNo));
      } catch (err) {
        errors.push({ order_no: orderNo, message: err.message });
      }
    }

    res.json({
      success: true,
      data: { deleted: results.length, errors },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/material-orders/:orderNo/reject
 * 驳回申请
 *
 * Body: { reason }
 */
router.post('/admin/material-orders/:orderNo/reject', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: { message: '请填写驳回原因', status: 400 },
      });
    }

    const result = await materialOrderService.rejectOrder(req.user.id, req.params.orderNo, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
