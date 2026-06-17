/**
 * 账号管理业务逻辑（管理端 — 游客/设计师/管理员）
 *
 * 角色控制：
 *   - guest    游客（默认注册角色，仅浏览）
 *   - designer 设计师（管理员预设，可管理作品）
 *   - admin    管理员（后台管理，不能在前端登录）
 */
const db = require('../db/connection');

const accountService = {
  // ==========================================
  // 账号列表（含角色筛选、搜索、分页）
  // ==========================================
  async list(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 12));
    const offset = (page - 1) * pageSize;

    let query = db('designers')
      .whereNot('role', 'admin')  // 不列出管理员
      .select(
        'id', 'openid', 'name', 'phone', 'avatar_url',
        'years_of_exp', 'bio', 'role', 'status', 'is_bound',
        'created_at', 'updated_at'
      );

    if (filters.role) {
      query = query.where('role', filters.role);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    if (filters.keyword) {
      const kw = '%' + filters.keyword + '%';
      query = query.where(function () {
        this.where('name', 'like', kw).orWhere('phone', 'like', kw);
      });
    }

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    // 统计每个用户的作品数
    const enriched = [];
    for (const user of list) {
      const [{ caseCount }] = await db('cases')
        .where('designer_id', user.id)
        .count('* as caseCount');
      enriched.push({ ...user, case_count: caseCount });
    }

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
  // 角色汇总统计
  // ==========================================
  async roleSummary() {
    const rows = await db('designers')
      .whereNot('role', 'admin')
      .select('role')
      .count('* as count')
      .groupBy('role');

    const summary = { guest: 0, designer: 0, owner: 0, total: 0 };
    for (const r of rows) {
      summary[r.role] = r.count;
      summary.total += r.count;
    }
    return summary;
  },

  // ==========================================
  // 变更角色（游客 ↔ 设计师）
  // ==========================================
  async changeRole(id, newRole, designerData = {}) {
    if (!['guest', 'designer', 'owner'].includes(newRole)) {
      throw Object.assign(new Error('角色只能设为 guest、designer 或 owner'), { status: 400 });
    }

    const user = await db('designers').where('id', id).first();
    if (!user) {
      throw Object.assign(new Error('账号不存在'), { status: 404 });
    }
    if (user.role === 'admin') {
      throw Object.assign(new Error('不能变更管理员角色'), { status: 403 });
    }
    if (user.role === newRole) {
      throw Object.assign(new Error('角色未变化'), { status: 400 });
    }

    const updates = { role: newRole };

    // 升级为设计师时，可同时填写设计师专属信息
    if (newRole === 'designer') {
      if (designerData.name) updates.name = designerData.name;
      if (designerData.years_of_exp !== undefined) updates.years_of_exp = designerData.years_of_exp;
      if (designerData.bio !== undefined) updates.bio = designerData.bio;
      if (designerData.avatar_url !== undefined) updates.avatar_url = designerData.avatar_url;
      // 清除 owner 专属字段
      updates.owner_property_id = null;
      updates.building = null;
      updates.room = null;
    }

    // 升级为业主时，可同时填写业主专属信息
    if (newRole === 'owner') {
      if (designerData.owner_property_id) updates.owner_property_id = designerData.owner_property_id;
      if (designerData.building !== undefined) updates.building = designerData.building;
      if (designerData.room !== undefined) updates.room = designerData.room;
      // 清除 designer 专属字段
      updates.personnel_type = null;
      updates.employee_id = null;
    }

    // 降级为游客时，清除所有角色专属字段
    if (newRole === 'guest') {
      updates.personnel_type = null;
      updates.employee_id = null;
      updates.owner_property_id = null;
      updates.building = null;
      updates.room = null;
    }

    await db('designers').where('id', id).update(updates);

    return db('designers').where('id', id)
      .select('id', 'name', 'phone', 'role', 'years_of_exp', 'bio', 'status')
      .first();
  },
};

module.exports = accountService;
