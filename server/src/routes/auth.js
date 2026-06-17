const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 管理员认证
// ═══════════════════════════════════════════

/**
 * POST /api/v1/auth/admin/login
 * 管理员账号密码登录
 * Body: { username, password }
 * → 返回 JWT token + 管理员信息
 */
router.post('/admin/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        error: { message: '用户名和密码不能为空' },
      });
    }
    const result = await authService.adminLogin(username, password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/admin/me
 * 获取当前登录管理员的个人信息
 * Header: Authorization: Bearer <token>
 */
router.get('/admin/me', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: { message: '仅管理员可访问', status: 403 },
      });
    }
    const profile = await authService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 设计师认证
// ═══════════════════════════════════════════

/**
 * POST /api/v1/auth/designer/login
 * 设计师微信登录（openid + 手机号校验）
 * Body: { openid, phone }
 * → 已有设计师：更新信息并返回 token
 * → 新设计师：自动注册并返回 token
 */
router.post('/designer/login', async (req, res, next) => {
  try {
    const { openid, phone } = req.body;
    const result = await authService.designerLogin(openid, phone);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/designer/login/dev
 * 开发模式登录 — 仅需手机号，无需 openid
 * Body: { phone }
 */
router.post('/designer/login/dev', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: { message: '手机号不能为空' } });
    }
    const result = await authService.designerLoginDev(phone);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/designer/wechat-phone
 * 微信手机号快捷登录
 * Body: { wxCode: string, phoneCode: string }
 *
 * 流程：
 *   1. 前端 wx.login() → wxCode
 *   2. 前端 getPhoneNumber 按钮 → phoneCode
 *   3. 后端调微信接口解密手机号 → 完成登录
 *
 * 返回：{ token, user }
 * 错误：501 — 微信 AppID 未配置（前端应降级为手动输入）
 */
router.post('/designer/wechat-phone', async (req, res, next) => {
  try {
    const { wxCode, phoneCode } = req.body;
    if (!wxCode || !phoneCode) {
      return res.status(400).json({
        error: { message: '请先授权微信手机号' },
      });
    }
    const result = await authService.wechatPhoneLogin(wxCode, phoneCode);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/designer/me
 * 获取当前登录设计师的个人信息
 * Header: Authorization: Bearer <token>
 */
router.get('/designer/me', authenticate, async (req, res, next) => {
  try {
    // 允许所有已认证用户（guest/designer/owner）获取个人信息
    if (!['guest', 'designer', 'owner'].includes(req.user.role)) {
      return res.status(403).json({
        error: { message: '无权限访问', status: 403 },
      });
    }
    const profile = await authService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
