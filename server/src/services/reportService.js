const db = require('../db/connection');

// 允许的举报理由类型
const REASON_TYPES = ['fake', 'infringe', 'vulgar', 'other'];
// 允许的处理状态
const STATUS_TYPES = ['pending', 'resolved', 'rejected'];

/**
 * 作品举报业务逻辑
 *
 * 提交：小程序作品详情页（公开，游客可提交）
 * 处理：管理后台「运营工具-举报管理」
 */
const reportService = {
  // ==========================================
  // 提交举报（公开）
  // ==========================================
  async submit(caseId, { reason_type, reason_detail, contact }) {
    if (!caseId) {
      throw Object.assign(new Error('作品 ID 不能为空'), { status: 400 });
    }
    if (!reason_type || !REASON_TYPES.includes(reason_type)) {
      throw Object.assign(new Error('请选择有效的举报理由'), { status: 400 });
    }

    // 作品必须存在
    const work = await db('cases').where('id', caseId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }

    const [id] = await db('reports').insert({
      case_id: caseId,
      reason_type,
      reason_detail: (reason_detail || '').trim() || null,
      contact: (contact || '').trim() || null,
      status: 'pending',
    });

    return db('reports').where('id', id).first();
  },

  // ==========================================
  // 举报列表（管理端，分页 + 按状态筛选）
  // ==========================================
  async listForAdmin(pagination = {}, status) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;

    let countQuery = db('reports');
    let listQuery = db('reports')
      .leftJoin('cases', 'reports.case_id', 'cases.id')
      .select('reports.*')
      .select('cases.title as case_title', 'cases.cover_image as case_cover_image')
      .orderBy('reports.created_at', 'desc');

    if (status && STATUS_TYPES.includes(status)) {
      countQuery = countQuery.where('status', status);
      listQuery = listQuery.where('reports.status', status);
    }

    const [{ count }] = await countQuery.count('* as count');
    const list = await listQuery.offset(offset).limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 举报详情（管理端）
  // ==========================================
  async getById(id) {
    const report = await db('reports')
      .leftJoin('cases', 'reports.case_id', 'cases.id')
      .select('reports.*')
      .select('cases.title as case_title', 'cases.cover_image as case_cover_image')
      .where('reports.id', id)
      .first();

    if (!report) {
      throw Object.assign(new Error('举报记录不存在'), { status: 404 });
    }
    return report;
  },

  // ==========================================
  // 处理举报（管理端）
  // ==========================================
  async handle(id, { status, admin_remark }) {
    if (!status || !STATUS_TYPES.includes(status)) {
      throw Object.assign(new Error('请提供有效的处理状态'), { status: 400 });
    }

    const report = await db('reports').where('id', id).first();
    if (!report) {
      throw Object.assign(new Error('举报记录不存在'), { status: 404 });
    }

    await db('reports').where('id', id).update({
      status,
      admin_remark: (admin_remark || '').trim() || null,
      handled_at: db.fn.now(),
    });

    return db('reports').where('id', id).first();
  },
};

module.exports = reportService;
