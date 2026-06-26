const db = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const wechatService = require('./wechatService');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

const authService = {
  // ==========================================
  // 管理员登录
  // ==========================================
  async adminLogin(username, password) {
    const user = await db('designers')
      .where({ username, role: 'admin' })
      .first();

    if (!user) {
      throw Object.assign(new Error('账号或密码错误'), { status: 401 });
    }

    // 检查账号是否被锁定
    if (user.locked_until) {
      const lockTime = new Date(user.locked_until);
      if (lockTime > new Date()) {
        const remainMin = Math.ceil((lockTime - new Date()) / 60000);
        throw Object.assign(
          new Error(`账号已锁定，请 ${remainMin} 分钟后重试`),
          { status: 423 }
        );
      }
      // 锁定期已过，重置
      await db('designers').where('id', user.id).update({
        login_attempts: 0,
        locked_until: null,
      });
      user.login_attempts = 0;
    }

    // 校验密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      const attempts = (user.login_attempts || 0) + 1;
      const updates = { login_attempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        updates.locked_until = lockUntil.toISOString();
      }
      await db('designers').where('id', user.id).update(updates);

      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      throw Object.assign(
        new Error(
          remaining > 0
            ? `账号或密码错误，还剩 ${remaining} 次尝试机会`
            : `密码错误次数过多，账号已锁定 ${LOCKOUT_MINUTES} 分钟`
        ),
        { status: 401 }
      );
    }

    // 登录成功，清除失败计数
    await db('designers').where('id', user.id).update({
      login_attempts: 0,
      locked_until: null,
    });

    const token = this._signToken(user);
    return { token, user: this._sanitize(user) };
  },

  // ==========================================
  // 微信登录（openid + 手机号）
  //
  // 角色控制：
  //   - 手机号已存在 → 按数据库角色登录（designer / guest / admin）
  //   - 手机号不存在 → 自动注册为"游客"（guest）
  //   - 只有管理员在后台预设的设计师手机号才能以 designer 身份登录
  // ==========================================
  async designerLogin(openid, phone) {
    if (!openid) {
      throw Object.assign(new Error('openid 不能为空'), { status: 400 });
    }
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      throw Object.assign(new Error('手机号格式不正确'), { status: 400 });
    }

    // 按手机号查找（手机号是管理员预设设计师的唯一标识）
    let user = await db('designers').where({ phone }).first();

    // openid 真实性判断：dev_ 开头=开发模式假openid，其余=微信真实openid
    const isRealWechat = !openid.startsWith('dev_');

    if (user) {
      // 已有账号 → 更新 openid + 绑定状态
      const updates = {};
      if (user.openid !== openid) updates.openid = openid;
      if (user.is_bound !== (isRealWechat ? 1 : 0)) updates.is_bound = isRealWechat ? 1 : 0;
      if (Object.keys(updates).length) {
        await db('designers').where('id', user.id).update(updates);
        user = await db('designers').where('id', user.id).first();
      }
    } else {
      // 新用户 → 自动注册为"游客"，无权访问设计师功能
      const [id] = await db('designers').insert({
        openid,
        phone,
        name: '游客' + phone.slice(-4),
        role: 'guest',
        status: 'active',
        is_bound: isRealWechat ? 1 : 0,
      });
      user = await db('designers').where('id', id).first();
    }

    if (user.status !== 'active') {
      throw Object.assign(new Error('账号已被禁用，请联系管理员'), { status: 403 });
    }

    const token = this._signToken(user);
    return { token, user: this._sanitize(user) };
  },

  // ==========================================
  // 开发模式登录（无 AppID 时使用）
  // 接受手机号，自动生成 mock openid
  // ==========================================
  async designerLoginDev(phone) {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      throw Object.assign(new Error('手机号格式不正确'), { status: 400 });
    }

    const mockOpenid = 'dev_' + phone;
    return this.designerLogin(mockOpenid, phone);
  },

  // ==========================================
  // 微信手机号快捷登录
  //
  // 流程：
  //   1. 前端 wx.login → wxCode
  //   2. 前端 getPhoneNumber → phoneCode
  //   3. 后端用 phoneCode 调微信接口获取真实手机号
  //   4. 用真实手机号 + wxCode 作为 openid 完成登录
  // ==========================================
  async wechatPhoneLogin(wxCode, phoneCode) {
    if (!wxCode) {
      throw Object.assign(new Error('微信登录凭证不能为空'), { status: 400 });
    }
    if (!phoneCode) {
      throw Object.assign(new Error('手机号授权码不能为空'), { status: 400 });
    }

    // 调微信接口获取真实手机号
    const { phoneNumber } = await wechatService.getPhoneNumber(phoneCode);

    if (!phoneNumber) {
      throw Object.assign(new Error('未能获取到手机号，请重试'), { status: 400 });
    }

    // 用 wxCode 作为 openid、真实手机号完成登录
    // （designerLogin 会自动根据 openid 真实性设置 is_bound）
    return this.designerLogin(wxCode, phoneNumber);
  },

  // ==========================================
  // 获取当前用户信息
  // ==========================================
  async getProfile(userId) {
    const user = await db('designers')
      .select('designers.*', 'properties.name as property_name')
      .leftJoin('properties', 'designers.owner_property_id', 'properties.id')
      .where('designers.id', userId)
      .first();
    if (!user) {
      throw Object.assign(new Error('用户不存在'), { status: 404 });
    }
    return this._sanitize(user);
  },

  // ==========================================
  // 内部工具
  // ==========================================
  _signToken(user) {
    return jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  },

  _sanitize(user) {
    const { password_hash, login_attempts, locked_until, ...safe } = user;
    // 头像审核：前端优先显示待审核头像（审核中/已通过），驳回后回退到旧头像
    return safe;
  },
};

module.exports = authService;
