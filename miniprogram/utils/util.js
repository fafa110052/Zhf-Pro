/**
 * 通用工具函数
 */

/**
 * 格式化时间
 * @param {string|Date} date
 * @param {string} format — 'datetime' | 'date' | 'relative'
 * @returns {string}
 */
function formatTime(date, format = 'datetime') {
  if (!date) return '';
  const d = new Date(typeof date === 'string' ? date.replace(/-/g, '/') : date);

  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');

  if (format === 'date') {
    return `${year}-${month}-${day}`;
  }

  if (format === 'relative') {
    const now = Date.now();
    const diff = now - d.getTime();
    const minuteAgo = Math.floor(diff / 60000);
    const hourAgo = Math.floor(diff / 3600000);
    const dayAgo = Math.floor(diff / 86400000);

    if (minuteAgo < 1) return '刚刚';
    if (minuteAgo < 60) return `${minuteAgo} 分钟前`;
    if (hourAgo < 24) return `${hourAgo} 小时前`;
    if (dayAgo < 7) return `${dayAgo} 天前`;
    return `${year}-${month}-${day}`;
  }

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 格式化数字（浏览量等）
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return String(num);
}

/**
 * 格式化面积
 * @param {number} area — 平方米
 * @returns {string}
 */
function formatArea(area) {
  if (!area) return '';
  return `${area}㎡`;
}

/**
 * 格式化预算
 * @param {number} budget — 万元
 * @returns {string}
 */
function formatBudget(budget) {
  if (!budget) return '';
  if (budget >= 100) {
    return `${(budget / 100).toFixed(0)}百万`;
  }
  return `${budget}万`;
}

/**
 * 防抖
 * @param {function} fn
 * @param {number} delay — 默认 300ms
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 节流
 * @param {function} fn
 * @param {number} interval — 默认 300ms
 */
function throttle(fn, interval = 300) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 图片 URL 补全（相对路径 → 完整 URL）
 * @param {string} url
 * @returns {string}
 */
function fullImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const app = getApp();
  return `${app.globalData.baseUrl}${url}`;
}

/**
 * Toast 提示封装
 */
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration });
}

function showSuccess(title = '操作成功') {
  wx.showToast({ title, icon: 'success', duration: 2000 });
}

function showError(title = '操作失败') {
  wx.showToast({ title, icon: 'error', duration: 2000 });
}

/**
 * 确认弹窗
 * @param {string} content
 * @param {string} title
 * @returns {Promise<boolean>}
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success(res) {
        resolve(res.confirm);
      },
    });
  });
}

module.exports = {
  formatTime,
  formatNumber,
  formatArea,
  formatBudget,
  debounce,
  throttle,
  fullImageUrl,
  showToast,
  showSuccess,
  showError,
  showConfirm,
};
