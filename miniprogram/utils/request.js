/**
 * HTTP 请求封装
 *
 * 功能：
 *   - 自动拼接 baseUrl + apiPrefix
 *   - 自动携带 JWT token（Authorization header）
 *   - 统一错误处理（400/401/403/404/409/500）
 *   - 请求拦截 & 响应拦截
 *   - 支持 GET/POST/PUT/DELETE/PATCH
 */
const { BASE_URL, API_PREFIX, REQUEST_TIMEOUT } = require('./constants');

/**
 * 发起 HTTP 请求
 *
 * @param {object} options
 * @param {string} options.url      — 接口路径（不含 baseUrl/prefix，如 '/works'）
 * @param {string} options.method   — GET | POST | PUT | DELETE | PATCH
 * @param {object} options.data     — 请求参数（GET 为 query，POST/PUT/PATCH 为 body）
 * @param {boolean} options.auth    — 是否需要登录态，默认 false
 * @param {boolean} options.loading — 是否显示 loading，默认 false
 * @returns {Promise<any>}           — 返回 response.data（已取 data 字段）
 */
function request({ url, method = 'GET', data = {}, auth = false, loading = false, silent = false }) {
  return new Promise((resolve, reject) => {
    if (loading) {
      wx.showLoading({ title: '加载中...', mask: true });
    }

    // 构建完整 URL
    const fullUrl = `${BASE_URL}${API_PREFIX}${url}`;

    // 构建请求头
    const header = {
      'Content-Type': 'application/json',
    };

    // 需要认证时携带 token
    if (auth) {
      const app = getApp();
      const token = app.globalData.token;
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }
    }

    wx.request({
      url: fullUrl,
      method,
      data,
      header,
      timeout: REQUEST_TIMEOUT,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 业务成功 — 直接返回 data 字段
          resolve(res.data.data !== undefined ? res.data.data : res.data);
        } else {
          // 业务错误
          const errMsg = res.data?.error?.message || res.data?.message || '请求失败';
          handleError(res.statusCode, errMsg, reject, silent);
        }
      },
      fail(err) {
        // 网络错误
        const msg = err.errMsg.includes('timeout')
          ? '请求超时，请检查网络'
          : '网络异常，请稍后重试';
        if (!silent) {
          wx.showToast({ title: msg, icon: 'none', duration: 2000 });
        }
        const e = new Error(msg);
        e.status = 0; // 0 = 网络错误（非服务端状态码），供调用方区分"没连上"和"被拒绝"
        reject(e);
      },
      complete() {
        if (loading) {
          wx.hideLoading();
        }
      },
    });
  });
}

/**
 * 统一错误处理
 */
function handleError(statusCode, message, reject, silent) {
  if (!silent) {
    switch (statusCode) {
      case 401:
        // token 过期 → 清除登录态并跳转
        const app = getApp();
        app.clearLogin();
        wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 });
        break;
      case 403:
        wx.showToast({ title: message || '无权限操作', icon: 'none', duration: 2000 });
        break;
      case 404:
        wx.showToast({ title: message || '数据不存在', icon: 'none', duration: 2000 });
        break;
      default:
        wx.showToast({ title: message || '操作失败', icon: 'none', duration: 2000 });
        break;
    }
  }
  const err = new Error(message);
  err.status = statusCode; // 携带服务端状态码，供调用方区分 401（登录失效）与其他错误
  reject(err);
}

/**
 * 便捷方法
 */
const http = {
  get(url, data, options = {}) {
    return request({ url, method: 'GET', data, ...options });
  },
  post(url, data, options = {}) {
    return request({ url, method: 'POST', data, ...options });
  },
  put(url, data, options = {}) {
    return request({ url, method: 'PUT', data, ...options });
  },
  del(url, data, options = {}) {
    return request({ url, method: 'DELETE', data, ...options });
  },
  patch(url, data, options = {}) {
    return request({ url, method: 'PATCH', data, ...options });
  },
};

module.exports = http;
