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
        db.raw("COALESCE(designers.name, '系统') as uploader_name"),
        // 实时引用计数（case_images 表中引用该图片的作品数）
        db.raw("(SELECT COUNT(*) FROM case_images WHERE case_images.library_image_id = image_library.id) as reference_count")
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

    // 按业务分类筛选
    if (filters.category) {
      query = query.where('image_library.category', filters.category);
    }

    // 关键词：原名 或 上传者姓名
    if (filters.keyword) {
      const kw = `%${filters.keyword}%`;
      query = query.where(function () {
        this.where('image_library.original_name', 'like', kw)
          .orWhere('designers.name', 'like', kw);
      });
    }

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('image_library.created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    // 各分类计数（用于前端 Tab）—— 复用同样的非分类筛选条件
    let countQuery = db('image_library')
      .leftJoin('designers', 'image_library.uploaded_by', 'designers.id');
    if (filters.uploaded_by) countQuery = countQuery.where('image_library.uploaded_by', filters.uploaded_by);
    if (filters.date_from) countQuery = countQuery.where('image_library.created_at', '>=', filters.date_from);
    if (filters.date_to) countQuery = countQuery.where('image_library.created_at', '<=', `${filters.date_to} 23:59:59`);
    if (filters.keyword) {
      const kw = `%${filters.keyword}%`;
      countQuery = countQuery.where(function () {
        this.where('image_library.original_name', 'like', kw).orWhere('designers.name', 'like', kw);
      });
    }
    const countRows = await countQuery
      .select('image_library.category')
      .count('* as count')
      .groupBy('image_library.category');
    const counts = countRows.reduce((acc, r) => { acc[r.category] = Number(r.count); return acc; }, {});

    return {
      list,
      counts,
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
  // 删除图片（引用保护 → force=true 时级联处理）
  // ==========================================
  async remove(id, force = false) {
    const image = await db('image_library').where('id', id).first();
    if (!image) {
      throw Object.assign(new Error('图片不存在'), { status: 404 });
    }

    // 检查引用
    const refs = await db('case_images')
      .where('library_image_id', id)
      .select('case_id');

    if (refs.length > 0) {
      if (!force) {
        throw Object.assign(
          new Error(`该图片被 ${refs.length} 个作品引用，请先从作品中移除此图片后再删除`),
          { status: 409 }
        );
      }

      // 强制删除：逐个处理引用该图片的作品
      for (const ref of refs) {
        // 删除该图片在作品中的关联记录
        await db('case_images').where({ case_id: ref.case_id, library_image_id: id }).del();

        // 检查作品是否以该图片为封面
        const work = await db('cases').where('id', ref.case_id).first();
        if (work && work.cover_image === image.image_url) {
          // 找下一张可用图片作为封面
          const nextImage = await db('case_images')
            .where('case_id', ref.case_id)
            .orderBy('sort_order', 'asc')
            .first();
          if (nextImage) {
            await db('cases').where('id', ref.case_id).update({ cover_image: nextImage.image_url });
          }
        }

        // 检查作品是否还有其他图片
        const [{ remaining }] = await db('case_images')
          .where('case_id', ref.case_id)
          .count('* as remaining');

        if (remaining === 0) {
          // 作品没有图片了 → 删除作品
          await db('cases').where('id', ref.case_id).del();
        }
      }
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
  // 查询图片被哪些作品引用
  // ==========================================
  async getReferences(id) {
    const image = await db('image_library').where('id', id).first();
    if (!image) {
      throw Object.assign(new Error('图片不存在'), { status: 404 });
    }

    // 查找引用该图片的所有作品
    const refImages = await db('case_images')
      .where('library_image_id', id)
      .select('case_id');

    if (refImages.length === 0) {
      return { image, reference_count: 0, works: [] };
    }

    const works = [];
    for (const ref of refImages) {
      const work = await db('cases')
        .where('id', ref.case_id)
        .select('id', 'title', 'cover_image')
        .first();
      if (!work) continue;

      // 该作品的总图片数
      const [{ total }] = await db('case_images')
        .where('case_id', ref.case_id)
        .count('* as total');

      works.push({
        id: work.id,
        title: work.title || '未命名作品',
        total_images: total,
        will_be_deleted: total <= 1,  // 仅剩这张图 → 作品也会被删除
      });
    }

    return {
      image: { id: image.id, original_name: image.original_name, image_url: image.image_url },
      reference_count: works.length,
      works,
    };
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
