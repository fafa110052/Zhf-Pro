/**
 * 请求去重中间件
 *
 * 防止同一个用户短时间内重复提交相同的表单数据。
 *
 * 机制：
 *   1. 对每个 POST/PUT/PATCH 请求计算"指纹"
 *      fingerprint = SHA256(userId + method + path + body_hash)
 *   2. 30 秒内相同指纹的请求 → 返回 409
 *   3. 请求处理成功后缓存指纹，失败时清除（允许重试）
 *
 * 跳过场景：
 *   - GET / DELETE 请求（天然幂等）
 *   - body 为空的请求（纯状态变更，如 PATCH /works/:id/hot）
 *   - 登录接口（用户可能尝试不同密码）
 */

const crypto = require('crypto');

// ─── 配置 ───
const DEDUP_WINDOW_MS = 30 * 1000;  // 去重窗口 30 秒
const CLEANUP_INTERVAL_MS = 60 * 1000; // 清理间隔 60 秒

// ─── 跳过去重的路径前缀 ───
const SKIP_PREFIXES = [
  '/api/v1/auth/',       // 登录接口
];

// ─── 指纹缓存（内存）───
// Map<fingerprint, { createdAt: timestamp }>
const cache = new Map();

// 定期清理过期指纹
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now - val.createdAt > DEDUP_WINDOW_MS) {
      cache.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref(); // unref 防止定时器阻止进程退出

/**
 * 请求去重中间件
 */
function dedup(req, res, next) {
  // 仅对写入请求生效
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  // 跳过无 body 的请求（纯状态变更）
  if (!req.body || Object.keys(req.body).length === 0) {
    return next();
  }

  // 跳过登录接口
  if (SKIP_PREFIXES.some(prefix => req.originalUrl.startsWith(prefix))) {
    return next();
  }

  // 计算用户标识
  const userId = req.user?.id || req.ip || 'anonymous';

  // 计算请求体哈希
  const bodyStr = JSON.stringify(req.body);
  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex').slice(0, 16);

  // 指纹：用户 + 方法 + 路径 + 内容
  const fingerprint = crypto.createHash('sha256')
    .update(`${userId}:${req.method}:${req.path}:${bodyHash}`)
    .digest('hex');

  // 检查是否重复
  const cached = cache.get(fingerprint);
  if (cached && Date.now() - cached.createdAt < DEDUP_WINDOW_MS) {
    return res.status(409).json({
      error: { message: '请勿重复提交', status: 409 },
    });
  }

  // 记录指纹
  cache.set(fingerprint, { createdAt: Date.now() });

  // ─── 劫持响应，失败时清除指纹（允许用户修正后重试）───
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // 请求成功（2xx）→ 保留指纹；失败 → 清除指纹允许重试
    if (res.statusCode < 200 || res.statusCode >= 300) {
      cache.delete(fingerprint);
    }
    return originalJson(body);
  };

  next();
}

module.exports = dedup;
