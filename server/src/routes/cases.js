const express = require('express');
const router = express.Router();
const caseService = require('../services/caseService');
const { authenticate, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════
// 公开接口（小程序访客端）
// ═══════════════════════════════════════════

/**
 * GET /api/v1/works
 * 作品公开列表 — 多维筛选 + 分页
 *
 * Query 参数（全部可选）：
 *   house_type_id   — 户型筛选
 *   area_category_id — 部位筛选
 *   style_category_id — 风格筛选
 *   keyword         — 标题/描述搜索
 *   budget_min      — 预算下限（万元）
 *   budget_max      — 预算上限（万元）
 *   area_min        — 面积下限
 *   area_max        — 面积上限
 *   sort_by         — newest | popular | budget_asc | budget_desc
 *   page            — 页码，默认 1
 *   page_size       — 每页条数，默认 12，上限 50
 */
router.get('/works', async (req, res, next) => {
  try {
    const {
      house_type_id, area_category_id, style_category_id,
      keyword, budget_min, budget_max, area_min, area_max,
      sort_by, page, page_size,
    } = req.query;

    const result = await caseService.list(
      { house_type_id, area_category_id, style_category_id,
        keyword, budget_min, budget_max, area_min, area_max },
      { page, page_size },
      sort_by
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/works/hot
 * 首页热门推荐
 *
 * Query: limit — 数量，默认 6，上限 20
 * 注意：此路由必须声明在 /works/:id 之前
 */
router.get('/works/hot', async (req, res, next) => {
  try {
    const limit = req.query.limit || 6;
    const works = await caseService.getHot(limit);
    res.json({ success: true, data: works });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/works/:id
 * 作品详情 — 含图片列表 + 设计师名片
 * 每次请求自动浏览量 +1
 */
router.get('/works/:id', async (req, res, next) => {
  try {
    const work = await caseService.getById(Number(req.params.id));
    res.json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 设计师端接口（需设计师身份）
// 状态流转：draft → pending → approved/rejected
// ═══════════════════════════════════════════

/**
 * GET /api/v1/designer/works
 * 我的作品列表（含各状态筛选）
 *
 * Query: status(draft|pending|approved|rejected) keyword page page_size
 */
router.get('/designer/works', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    const { status, keyword, page, page_size } = req.query;
    const result = await caseService.listByDesigner(req.user.id, { status, keyword, page, page_size });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/designer/works/:id
 * 查看自己某个作品的详情（含图片）
 */
router.get('/designer/works/:id', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    const work = await caseService.getByDesigner(req.user.id, Number(req.params.id));
    res.json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/designer/works
 * 创建新作品（初始状态为 draft）
 */
router.post('/designer/works', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    const work = await caseService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/designer/works/:id
 * 编辑作品（仅 draft/rejected 状态可编辑）
 */
router.put('/designer/works/:id', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    const work = await caseService.update(req.user.id, Number(req.params.id), req.body);
    res.json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/designer/works/:id
 * 删除作品（仅 draft/rejected 状态可删除）
 */
router.delete('/designer/works/:id', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    await caseService.remove(req.user.id, Number(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/designer/works/:id/cover
 * 设置作品封面图（从已关联图片中选取一张作为封面）
 * Body: { image_url: "..." }
 */
router.patch('/designer/works/:id/cover', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    const { image_url } = req.body;
    if (!image_url) {
      return res.status(400).json({ success: false, error: { message: '请指定封面图片' } });
    }
    const work = await caseService.getByDesigner(req.user.id, Number(req.params.id));
    if (!work) {
      return res.status(404).json({ success: false, error: { message: '作品不存在' } });
    }
    const updated = await caseService.setCoverImage(Number(req.params.id), image_url);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/designer/works/:id/submit', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    const work = await caseService.submit(req.user.id, Number(req.params.id));
    res.json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/designer/stats
 * 个人数据统计（各状态数量 + 总浏览量 + 最近作品）
 */
router.get('/designer/stats', authenticate, requireRole('designer'), async (req, res, next) => {
  try {
    const stats = await caseService.getDesignerStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// 管理端 — 作品审核（全部需要 admin 权限）
// 状态流：pending → approved / rejected → archived
// ═══════════════════════════════════════════

/**
 * GET /api/v1/admin/works
 * 管理端作品列表 — 全部状态 + 按状态/设计师筛选
 *
 * Query: review_status(draft|pending|approved|rejected|archived) designer_id keyword page page_size
 */
router.get('/admin/works', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { review_status, designer_id, keyword, page, page_size } = req.query;
    const result = await caseService.listAdmin(
      { review_status, designer_id, keyword },
      { page, page_size }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/works/:id
 * 管理端作品详情（所有状态可见）
 */
router.get('/admin/works/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const work = await caseService.getByIdAdmin(Number(req.params.id));
    res.json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/works/:id/approve
 * 审核通过（pending → approved）
 */
router.post('/admin/works/:id/approve', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const work = await caseService.approve(Number(req.params.id), req.user.id);
    res.json({ success: true, data: work, message: '审核已通过' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/works/:id/reject
 * 审核驳回（pending → rejected）
 * Body: { reason: "驳回原因" }
 */
router.post('/admin/works/:id/reject', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const work = await caseService.reject(Number(req.params.id), req.user.id, reason);
    res.json({ success: true, data: work, message: '已驳回' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/works/batch
 * 批量审核
 * Body: { ids: [1,2,3], action: "approve"|"reject", reason?: "驳回原因" }
 */
router.post('/admin/works/batch', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { ids, action, reason } = req.body;
    const result = await caseService.batchReview(ids, action, req.user.id, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/works/:id/cover
 * 管理端设置作品封面图
 * Body: { image_url: "..." }
 */
router.patch('/admin/works/:id/cover', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { image_url } = req.body;
    if (!image_url) {
      return res.status(400).json({ success: false, error: { message: '请指定封面图片' } });
    }
    const updated = await caseService.setCoverImage(Number(req.params.id), image_url);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/works/:id/hot
 * 切换热门标记（仅 approved 作品）
 */
router.patch('/admin/works/:id/hot', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const work = await caseService.toggleHot(Number(req.params.id));
    res.json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/works/:id/offline
 * 下架作品（approved → offline）
 */
router.post('/admin/works/:id/offline', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const work = await caseService.offline(Number(req.params.id));
    res.json({ success: true, data: work, message: '已下架' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/works/:id/online
 * 上架作品（offline → approved）
 */
router.post('/admin/works/:id/online', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const work = await caseService.online(Number(req.params.id));
    res.json({ success: true, data: work, message: '已上架' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/works/:id
 * 管理员删除作品（仅 offline 状态可删除）
 */
router.delete('/admin/works/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await caseService.adminDelete(Number(req.params.id));
    res.json({ success: true, message: '已删除' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/works/:id/archive
 * 归档作品（approved/rejected → archived）
 */
router.post('/admin/works/:id/archive', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const work = await caseService.archive(Number(req.params.id));
    res.json({ success: true, data: work, message: '已归档' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/works
 * 管理端直接创建作品（跳过草稿状态，直接审核通过）
 * Body: { title, description, house_type_id, area_category_id, style_category_id,
 *         area_sqm, budget_min, budget_max, designer_id, cover_image, images }
 */
router.post('/admin/works', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { designer_id, ...data } = req.body;
    const actualDesignerId = designer_id || req.user.id;
    // 创建（draft）→ 提交（pending）→ 审核通过（approved）
    const work = await caseService.create(actualDesignerId, data);
    await caseService.submit(actualDesignerId, work.id);
    const approved = await caseService.approve(work.id, req.user.id);
    res.status(201).json({ success: true, data: approved });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
