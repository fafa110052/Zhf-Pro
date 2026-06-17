const express = require('express');
const router = express.Router();
const accountService = require('../services/accountService');
const { authenticate, requireRole } = require('../middleware/auth');

// 全部 admin 路由需要认证 + admin 权限
// 使用 '/admin' 路径前缀避免拦截其他未匹配请求
router.use('/admin', authenticate, requireRole('admin'));

/**
 * GET /api/v1/admin/accounts
 * 账号列表 — 角色筛选 + 搜索 + 分页
 *
 * Query: role(guest|designer) status keyword page page_size
 */
router.get('/admin/accounts', async (req, res, next) => {
  try {
    const { role, status, keyword, page, page_size } = req.query;
    const result = await accountService.list({ role, status, keyword }, { page, page_size });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/accounts/summary
 * 角色汇总统计
 */
router.get('/admin/accounts/summary', async (req, res, next) => {
  try {
    const summary = await accountService.roleSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/accounts/:id/role
 * 变更账号角色（游客 ↔ 设计师）
 *
 * Body: { role: "guest"|"designer", name?, years_of_exp?, bio?, avatar_url? }
 *   - 降为游客时只需传 role
 *   - 升级为设计师时可附带 name/经验/简介
 */
router.put('/admin/accounts/:id/role', async (req, res, next) => {
  try {
    const { role, ...designerData } = req.body;
    if (!role) {
      return res.status(400).json({ error: { message: 'role 为必填字段' } });
    }
    const result = await accountService.changeRole(Number(req.params.id), role, designerData);
    const action = role === 'designer' ? '升级为设计师' : '降为游客';
    res.json({ success: true, message: '已' + action, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
