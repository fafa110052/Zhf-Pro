const db = require('../db/connection');
const fs = require('fs');
const path = require('path');

/**
 * 图片库管理业务逻辑（B端管理后台）
 */
const imageService = {
  // ==========================================
  // 图片列表（分页）
  // ==========================================
  async list(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;

    let query = db('image_library')
      .select(
        'image_library.*',
        db.raw("COALESCE(designers.name, '系统') as uploader_name")
      )
      .leftJoin('designers', 'image_library.uploaded_by', 'designers.id');

    // 按上传者筛选
    if (filters.uploaded_by) {
      query = query.where('image_library.uploaded_by', filters.uploaded_by);
    }

    // 按日期范围筛选
    if (filters.date_from) {
      query = query.where('image_library.created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('image_library.created_at', '<=', `${filters.date_to} 23:59:59`);
    }

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('image_library.created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 图片详情
  // ==========================================
  async getById(id) {
    const image = await db('image_library')
      .select(
        'image_library.*',
        db.raw("COALESCE(designers.name, '系统') as uploader_name")
      )
      .leftJoin('designers', 'image_library.uploaded_by', 'designers.id')
      .where('image_library.id', id)
      .first();

    if (!image) {
      throw Object.assign(new Error('图片不存在'), { status: 404 });
    }

    return image;
  },

  // ==========================================
  // 删除图片（引用保护）
  // ==========================================
  async remove(id) {
    const image = await db('image_library').where('id', id).first();
    if (!image) {
      throw Object.assign(new Error('图片不存在'), { status: 404 });
    }

    // 检查是否被作品引用
    const [{ count }] = await db('case_images')
      .where('library_image_id', id)
      .count('* as count');

    if (count > 0) {
      throw Object.assign(
        new Error(`该图片被 ${count} 个作品引用，请先从作品中移除此图片后再删除`),
        { status: 409 }
      );
    }

    // 删除物理文件
    const baseDir = path.join(__dirname, '..', '..');
    [image.image_url, image.thumb_url].forEach((url) => {
      if (url) {
        const filePath = path.join(baseDir, url);
        fs.unlink(filePath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.warn(`⚠️ 删除文件失败: ${filePath}`, err.message);
          }
        });
      }
    });

    // 删除数据库记录
    await db('image_library').where('id', id).del();
  },

  // ==========================================
  // 批量删除图片
  // ==========================================
  async removeMany(ids) {
    const results = { deleted: 0, failed: 0, errors: [] };

    for (const id of ids) {
      try {
        await this.remove(id);
        results.deleted++;
      } catch (err) {
        results.failed++;
        results.errors.push({ id, message: err.message });
      }
    }

    return results;
  },

  // ==========================================
  // 引用计数增减（供作品模块调用）
  // ==========================================
  async incrementRef(id) {
    await db('image_library').where('id', id).increment('reference_count', 1);
  },

  async decrementRef(id) {
    await db('image_library').where('id', id).decrement('reference_count', 1);
  },
};

module.exports = imageService;
