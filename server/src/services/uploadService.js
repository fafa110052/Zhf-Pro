const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const db = require('../db/connection');

// 缩略图尺寸（等比缩放，宽度 400px）
const THUMB_WIDTH = 400;
const THUMBS_DIR = path.join(__dirname, '..', '..', 'uploads', 'thumbnails');

/**
 * 文件上传 + 图片处理业务逻辑
 */
const uploadService = {
  // ==========================================
  // 单文件上传
  // ==========================================
  async uploadSingle(file, userId) {
    if (!file) {
      throw Object.assign(new Error('未选择文件'), { status: 400 });
    }

    // 生成缩略图
    const thumbFilename = `thumb_${file.filename}`;
    const thumbPath = path.join(THUMBS_DIR, thumbFilename);

    try {
      await sharp(file.path)
        .resize(THUMB_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
    } catch (err) {
      // 缩略图生成失败时清理已上传的原图
      fs.unlink(file.path, () => {});
      throw Object.assign(new Error(`图片处理失败: ${err.message}`), { status: 500 });
    }

    // 插入 image_library
    const [id] = await db('image_library').insert({
      image_url: `/uploads/originals/${file.filename}`,
      thumb_url: `/uploads/thumbnails/${thumbFilename}`,
      original_name: file.originalname,
      file_size: file.size,
      uploaded_by: userId || null,
    });

    return db('image_library').where('id', id).first();
  },

  // ==========================================
  // 多文件上传
  // ==========================================
  async uploadMultiple(files, userId) {
    if (!files || files.length === 0) {
      throw Object.assign(new Error('未选择文件'), { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const record = await this.uploadSingle(file, userId);
        results.push(record);
      } catch (err) {
        errors.push({ file: file.originalname, error: err.message });
      }
    }

    return { uploaded: results, failed: errors };
  },
};

module.exports = uploadService;
