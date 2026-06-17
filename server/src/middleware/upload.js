const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// 允许的图片格式
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// 磁盘存储配置
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'originals'),
  filename: (req, file, cb) => {
    // 安全文件名：时间戳 + 随机串 + 原扩展名
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
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
