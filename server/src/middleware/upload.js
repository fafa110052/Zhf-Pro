const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { normalizeCategory, ALL_DIRS } = require('../config/imageCategories');

// 允许的图片格式
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB（4K 渲染图可达 20-35MB）

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// 启动时确保每个分类目录存在（含 misc 兜底）
ALL_DIRS.forEach((cat) => {
  const dir = path.join(UPLOAD_ROOT, cat);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 文件名安全化：只保留中文/英文/数字/下划线/连字符
const sanitize = (s) => (s || 'unknown').replace(/[^a-zA-Z0-9一-鿿_-]/g, '').replace(/\s+/g, '_') || 'unknown';

// 磁盘存储配置：按 ?category= 分目录，文件名带分类前缀
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = normalizeCategory(req.query.category);
    cb(null, path.join(UPLOAD_ROOT, category));
  },
  filename: (req, file, cb) => {
    // 文件名格式：分类-设计师名-日期-随机串.扩展名
    // 例：works-张三-20260713-a1b2c3d4.jpg
    const category = normalizeCategory(req.query.category);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const designerName = sanitize(req.user?.name || 'unknown');
    const random = crypto.randomBytes(4).toString('hex');
    cb(null, `${category}-${designerName}-${dateStr}-${random}${ext}`);
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

module.exports = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });
