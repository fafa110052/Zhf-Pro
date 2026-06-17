/**
 * 通用参数校验中间件（工厂函数集）
 *
 * 用法示例：
 *   router.post('/xxx', validate.requireFields('title', 'phone'), handler);
 *   router.get('/xxx', validate.pagination(), handler);
 *   router.put('/xxx/:id', validate.idParam('id'), handler);
 */

/**
 * 要求请求体中必须包含指定字段
 */
const requireFields = (...fields) => {
  return (req, res, next) => {
    const missing = fields.filter((f) => {
      const val = req.body[f];
      return val === undefined || val === null || val === '';
    });
    if (missing.length > 0) {
      return res.status(400).json({
        error: { message: `缺少必填字段: ${missing.join(', ')}`, status: 400 },
      });
    }
    next();
  };
};

/**
 * 校验路径参数 id 为正整数
 */
const idParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = Number(req.params[paramName]);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        error: { message: `参数 ${paramName} 必须为正整数`, status: 400 },
      });
    }
    next();
  };
};

/**
 * 标准化分页参数（注入 req.pagination）
 */
const pagination = (defaultSize = 12, maxSize = 50) => {
  return (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(maxSize, Math.max(1, parseInt(req.query.page_size) || defaultSize));
    req.pagination = { page, pageSize };
    next();
  };
};

/**
 * 限制请求体只允许指定字段（防 Mass Assignment）
 */
const allowFields = (...fields) => {
  return (req, res, next) => {
    const filtered = {};
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        filtered[key] = req.body[key];
      }
    }
    req.body = filtered;
    next();
  };
};

module.exports = { requireFields, idParam, pagination, allowFields };
