const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/connection');

/**
 * JWT 认证中间件
 * 从 Authorization: Bearer <token> 中提取并验证 token
 * 验证通过后将 req.user 挂载为 { id, role, name, ... }
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { message: '未提供认证令牌', status: 401 },
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch {
      return res.status(401).json({
        error: { message: '认证令牌无效或已过期', status: 401 },
      });
    }

    // 确认用户仍存在且未被禁用
    const user = await db('designers')
      .select('id', 'role', 'name', 'username', 'openid', 'phone',
              'owner_property_id', 'personnel_type', 'status')
      .where('id', decoded.userId).first();
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: { message: '用户不存在或已被禁用', status: 401 },
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
      openid: user.openid,
      phone: user.phone,
      owner_property_id: user.owner_property_id || null,
      personnel_type: user.personnel_type || null,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * RBAC 角色校验中间件（工厂函数）
 * 用法：router.get('/admin/xxx', authenticate, requireRole('admin'), handler)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { message: '请先登录', status: 401 },
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: { message: '权限不足', status: 403 },
      });
    }
    next();
  };
};

/**
 * 人员类型校验中间件（工厂函数）
 * 用法：router.get('/designer/xxx', authenticate, requirePersonnelType('designer'), handler)
 */
const requirePersonnelType = (...types) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { message: '请先登录', status: 401 },
      });
    }
    if (!types.includes(req.user.personnel_type)) {
      return res.status(403).json({
        error: { message: '无权限访问', status: 403 },
      });
    }
    next();
  };
};

module.exports = { authenticate, requireRole, requirePersonnelType };
