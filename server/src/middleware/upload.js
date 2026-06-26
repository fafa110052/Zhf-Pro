const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// 允许的图片格式
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB（4K 渲染图可达 20-35MB）

// 文件名安全化：只保留中文/英文/数字/下划线/连字符
const sanitize = (s) => (s || 'unknown').replace(/[^a-zA-Z0-9一-鿿_-]/g, '').replace(/\s+/g, '_') || 'unknown';

// 磁盘存储配置
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'originals'),
  filename: (req, file, cb) => {
    // 文件名格式：设计师名-日期-随机串.扩展名
    // 例：张三-20260623-a1b2.jpg
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const designerName = sanitize(req.user?.name || 'unknown');
    const random = crypto.randomBytes(4).toString('hex');
    const name = `${designerName}-${dateStr}-${random}${ext}`;
    cb(null, name);
  },
});

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的图片格式: ${file.mimetype}。仅允许 jpg/png/gif/webp`), false);
  }
};

// 导出配置好的 multer 实例
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});
