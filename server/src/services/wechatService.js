/**
 * 微信服务 — 小程序 API 调用
 *
 * 提供：
 *   - access_token 获取与缓存（7200秒）
 *   - 手机号解密（getuserphonenumber）
 *   - 开发模式兜底
 */
const crypto = require('crypto');
const config = require('../config');

// access_token 缓存
let cachedToken = null;
let tokenExpiresAt = 0; // 毫秒时间戳

// jsapi_ticket 缓存
let cachedTicket = null;
let ticketExpiresAt = 0; // 毫秒时间戳

const WECHAT_API = 'https://api.weixin.qq.com';

const wechatService = {
  /**
   * 获取 access_token（带缓存）
   * @returns {Promise<string>}
   */
  async getAccessToken() {
    const now = Date.now();

    // 缓存有效（提前 5 分钟刷新）
    if (cachedToken && now < tokenExpiresAt - 300000) {
      return cachedToken;
    }

    if (!config.wechat.appid || !config.wechat.secret) {
      throw Object.assign(
        new Error('微信 AppID 未配置，请在 server/src/config/index.js 中设置 wechat.appid 和 wechat.secret'),
        { status: 501, code: 'WECHAT_NOT_CONFIGURED' }
      );
    }

    try {
      const url = `${WECHAT_API}/cgi-bin/token?grant_type=client_credential&appid=${config.wechat.appid}&secret=${config.wechat.secret}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (!res.ok) {
        throw new Error(`获取 access_token HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.errcode) {
        throw new Error(`获取 access_token 失败: ${data.errmsg} (errcode=${data.errcode})`);
      }

      cachedToken = data.access_token;
      tokenExpiresAt = now + (data.expires_in || 7200) * 1000;

      return cachedToken;
    } catch (err) {
      if (err.code === 'WECHAT_NOT_CONFIGURED') throw err;
      console.error('[wechat] 获取 access_token 异常:', err.message);
      throw Object.assign(new Error('微信服务暂不可用，请稍后重试'), { status: 502 });
    }
  },

  /**
   * 通过 phone_code 获取手机号
   *
   * 微信接口：POST /wxa/business/getuserphonenumber
   *
   * @param {string} phoneCode — getPhoneNumber 按钮返回的 code
   * @returns {Promise<{phoneNumber: string, countryCode: string}>}
   */
  async getPhoneNumber(phoneCode) {
    if (!phoneCode) {
      throw Object.assign(new Error('phoneCode 不能为空'), { status: 400 });
    }

    // 开发模式：无 AppID 时直接报错让前端降级
    if (!config.wechat.appid || !config.wechat.secret) {
      throw Object.assign(
        new Error('微信 AppID 未配置，请使用手机号手动登录'),
        { status: 501, code: 'WECHAT_NOT_CONFIGURED' }
      );
    }

    const accessToken = await this.getAccessToken();

    try {
      const url = `${WECHAT_API}/wxa/business/getuserphonenumber?access_token=${accessToken}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: phoneCode }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`获取手机号 HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.errcode !== 0) {
        console.error('[wechat] 获取手机号失败:', data);
        throw new Error(`获取手机号失败: ${data.errmsg} (errcode=${data.errcode})`);
      }

      const phoneInfo = data.phone_info;
      return {
        phoneNumber: phoneInfo.purePhoneNumber || phoneInfo.phoneNumber,
        countryCode: phoneInfo.countryCode || '86',
      };
    } catch (err) {
      if (err.code === 'WECHAT_NOT_CONFIGURED') throw err;
      console.error('[wechat] 获取手机号异常:', err.message);
      throw Object.assign(new Error('获取手机号失败，请稍后重试'), { status: 502 });
    }
  },

  /**
   * 发送小程序订阅消息
   *
   * @param {string} openid  接收者 openid
   * @param {string} templateId  模板 ID
   * @param {object} data  模板数据（key-value，value 为 { value: string }）
   * @param {string} page  点击跳转的小程序页面路径
   * @returns {Promise<object>}
   */
  async sendSubscribeMessage(openid, templateId, data, page) {
    // 开发模式：跳过推送
    if (config.wechat.devMode || !config.wechat.appid) {
      console.log('[wechat] 开发模式，跳过订阅消息推送');
      return { errcode: 0, skipped: true };
    }

    if (!openid || !templateId) {
      console.error('[wechat] 缺少 openid 或 templateId，跳过推送');
      return { errcode: -1, skipped: true };
    }

    try {
      const token = await this.getAccessToken();
      const url = `${WECHAT_API}/cgi-bin/message/subscribe/send?access_token=${token}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: openid,
          template_id: templateId,
          page: page || '',
          data,
          miniprogram_state: 'formal',
        }),
        signal: AbortSignal.timeout(10000),
      });

      const result = await res.json();

      if (result.errcode !== 0) {
        console.error('[wechat] 发送订阅消息失败:', result.errmsg, '(errcode=', result.errcode, ')');
      }

      return result;
    } catch (err) {
      // 发送失败不抛出异常，不阻塞主流程
      console.error('[wechat] 发送订阅消息异常:', err.message);
      return { errcode: -1, error: err.message };
    }
  },

  /**
   * 获取 jsapi_ticket（带缓存，用于 JS-SDK 签名）
   * @returns {Promise<string>}
   */
  async getJsapiTicket() {
    const now = Date.now();

    // 缓存有效（提前 5 分钟刷新）
    if (cachedTicket && now < ticketExpiresAt - 300000) {
      return cachedTicket;
    }

    const accessToken = await this.getAccessToken();

    try {
      const url = `${WECHAT_API}/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (!res.ok) {
        throw new Error(`获取 jsapi_ticket HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.errcode !== 0) {
        throw new Error(`获取 jsapi_ticket 失败: ${data.errmsg} (errcode=${data.errcode})`);
      }

      cachedTicket = data.ticket;
      ticketExpiresAt = now + (data.expires_in || 7200) * 1000;

      return cachedTicket;
    } catch (err) {
      if (err.code === 'WECHAT_NOT_CONFIGURED') throw err;
      console.error('[wechat] 获取 jsapi_ticket 异常:', err.message);
      throw Object.assign(new Error('微信服务暂不可用，请稍后重试'), { status: 502 });
    }
  },

  /**
   * 生成 JS-SDK 签名
   *
   * @param {string} ticket  — jsapi_ticket
   * @param {string} url     — 当前页面完整 URL（不含 # 及之后部分）
   * @returns {{ appId: string, timestamp: number, nonceStr: string, signature: string }}
   */
  generateSignature(ticket, url) {
    const nonceStr = Math.random().toString(36).substring(2, 18);
    const timestamp = Math.floor(Date.now() / 1000);

    const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash('sha1').update(raw).digest('hex');

    return {
      appId: config.wechat.appid,
      timestamp,
      nonceStr,
      signature,
    };
  },

  /**
   * 清除所有缓存（调试用）
   */
  clearTokenCache() {
    cachedToken = null;
    tokenExpiresAt = 0;
    cachedTicket = null;
    ticketExpiresAt = 0;
  },
};

module.exports = wechatService;
