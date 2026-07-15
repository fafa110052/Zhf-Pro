const db = require('../db/connection');

/**
 * 为作品列表项补全封面信息（cover_image + cover_thumb）
 * cover_thumb 优先取缩略图，没有时回退到原图
 */
async function enrichCoverInfo(items) {
  if (!items || items.length === 0) return items;
  return Promise.all(items.map(async (item) => {
    if (item.cover_image) {
      const coverRow = await db('case_images')
        .where('case_id', item.id)
        .where('image_url', item.cover_image)
        .select('thumb_url')
        .first();
      item.cover_thumb = coverRow?.thumb_url || item.cover_image;
    } else {
      const firstImg = await db('case_images')
        .where('case_id', item.id)
        .orderBy('sort_order', 'asc')
        .select('image_url', 'thumb_url')
        .first();
      if (firstImg) {
        item.cover_image = firstImg.image_url;
        item.cover_thumb = firstImg.thumb_url || firstImg.image_url;
      }
    }
    return item;
  }));
}

/**
 * 归一化封面图路径：去除 URL 前缀，确保存储的是相对路径
 */
function normalizeCoverImage(url) {
  if (!url) return url;
  // 去掉本地服务器的 baseUrl 前缀（如 http://192.168.1.5:3000）
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const u = new URL(url);
      return u.pathname; // 只保留路径部分
    } catch {
      return url; // 解析失败，保持原样
    }
  }
  return url; // 已经是相对路径
}

/**
 * 清理 VR 链接
 * undefined → undefined（不更新）；null/空串 → null（清空）；其他 trim 后存库
 */
function normalizeVrUrl(url) {
  if (url === undefined) return undefined;
  if (url === null || String(url).trim() === '') return null;
  return String(url).trim();
}

/** 从请求体构建 cases 表的更新字段（白名单 + 归一化，不含 designer_id / review_status） */
function buildCaseUpdates(data) {
  const allowed = ['title', 'description', 'house_type_id', 'area_category_id',
                   'style_category_id', 'area_sqm', 'budget_min', 'budget_max',
                   'completion_date', 'cover_image', 'vr_url'];
  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      if (key === 'cover_image') {
        updates[key] = normalizeCoverImage(data[key]);
      } else if (key === 'vr_url') {
        updates[key] = normalizeVrUrl(data[key]);
      } else {
        updates[key] = data[key];
      }
    }
  }
  return updates;
}

/** 整组替换作品图片关联（先删后插，保持 sort_order） */
async function replaceCaseImages(workId, images) {
  // 校验先行：任何一个图片 ID 无效都直接拒绝，避免把作品图片静默清空
  // （历史数据中存在 library_image_id 为空的关联行，编辑此类作品需先做数据回填）
  let urlMap = {};
  if (images && images.length > 0) {
    const imageIds = images.map(img => img && img.id).filter(id => id != null);
    if (imageIds.length !== images.length) {
      throw Object.assign(new Error('存在无效的图片ID（历史作品需先修复图片数据）'), { status: 400 });
    }
    const libImages = await db('image_library').whereIn('id', imageIds).select('id', 'image_url', 'thumb_url');
    if (libImages.length !== new Set(imageIds).size) {
      throw Object.assign(new Error('部分图片在图库中不存在'), { status: 400 });
    }
    for (const li of libImages) {
      urlMap[li.id] = { image_url: li.image_url, thumb_url: li.thumb_url || null };
    }
  }
  await db('case_images').where('case_id', workId).delete();
  if (images && images.length > 0) {
    const caseImages = images.map((img, idx) => ({
      case_id: workId,
      library_image_id: img.id,
      image_url: (urlMap[img.id] && urlMap[img.id].image_url) || '',
      thumb_url: (urlMap[img.id] && urlMap[img.id].thumb_url) || null,
      sort_order: idx,
    }));
    await db('case_images').insert(caseImages);
  }
}

/**
 * 装修作品业务逻辑
 * 负责作品列表的多维筛选、分页、详情（含浏览量）、热门推荐
 */
