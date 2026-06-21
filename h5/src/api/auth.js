import client from './client';

// 手机号登录（开发模式，不依赖微信）
export const loginByPhone = (phone) =>
  client.post('/auth/designer/login/dev', { phone });
