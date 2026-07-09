const path = require('path');

// 加载 .env 文件（PM2 不自动加载）
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = {
  // 服务器
  port: process.env.PORT || 3000,

  // JWT 认证
  jwtSecret: process.env.JWT_SECRET || 'zhuhaofang-dev-secret-key-2026',
  jwtExpiresIn: '7d',

  // 微信小程序
  wechat: {
    appid: process.env.WECHAT_APPID || '',
    secret: process.env.WECHAT_SECRET || '',
    // 开发模式：无 AppID 时使用手机号直接登录（生成 mock openid）
    devMode: process.env.WECHAT_DEV_MODE !== 'false',
  },

  // 文件上传
  uploadDir: path.join(__dirname, '..', '..', 'uploads'),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],

  // 小程序订阅消息模板 ID（需在小程序后台申请后填入环境变量）
  subscribeMessage: {
    templates: {
      todoNotify: process.env.WX_TEMPLATE_TODO || '',
      reviewResult: process.env.WX_TEMPLATE_REVIEW || '',
      acceptNotify: process.env.WX_TEMPLATE_ACCEPT || '',
      acceptResult: process.env.WX_TEMPLATE_ACCEPT_RESULT || '',
      phasePass: process.env.WX_TEMPLATE_PHASE_PASS || '',
    },
  },
};