const caseService = {
  // ==========================================
  // 公开列表（多维筛选 + 分页）
  // ==========================================

  /**
   * 查询参数一览：
   *   house_type_id   — 户型筛选
   *   area_category_id — 装修空间筛选
   *   style_category_id — 风格筛选
   *   keyword         — 标题/描述模糊搜索
   *   budget_min      — 最低造价
   *   budget_max      — 最高造价
   *   area_min        — 最小面积
   *   area_max        — 最大面积
   *   page            — 页码（默认 1）
   *   page_size       — 每页数量（默认 12，上限 50）
   *   sort_by         — 排序：newest | popular | budget_asc | budget_desc
   */
  async list(filters = {}, pagination = {}, sortBy = 'newest') {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 12));
    const offset = (page - 1) * pageSize;

    // 基础查询：仅展示已审核通过的作品
    let query = db('cases')
      .join('categories as ht', 'cases.house_type_id', 'ht.id')
      .join('categories as ac', 'cases.area_category_id', 'ac.id')
      .join('categories as sc', 'cases.style_category_id', 'sc.id')
      .join('designers', 'cases.designer_id', 'designers.id')
      .where('cases.review_status', 'approved')
      .select(
        'cases.id',
        'cases.title',
        'cases.description',
        'cases.house_type_id',
        'cases.area_category_id',
        'cases.style_category_id',
        'cases.area_sqm',
        'cases.budget_min',
        'cases.budget_max',
        'cases.completion_date',
        'cases.cover_image',
        'cases.is_hot',
        'cases.view_count',
        'cases.created_at',
        'ht.name as house_type_name',
        'ac.name as area_category_name',
        'sc.name as style_category_name',
        'designers.id as designer_id',
        'designers.name as designer_name',
        'designers.avatar_url as designer_avatar'
      );

    // ── 筛选条件 ──
    if (filters.house_type_id) {
      query = query.where('cases.house_type_id', Number(filters.house_type_id));
    }
    if (filters.area_category_id) {
      query = query.where('cases.area_category_id', Number(filters.area_category_id));
    }
    if (filters.style_category_id) {
      query = query.where('cases.style_category_id', Number(filters.style_category_id));
    }
    if (filters.keyword) {
      const kw = `%${filters.keyword}%`;
      query = query.where(function () {
        this.where('cases.title', 'like', kw)
            .orWhere('cases.description', 'like', kw);
      });
    }
    if (filters.budget_min) {
      query = query.where('cases.budget_max', '>=', Number(filters.budget_min));
    }
    if (filters.budget_max) {
      query = query.where('cases.budget_min', '<=', Number(filters.budget_max));
    }
    if (filters.area_min) {
      query = query.where('cases.area_sqm', '>=', Number(filters.area_min));
    }
    if (filters.area_max) {
      query = query.where('cases.area_sqm', '<=', Number(filters.area_max));
    }

    // ── 总数（在排序和分页之前）──
    const [{ count }] = await query.clone().count('* as count');

    // ── 排序 ──
    switch (sortBy) {
      case 'popular':
        query = query.orderBy('cases.view_count', 'desc');
        break;
      case 'budget_asc':
        query = query.orderBy('cases.budget_min', 'asc');
        break;
      case 'budget_desc':
        query = query.orderBy('cases.budget_max', 'desc');
        break;
      case 'newest':
      default:
        query = query.orderBy('cases.created_at', 'desc');
        break;
    }
    // 次要排序：id 保证分页稳定
    query = query.orderBy('cases.id', 'desc');

    // ── 分页 ──
    const list = await query.offset(offset).limit(pageSize);

    // 补全封面信息（cover_image + cover_thumb）
    const enriched = await enrichCoverInfo(list);

    return {
      list: enriched,
      pagination: {
        page,
        page_size: pageSize,
        total: count,
        total_pages: Math.ceil(count / pageSize),
      },
    };
  },

  // ==========================================
  // 作品详情（含图片列表 + 设计师名片）
  // ==========================================
  async getById(id) {
    const work = await db('cases')
      .join('categories as ht', 'cases.house_type_id', 'ht.id')
      .join('categories as ac', 'cases.area_category_id', 'ac.id')
      .join('categories as sc', 'cases.style_category_id', 'sc.id')
      .join('designers', 'cases.designer_id', 'designers.id')
      .where('cases.id', id)
      .where('cases.review_status', 'approved')
      .select(
        'cases.*',
        'ht.name as house_type_name',
        'ac.name as area_category_name',
        'sc.name as style_category_name',
        'designers.name as designer_name',
        'designers.avatar_url as designer_avatar',
        'designers.phone as designer_phone',
        'designers.years_of_exp as designer_years',
        'designers.bio as designer_bio'
      )
      .first();

    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }

    // 浏览量 +1（异步，失败不影响响应）
    await db('cases').where('id', id).increment('view_count', 1);

    // 获取作品图片列表
    const images = await db('case_images')
      .where('case_id', id)
      .orderBy('sort_order', 'asc')
      .select('id', 'image_url', 'thumb_url', 'sort_order');

    return { ...work, images };
  },

  // ==========================================
  // 热门推荐
  // ==========================================
  async getHot(limit = 6) {
    const max = Math.min(20, Math.max(1, parseInt(limit) || 6));
    const list = await db('cases')
      .join('categories as ht', 'cases.house_type_id', 'ht.id')
      .join('categories as sc', 'cases.style_category_id', 'sc.id')
      .join('designers', 'cases.designer_id', 'designers.id')
      .where('cases.review_status', 'approved')
      .where('cases.is_hot', 1)
      .select(
        'cases.id',
        'cases.title',
        'cases.cover_image',
        'cases.view_count',
        'cases.area_sqm',
        'cases.budget_min',
        'cases.budget_max',
        'ht.name as house_type_name',
        'sc.name as style_category_name',
        'designers.name as designer_name',
        'designers.avatar_url as designer_avatar'
      )
      .orderBy('cases.view_count', 'desc')
      .orderBy('cases.id', 'desc')
      .limit(max);

    // 补全封面信息（cover_image + cover_thumb）
    return enrichCoverInfo(list);
  },

  // ══════════════════════════════════════════
  // 设计师端 — 我的作品
  // ══════════════════════════════════════════

  /**
   * 设计师作品列表（含各状态筛选）
   * @param {number} designerId
   * @param {object} filters — { status, keyword, page, page_size }
   */
  async listByDesigner(designerId, filters = {}) {
    const page = Math.max(1, parseInt(filters.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(filters.page_size) || 12));
    const offset = (page - 1) * pageSize;

    let query = db('cases')
      .join('categories as ht', 'cases.house_type_id', 'ht.id')
      .join('categories as ac', 'cases.area_category_id', 'ac.id')
      .join('categories as sc', 'cases.style_category_id', 'sc.id')
      .where('cases.designer_id', designerId)
      .select(
        'cases.id', 'cases.title', 'cases.cover_image',
        'cases.area_sqm', 'cases.budget_min', 'cases.budget_max',
        'cases.review_status', 'cases.reject_reason',
        'cases.is_hot', 'cases.view_count', 'cases.created_at', 'cases.updated_at',
        'ht.name as house_type_name',
        'ac.name as area_category_name',
        'sc.name as style_category_name'
      );

    if (filters.status) {
      query = query.where('cases.review_status', filters.status);
    }
    if (filters.keyword) {
      query = query.where('cases.title', 'like', `%${filters.keyword}%`);
    }

    const [{ count }] = await query.clone().count('* as count');
    const list = await query
      .orderBy('cases.updated_at', 'desc')
      .orderBy('cases.id', 'desc')
      .offset(offset)
      .limit(pageSize);

    // 补全封面信息（cover_image + cover_thumb）
    const enriched = await enrichCoverInfo(list);

    return {
      list: enriched,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  /** 设计师查看自己某个作品详情（含图片） */
  async getByDesigner(designerId, workId) {
    const work = await db('cases')
      .join('categories as ht', 'cases.house_type_id', 'ht.id')
      .join('categories as ac', 'cases.area_category_id', 'ac.id')
      .join('categories as sc', 'cases.style_category_id', 'sc.id')
      .where('cases.id', workId)
      .where('cases.designer_id', designerId)
      .select(
        'cases.*',
        'ht.name as house_type_name',
        'ac.name as area_category_name',
        'sc.name as style_category_name'
      )
      .first();

    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }

    const images = await db('case_images')
      .leftJoin('image_library', 'case_images.library_image_id', 'image_library.id')
      .where('case_images.case_id', workId)
      .orderBy('case_images.sort_order', 'asc')
      .select(
        'case_images.library_image_id as id',
        'case_images.sort_order',
        'image_library.image_url',
        'image_library.thumb_url as thumb_url'
      );

    return { ...work, images };
  },

  /** 创建新作品（默认草稿状态） */
  async create(designerId, data) {
    const { title, description, house_type_id, area_category_id, style_category_id,
            area_sqm, budget_min, budget_max, completion_date, cover_image, images, vr_url } = data;

    if (!title) {
      throw Object.assign(new Error('作品标题不能为空'), { status: 400 });
    }
    if (!house_type_id || !area_category_id || !style_category_id) {
      throw Object.assign(new Error('请选择户型、空间和风格'), { status: 400 });
    }

    // 校验分类存在性
    for (const catId of [house_type_id, area_category_id, style_category_id]) {
      const cat = await db('categories').where('id', catId).first();
      if (!cat) {
        throw Object.assign(new Error(`分类 ID ${catId} 不存在`), { status: 400 });
      }
    }

    // 归一化封面图：确保存储的是相对路径
    const normalizedCover = normalizeCoverImage(cover_image);

    const [id] = await db('cases').insert({
      title,
      description: description || null,
      house_type_id,
      area_category_id,
      style_category_id,
      area_sqm: area_sqm || null,
      budget_min: budget_min || null,
      budget_max: budget_max || null,
      completion_date: completion_date || null,
      cover_image: normalizedCover || null,
      designer_id: designerId,
      vr_url: normalizeVrUrl(vr_url) || null,
      review_status: 'draft',
    });

    // 关联图片（images 为 image_library 的 ID 数组）
    if (images && images.length > 0) {
      const imageIds = images.map(img => img.id);
      const libImages = await db('image_library').whereIn('id', imageIds).select('id', 'image_url', 'thumb_url');
      const urlMap = {};
      for (const li of libImages) {
        urlMap[li.id] = { image_url: li.image_url, thumb_url: li.thumb_url || null };
      }
      const caseImages = images.map((img, idx) => ({
        case_id: id,
        library_image_id: img.id,
        image_url: (urlMap[img.id] && urlMap[img.id].image_url) || '',
        thumb_url: (urlMap[img.id] && urlMap[img.id].thumb_url) || null,
        sort_order: idx,
      }));
      await db('case_images').insert(caseImages);
    }

    return db('cases').where('id', id).first();
  },

  /** 编辑作品（仅草稿/已驳回状态可编辑） */
  async update(designerId, workId, data) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (work.designer_id !== designerId) {
      throw Object.assign(new Error('无权编辑此作品'), { status: 403 });
    }
    if (!['draft', 'rejected'].includes(work.review_status)) {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可编辑`), { status: 409 });
    }

    const updates = buildCaseUpdates(data);
    // 编辑后回到草稿状态（驳回后重编）
    if (work.review_status === 'rejected') {
      updates.review_status = 'draft';
      updates.reject_reason = null;
    }

    await db('cases').where('id', workId).update(updates);

    // 更新图片关联（先删后插，保持 sort_order）
    if (data.images !== undefined) {
      await replaceCaseImages(workId, data.images);
    }

    return db('cases').where('id', workId).first();
  },

  /** 删除作品（仅草稿/已驳回状态可删除） */
  async remove(designerId, workId) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (work.designer_id !== designerId) {
      throw Object.assign(new Error('无权删除此作品'), { status: 403 });
    }
    if (!['draft', 'rejected'].includes(work.review_status)) {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可删除`), { status: 409 });
    }
    await db('cases').where('id', workId).del();
  },

  /** 提交审核（草稿/已驳回 → 待审核） */
  async submit(designerId, workId) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (work.designer_id !== designerId) {
      throw Object.assign(new Error('无权操作此作品'), { status: 403 });
    }
    if (!['draft', 'rejected'].includes(work.review_status)) {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可提交审核`), { status: 409 });
    }

    // 基础校验：必须有标题和封面
    if (!work.title) {
      throw Object.assign(new Error('请填写作品标题后再提交'), { status: 400 });
    }

    await db('cases').where('id', workId).update({
      review_status: 'pending',
      reject_reason: null,
      updated_at: db.fn.now(),
    });
    return db('cases').where('id', workId).first();
  },

  // ══════════════════════════════════════════
  // 设计师统计
  // ══════════════════════════════════════════

  async getDesignerStats(designerId) {
    const [statusCounts] = await db('cases')
      .where('designer_id', designerId)
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("SUM(CASE WHEN review_status = 'draft' THEN 1 ELSE 0 END) as draft"),
        db.raw("SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending"),
        db.raw("SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved"),
        db.raw("SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected"),
        db.raw('COALESCE(SUM(view_count), 0) as total_views')
      );

    const recentWorks = await db('cases')
      .where('designer_id', designerId)
      .select('id', 'title', 'cover_image', 'review_status', 'view_count', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(5);

    return { ...statusCounts, recent_works: recentWorks };
  },

  // ══════════════════════════════════════════
  // 管理端 — 作品审核
  // ══════════════════════════════════════════

  /** 管理端作品列表（全部状态 + 筛选） */
  async listAdmin(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 12));
    const offset = (page - 1) * pageSize;

    let query = db('cases')
      .join('categories as ht', 'cases.house_type_id', 'ht.id')
      .join('categories as sc', 'cases.style_category_id', 'sc.id')
      .join('designers', 'cases.designer_id', 'designers.id')
      .select(
        'cases.id', 'cases.title', 'cases.cover_image', 'cases.area_sqm',
        'cases.budget_min', 'cases.budget_max',
        'cases.review_status', 'cases.reject_reason',
        'cases.is_hot', 'cases.view_count', 'cases.created_at', 'cases.updated_at',
        'ht.name as house_type_name', 'sc.name as style_category_name',
        'designers.id as designer_id', 'designers.name as designer_name'
      );

    // 默认不显示草稿（草稿是设计师私有状态，不应在管理端可见）
    if (filters.review_status) {
      if (filters.review_status === 'draft') {
        return { list: [], pagination: { page: 1, page_size: pageSize, total: 0, total_pages: 0 } };
      }
      query = query.where('cases.review_status', filters.review_status);
    } else {
      query = query.whereNot('cases.review_status', 'draft');
    }
    if (filters.designer_id) {
      query = query.where('cases.designer_id', Number(filters.designer_id));
    }
    if (filters.keyword) {
      query = query.where('cases.title', 'like', `%${filters.keyword}%`);
    }

    const [{ count }] = await query.clone().count('* as count');
    const list = await query
      .orderBy('cases.updated_at', 'desc')
      .orderBy('cases.id', 'desc')
      .offset(offset)
      .limit(pageSize);

    // 补全封面信息（cover_image + cover_thumb）
    const enriched = await enrichCoverInfo(list);

    return {
      list: enriched,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  /** 管理端作品详情（所有状态可见） */
  async getByIdAdmin(workId) {
    const work = await db('cases')
      .join('categories as ht', 'cases.house_type_id', 'ht.id')
      .join('categories as ac', 'cases.area_category_id', 'ac.id')
      .join('categories as sc', 'cases.style_category_id', 'sc.id')
      .join('designers', 'cases.designer_id', 'designers.id')
      .where('cases.id', workId)
      .select(
        'cases.*',
        'ht.name as house_type_name',
        'ac.name as area_category_name',
        'sc.name as style_category_name',
        'designers.name as designer_name',
        'designers.avatar_url as designer_avatar',
        'designers.phone as designer_phone'
      )
      .first();

    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }

    const images = await db('case_images')
      .where('case_id', workId)
      .orderBy('sort_order', 'asc')
      .select('id', 'library_image_id', 'image_url', 'thumb_url', 'sort_order');

    return { ...work, images };
  },

  /** 管理员编辑作品（任意状态可编辑，不改审核状态，不可改归属） */
  async adminUpdate(workId, data) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (data.title !== undefined && !data.title) {
      throw Object.assign(new Error('作品标题不能为空'), { status: 400 });
    }

    const updates = buildCaseUpdates(data);
    if (Object.keys(updates).length > 0) {
      await db('cases').where('id', workId).update(updates);
    }
    if (data.images !== undefined) {
      await replaceCaseImages(workId, data.images);
    }
    return this.getByIdAdmin(workId);
  },

  /** 审核通过 */
  async approve(workId, adminId) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (work.review_status !== 'pending') {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可审核通过`), { status: 409 });
    }

    await db('cases').where('id', workId).update({
      review_status: 'approved',
      reviewed_by: adminId,
      reviewed_at: db.fn.now(),
      reject_reason: null,
      updated_at: db.fn.now(),
    });
    return db('cases').where('id', workId).first();
  },

  /** 审核驳回 */
  async reject(workId, adminId, reason) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (work.review_status !== 'pending') {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可驳回`), { status: 409 });
    }
    if (!reason) {
      throw Object.assign(new Error('请填写驳回原因'), { status: 400 });
    }

    await db('cases').where('id', workId).update({
      review_status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: db.fn.now(),
      reject_reason: reason,
      updated_at: db.fn.now(),
    });
    return db('cases').where('id', workId).first();
  },

  /** 批量操作（审核通过/驳回、下架/上架/删除） */
  async batchReview(workIds, action, adminId, reason) {
    if (!Array.isArray(workIds) || workIds.length === 0) {
      throw Object.assign(new Error('请选择至少一个作品'), { status: 400 });
    }
    if (!['approve', 'reject', 'offline', 'online', 'delete'].includes(action)) {
      throw Object.assign(new Error('操作类型无效'), { status: 400 });
    }
    if (action === 'reject' && !reason) {
      throw Object.assign(new Error('批量驳回请填写原因'), { status: 400 });
    }

    const results = { success: 0, skipped: 0 };
    for (const id of workIds) {
      const work = await db('cases').where('id', Number(id)).first();
      if (!work) {
        results.skipped++;
        continue;
      }

      let updates = null;
      switch (action) {
        case 'approve':
          if (work.review_status !== 'pending') { results.skipped++; continue; }
          updates = { review_status: 'approved', reviewed_by: adminId, reviewed_at: db.fn.now(), reject_reason: null, updated_at: db.fn.now() };
          break;
        case 'reject':
          if (work.review_status !== 'pending') { results.skipped++; continue; }
          updates = { review_status: 'rejected', reviewed_by: adminId, reviewed_at: db.fn.now(), reject_reason: reason, updated_at: db.fn.now() };
          break;
        case 'offline':
          if (work.review_status !== 'approved') { results.skipped++; continue; }
          updates = { review_status: 'offline', updated_at: db.fn.now() };
          break;
        case 'online':
          if (work.review_status !== 'offline') { results.skipped++; continue; }
          updates = { review_status: 'approved', updated_at: db.fn.now() };
          break;
        case 'delete':
          if (!['offline', 'rejected'].includes(work.review_status)) { results.skipped++; continue; }
          await db('cases').where('id', Number(id)).del();
          results.success++;
          continue;
      }

      await db('cases').where('id', Number(id)).update(updates);
      results.success++;
    }
    return results;
  },

  /** 切换热门标记 */
  async toggleHot(workId) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (work.review_status !== 'approved') {
      throw Object.assign(new Error('仅已审核通过的作品可设置热门'), { status: 409 });
    }

    const newHot = work.is_hot ? 0 : 1;
    await db('cases').where('id', workId).update({ is_hot: newHot });
    return db('cases').where('id', workId).select('id', 'title', 'is_hot').first();
  },

  /** 管理端设置/清空 VR 链接（任意状态可改，不影响审核状态） */
  async setVrUrl(workId, vrUrl) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    await db('cases').where('id', workId).update({
      vr_url: normalizeVrUrl(vrUrl) || null,
      updated_at: db.fn.now(),
    });
    return db('cases').where('id', workId).first();
  },

  /** 管理端 — 获取所有热门作品（is_hot = 1） */
  async listHot() {
    const list = await db('cases')
      .join('designers', 'cases.designer_id', 'designers.id')
      .where('cases.review_status', 'approved')
      .where('cases.is_hot', 1)
      .select(
        'cases.id', 'cases.title', 'cases.cover_image',
        'cases.view_count', 'cases.created_at',
        'designers.name as designer_name'
      )
      .orderBy('cases.updated_at', 'desc');

    return list;
  },

  /** 设置作品封面图（从已关联图片中选取） */
  async setCoverImage(workId, imageUrl) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }

    // 校验图片属于该作品
    const img = await db('case_images')
      .where('case_id', workId)
      .where('image_url', imageUrl)
      .first();
    if (!img) {
      throw Object.assign(new Error('图片不属于该作品'), { status: 400 });
    }

    await db('cases').where('id', workId).update({
      cover_image: imageUrl,
      updated_at: db.fn.now(),
    });

    return db('cases').where('id', workId).first();
  },

  /** 下架作品（approved → offline） */
  async offline(workId) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (work.review_status !== 'approved') {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可下架`), { status: 409 });
    }

    await db('cases').where('id', workId).update({
      review_status: 'offline',
      updated_at: db.fn.now(),
    });
    return db('cases').where('id', workId).first();
  },

  /** 上架作品（offline → approved） */
  async online(workId) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (work.review_status !== 'offline') {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可上架`), { status: 409 });
    }

    await db('cases').where('id', workId).update({
      review_status: 'approved',
      updated_at: db.fn.now(),
    });
    return db('cases').where('id', workId).first();
  },

  /** 管理员删除作品（已下架或已驳回状态可删） */
  async adminDelete(workId) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (!['offline', 'rejected'].includes(work.review_status)) {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可删除，仅已下架或已驳回的作品可删除`), { status: 409 });
    }
    await db('cases').where('id', workId).del();
  },

  /** 归档作品 */
  async archive(workId) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (!['approved', 'rejected'].includes(work.review_status)) {
      throw Object.assign(new Error(`当前状态（${work.review_status}）不可归档`), { status: 409 });
    }

    await db('cases').where('id', workId).update({
      review_status: 'archived',
      updated_at: db.fn.now(),
    });
    return db('cases').where('id', workId).first();
  },

  /** 管理员删除作品中的单张图片 */
  async adminDeleteImage(workId, imageId) {
    const ci = await db('case_images').where({ id: imageId, case_id: workId }).first();
    if (!ci) {
      throw Object.assign(new Error('图片不存在或不属于该作品'), { status: 404 });
    }

    // 检查是否至少保留一张图片
    const count = await db('case_images').where('case_id', workId).count('* as c').first();
    if (count.c === 1) {
      throw Object.assign(new Error('至少保留一张图片，请直接删除整个作品'), { status: 409 });
    }

    // 如果是封面图，顺延到下一张
    const work = await db('cases').where('id', workId).first();
    if (work.cover_image === ci.image_url) {
      const next = await db('case_images')
        .where('case_id', workId)
        .whereNot('id', imageId)
        .orderBy('sort_order', 'asc')
        .first();
      await db('cases').where('id', workId).update({
        cover_image: next ? next.image_url : null,
        updated_at: db.fn.now(),
      });
    }

    await db('case_images').where('id', imageId).del();
    return { deleted: true };
  },
};

module.exports = caseService;
