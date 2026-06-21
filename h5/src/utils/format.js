/**
 * 格式化工具函数（从小程序 util.js 移植）
 */

// 格式化时间
export function formatTime(date, format = 'datetime') {
  if (!date) return '';
  const d = new Date(typeof date === 'string' ? date.replace(/-/g, '/') : date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');

  if (format === 'date') return `${year}-${month}-${day}`;

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

// 格式化数字（浏览量）
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
}

// 格式化面积
export function formatArea(area) {
  if (!area) return '';
  return `${area}㎡`;
}

// 格式化预算（单值）
export function formatBudget(budget) {
  if (!budget) return '';
  if (budget >= 100) return `${(budget / 100).toFixed(0)}百万`;
  return `${budget}万`;
}

// 格式化预算区间
export function formatBudgetRange(min, max) {
  if (!min && !max) return '';
  if (min && max) {
    return min === max ? formatBudget(min) : formatBudget(min) + '-' + formatBudget(max);
  }
  if (min) return formatBudget(min) + '起';
  return formatBudget(max) + '以内';
}
