const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const db = require('../db/connection');

// 缩略图尺寸（等比缩放，宽度 400px）
const THUMB_WIDTH = 400;
// 原图压缩：最大边 5120px，WebP Q95，控制在 5MB 以内
// 接近无损保留渲染图细节，手机放大看材质纹理不丢
const MAX_DIMENSION = 5120;
const WEBP_QUALITY = 95;
const THUMBS_DIR = path.join(__dirname, '..', '..', 'uploads', 'thumbnails');

/**
 * 文件上传 + 图片处理业务逻辑
 */
// 文件名安全化
const sanitize = (s) => (s || '').replace(/[^a-zA-Z0-9一-鿿_-]/g, '').replace(/\s+/g, '_') || 'unknown';

const uploadService = {
  // ==========================================
  // 单文件上传
  // ==========================================
  async uploadSingle(file, userId, options = {}) {
    if (!file) {
      throw Object.assign(new Error('未选择文件'), { status: 400 });
    }

    // 生成缩略图（先用原图生成，保证最佳清晰度）
    const thumbFilename = `thumb_${file.filename}`;
    const thumbPath = path.join(THUMBS_DIR, thumbFilename);

    try {
      await sharp(file.path)
        .resize(THUMB_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
    } catch (err) {
      fs.unlink(file.path, () => {});
      throw Object.assign(new Error(`图片处理失败: ${err.message}`), { status: 500 });
    }

    // 原图压缩：最大边 5120px，WebP Q95，单张 <5MB
    // 接近无损，手机放大看材质纹理不丢细节
    let finalFilename = file.filename;
    let finalPath = file.path;
    let finalSize = file.size;

    try {
      const parsedPath = path.parse(file.filename);
      finalFilename = `${parsedPath.name}.webp`;
      finalPath = path.join(path.dirname(file.path), finalFilename);
      const tmpPath = finalPath + '.tmp';

      await sharp(file.path)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(tmpPath);

      // 替换原文件
      if (tmpPath !== file.path) {
        fs.unlinkSync(file.path);
      }
      fs.renameSync(tmpPath, finalPath);
      finalSize = fs.statSync(finalPath).size;
    } catch (err) {
      // 压缩失败不阻塞上传，保留原图
      console.warn(`⚠️ 图片压缩失败，保留原图: ${err.message}`);
    }

    // original_name 格式：设计师-作品名字-日期.扩展名
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const designerName = sanitize(options.designerName || 'unknown');
    const workName = sanitize(options.workName || options.category || '');
    const ext = path.extname(finalFilename);
    const displayName = workName
      ? `${designerName}-${workName}-${dateStr}${ext}`
      : `${designerName}-${dateStr}${ext}`;

    // 插入 image_library
    const [id] = await db('image_library').insert({
      image_url: `/uploads/originals/${finalFilename}`,
      thumb_url: `/uploads/thumbnails/${thumbFilename}`,
      original_name: displayName,
      file_size: finalSize,
      uploaded_by: userId || null,
    });

    return db('image_library').where('id', id).first();
  },

  // ==========================================
  // 多文件上传
  // ==========================================
  async uploadMultiple(files, userId, options = {}) {
    if (!files || files.length === 0) {
      throw Object.assign(new Error('未选择文件'), { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const record = await this.uploadSingle(file, userId, options);
        results.push(record);
      } catch (err) {
        errors.push({ file: file.originalname, error: err.message });
      }
    }

    return { uploaded: results, failed: errors };
  },
};

module.exports = uploadService;
