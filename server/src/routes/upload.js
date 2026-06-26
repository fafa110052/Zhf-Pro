const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload');
const uploadService = require('../services/uploadService');
const { authenticate } = require('../middleware/auth');

// 确保上传目录存在
const originalsDir = path.join(__dirname, '..', '..', 'uploads', 'originals');
const thumbnailsDir = path.join(__dirname, '..', '..', 'uploads', 'thumbnails');
[originalsDir, thumbnailsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * POST /api/v1/upload
 * 单文件上传
 *
 * 请求：multipart/form-data，字段名 "file"
 * 可选字段：uploaded_by（管理员可指定上传者设计师 ID）
 *         work_name 作品名称（用于图片命名）
 *         category 分类（备用，如 客厅/卧室/厨房）
 * 认证：需要登录（管理员或设计师均可）
 * 返回：image_library 记录
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    // 管理员可指定 uploaded_by 为其他设计师
    const uploadedBy = (req.user.role === 'admin' && req.body.uploaded_by)
      ? Number(req.body.uploaded_by)
      : req.user.id;
    const options = {
      designerName: req.user.name || 'unknown',
      workName: req.body.work_name || '',
      category: req.body.category || '',
    };
    const record = await uploadService.uploadSingle(req.file, uploadedBy, options);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/upload/multiple
 * 多文件上传（最多 9 张）
 *
 * 请求：multipart/form-data，字段名 "files"
 * 可选字段：uploaded_by（管理员可指定上传者设计师 ID）
 *         category 分类（用于图片命名）
 * 认证：需要登录
 * 返回：{ uploaded: [...], failed: [...] }
 */
router.post('/upload/multiple', authenticate, upload.array('files', 9), async (req, res, next) => {
  try {
    // 管理员可指定 uploaded_by 为其他设计师
    const uploadedBy = (req.user.role === 'admin' && req.body.uploaded_by)
      ? Number(req.body.uploaded_by)
      : req.user.id;
    const options = {
      designerName: req.user.name || 'unknown',
      workName: req.body.work_name || '',
      category: req.body.category || '',
    };
    const result = await uploadService.uploadMultiple(req.files, uploadedBy, options);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// Multer 错误处理（必须放在路由之后）
// ═══════════════════════════════════════════
const multer = require('multer');

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: '文件大小不能超过 10MB',
      LIMIT_FILE_COUNT: '文件数量超过限制',
      LIMIT_UNEXPECTED_FILE: '上传字段名不正确',
    };
    return res.status(400).json({
      error: { message: messages[err.code] || `上传错误: ${err.message}`, status: 400 },
    });
  }
  // 文件类型错误的普通 Error
  if (err.message && err.message.startsWith('不支持的图片格式')) {
    return res.status(400).json({ error: { message: err.message, status: 400 } });
  }
  next(err);
});

module.exports = router;
