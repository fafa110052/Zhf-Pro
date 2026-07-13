const db = require('../db/connection');

/**
 * 设计师管理业务逻辑（B端管理后台）
 */
const designerService = {
  // ==========================================
  // 人员管理列表（含设计师/监理/业主，按角色筛选 + 分页）
  // ==========================================
  async listUsers(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 12));
    const offset = (page - 1) * pageSize;

    let query = db('designers')
      .select(
        'designers.id', 'designers.openid', 'designers.name', 'designers.avatar_url',
        'designers.phone', 'designers.years_of_exp', 'designers.status', 'designers.is_bound',
        'designers.personnel_type', 'designers.employee_id', 'designers.role',
        'designers.owner_property_id', 'designers.building', 'designers.room',
        'designers.created_at', 'designers.updated_at',
        'properties.name as property_name'
      )
      .leftJoin('properties', 'designers.owner_property_id', 'properties.id')
      .whereNot('designers.role', 'admin');

    if (filters.role) {
      query = query.where('designers.role', filters.role);
    }
    if (filters.status) {
      query = query.where('designers.status', filters.status);
    }
    if (filters.personnel_type) {
      query = query.where('designers.personnel_type', filters.personnel_type);
    }
    if (filters.keyword) {
      const kw = '%' + filters.keyword + '%';
      query = query.where(function () {
        this.where('designers.name', 'like', kw).orWhere('designers.phone', 'like', kw);
      });
    }

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('designers.created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 列表（搜索 + 状态筛选 + 分页）
  // ==========================================
  async list(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 12));
    const offset = (page - 1) * pageSize;

    let query = db('designers')
      .where('role', 'designer')
      .select(
        'id', 'openid', 'name', 'avatar_url', 'phone',
        'years_of_exp', 'status', 'is_bound',
        'personnel_type', 'employee_id',
        'created_at', 'updated_at'
      );

    if (filters.status) {
      query = query.where('status', filters.status);
    }
    if (filters.personnel_type) {
      // 支持逗号分隔多值（如 designer,design_director）
      const types = String(filters.personnel_type).split(',').map((s) => s.trim()).filter(Boolean);
      query = types.length > 1
        ? query.whereIn('personnel_type', types)
        : query.where('personnel_type', types[0]);
    }
    if (filters.keyword) {
      const kw = `%${filters.keyword}%`;
      query = query.where(function () {
        this.where('name', 'like', kw).orWhere('phone', 'like', kw);
      });
    }

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 详情
  // ==========================================
  async getById(id) {
    const person = await db('designers')
      .where('id', id)
      .whereNot('role', 'admin')
      .select(
        'id', 'openid', 'name', 'avatar_url', 'phone',
        'years_of_exp', 'bio', 'status', 'is_bound',
        'personnel_type', 'employee_id', 'role',
        'owner_property_id', 'building', 'room',
        'created_at', 'updated_at'
      )
      .first();

    if (!person) {
      throw Object.assign(new Error('人员不存在'), { status: 404 });
    }

    // 附带作品数量统计
    const [caseStats] = await db('cases')
      .where('designer_id', id)
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("COALESCE(SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END), 0) as approved"),
        db.raw("COALESCE(SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END), 0) as pending"),
        db.raw('COALESCE(SUM(view_count), 0) as total_views')
      );

    return { ...person, case_stats: caseStats };
  },

  // ==========================================
  // 新增设计师
  // ==========================================
  async create(data) {
    const { name, phone, avatar_url, years_of_exp, bio, personnel_type, employee_id, role, owner_property_id, building, room } = data;

    if (!name) {
      throw Object.assign(new Error('姓名不能为空'), { status: 400 });
    }
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      throw Object.assign(new Error('手机号格式不正确'), { status: 400 });
    }

    const targetRole = role || 'designer';

    // 业主角色：校验楼盘归属
    if (targetRole === 'owner') {
      if (!owner_property_id) {
        throw Object.assign(new Error('请选择业主所属楼盘'), { status: 400 });
      }
      const prop = await db('properties').where('id', owner_property_id).first();
      if (!prop) {
        throw Object.assign(new Error('所选楼盘不存在'), { status: 400 });
      }
    }

    // 设计师角色：personnel_type 校验
    if (targetRole === 'designer') {
      const pt = personnel_type || 'designer';
      if (!['designer', 'supervisor', 'engineer', 'design_director', 'engineering_director'].includes(pt)) {
        throw Object.assign(new Error('人员类型无效'), { status: 400 });
      }
    }

    // employee_id 唯一性校验
    if (employee_id) {
      const dup = await db('designers').where('employee_id', employee_id).first();
      if (dup) {
        throw Object.assign(new Error('该工号已存在'), { status: 409 });
      }
    }

    // 手机号检查：如已存在，根据当前目标角色处理
    const exists = await db('designers').where('phone', phone).first();
    if (exists) {
      if (exists.role !== 'guest') {
        throw Object.assign(new Error(`该手机号已是${exists.role === 'admin' ? '管理员' : exists.role === 'guest' ? '游客' : exists.role === 'designer' ? '设计师' : '业主'}`), { status: 409 });
      }
      // 游客升级
      const updates = {
        role: targetRole,
        name: name || exists.name,
        avatar_url: avatar_url || exists.avatar_url,
      };
      if (targetRole === 'owner') {
        updates.owner_property_id = owner_property_id;
        updates.building = building || null;
        updates.room = room || null;
        updates.personnel_type = null;
      } else if (targetRole === 'designer') {
        updates.years_of_exp = years_of_exp || 0;
        updates.bio = bio || null;
        updates.personnel_type = personnel_type || 'designer';
        updates.employee_id = employee_id || null;
      }
      await db('designers').where('id', exists.id).update(updates);
      return db('designers').where('id', exists.id).select(
        'id', 'name', 'avatar_url', 'phone', 'years_of_exp', 'bio',
        'status', 'is_bound', 'personnel_type', 'employee_id', 'role',
        'owner_property_id', 'building', 'room', 'created_at'
      ).first();
    }

    const insertData = {
      name,
      phone,
      avatar_url: avatar_url || null,
      role: targetRole,
      status: 'active',
    };
    if (targetRole === 'owner') {
      insertData.owner_property_id = owner_property_id;
      insertData.building = building || null;
      insertData.room = room || null;
      insertData.personnel_type = null;
      insertData.employee_id = null;
    } else if (targetRole === 'designer') {
      insertData.years_of_exp = years_of_exp || 0;
      insertData.bio = bio || null;
      insertData.personnel_type = personnel_type || 'designer';
      insertData.employee_id = employee_id || null;
    }

    const [id] = await db('designers').insert(insertData);

    return db('designers').where('id', id).select(
      'id', 'name', 'avatar_url', 'phone', 'years_of_exp', 'bio',
      'status', 'is_bound', 'personnel_type', 'employee_id', 'role',
      'owner_property_id', 'building', 'room', 'created_at'
    ).first();
  },

  // ==========================================
  // 编辑设计师信息
  // ==========================================
  async update(id, data) {
    const designer = await db('designers').where('id', id).whereNot('role', 'admin').first();
    if (!designer) {
      throw Object.assign(new Error('人员不存在'), { status: 404 });
    }

    const allowed = ['name', 'phone', 'years_of_exp', 'bio', 'personnel_type', 'employee_id', 'role', 'owner_property_id', 'building', 'room'];
    const updates = {};

    // 头像变更 → 进入审核通道，不直接更新 avatar_url
    if (data.avatar_url !== undefined) {
      updates.pending_avatar_url = data.avatar_url;
      updates.avatar_review_status = 'pending';
    }

    for (const key of allowed) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    // role 变更处理
    if (updates.role) {
      if (!['designer', 'owner', 'guest'].includes(updates.role)) {
        throw Object.assign(new Error('角色只能设为 游客、员工 或 业主'), { status: 400 });
      }
      // 降级为 designer 时，清除 owner 专属字段
      if (updates.role === 'designer') {
        updates.owner_property_id = null;
        updates.building = null;
        updates.room = null;
      }
      // 降级为 guest 时，清除所有角色专属字段
      if (updates.role === 'guest') {
        updates.owner_property_id = null;
        updates.building = null;
        updates.room = null;
        updates.personnel_type = null;
        updates.employee_id = null;
        updates.years_of_exp = null;
        updates.bio = null;
      }
      // 升级为 owner 时，清除 designer 专属字段
      if (updates.role === 'owner') {
        updates.personnel_type = null;
        updates.employee_id = null;
        updates.years_of_exp = null;
        updates.bio = null;
      }
    }

    // 新角色 = owner（或已经是 owner）时，校验 owner_property_id
    const effectiveRole = updates.role || designer.role;
    if (updates.owner_property_id !== undefined) {
      if (updates.owner_property_id) {
        const prop = await db('properties').where('id', updates.owner_property_id).first();
        if (!prop) throw Object.assign(new Error('所选楼盘不存在'), { status: 400 });
      }
    }

    // personnel_type 校验（仅非 owner 角色）
    if (updates.personnel_type && effectiveRole === 'designer') {
      if (!['designer', 'supervisor', 'engineer', 'design_director', 'engineering_director'].includes(updates.personnel_type)) {
        throw Object.assign(new Error('人员类型无效'), { status: 400 });
      }
    }

    // employee_id 唯一性校验
    if (updates.employee_id) {
      const dup = await db('designers')
        .where('employee_id', updates.employee_id)
        .whereNot('id', id)
        .first();
      if (dup) {
        throw Object.assign(new Error('该工号已被使用'), { status: 409 });
      }
    }

    // 手机号变更时检查唯一性
    if (updates.phone && updates.phone !== designer.phone) {
      if (!/^1[3-9]\d{9}$/.test(updates.phone)) {
        throw Object.assign(new Error('手机号格式不正确'), { status: 400 });
      }
      const exists = await db('designers').where('phone', updates.phone).whereNot('id', id).first();
      if (exists) {
        throw Object.assign(new Error('该手机号已被其他设计师使用'), { status: 409 });
      }
    }

    await db('designers').where('id', id).update(updates);
    return db('designers').where('id', id).select(
      'id', 'name', 'avatar_url', 'pending_avatar_url', 'avatar_review_status',
      'phone', 'years_of_exp', 'bio', 'status', 'is_bound',
      'personnel_type', 'employee_id', 'role',
      'owner_property_id', 'building', 'room',
      'created_at', 'updated_at'
    ).first();
  },

  // ==========================================
  // 状态切换（active ↔ inactive）
  // ==========================================
  async toggleStatus(id) {
    const person = await db('designers').where('id', id).whereNot('role', 'admin').first();
    if (!person) {
      throw Object.assign(new Error('人员不存在'), { status: 404 });
    }

    const newStatus = person.status === 'active' ? 'inactive' : 'active';
    await db('designers').where('id', id).update({ status: newStatus });

    return db('designers').where('id', id).select('id', 'name', 'status').first();
  },

  // ==========================================
  // 删除设计师
  //
  // keepWorks:
  //   undefined → 有作品时拒绝（409）
  //   true      → 保留作品，归属转移至管理员
  //   false     → 一并删除该设计师的所有作品
  // ==========================================
  async remove(id, keepWorks) {
    const person = await db('designers').where('id', id).whereNot('role', 'admin').first();
    if (!person) {
      throw Object.assign(new Error('人员不存在'), { status: 404 });
    }

    // 统计作品数量
    const [{ count }] = await db('cases').where('designer_id', id).count('* as count');

    if (count > 0 && keepWorks === undefined) {
      // 未指定处理方式 → 拒绝删除
      throw Object.assign(
        new Error(`该设计师有 ${count} 个作品，请选择保留作品或一并删除`),
        { status: 409, code: 'HAS_WORKS', count }
      );
    }

    // 使用事务确保数据一致性
    await db.transaction(async (trx) => {
      // 获取管理员账号（NOT NULL FK 列需要转移给 admin）
      const admin = await trx('designers').where('role', 'admin').first();

      if (count > 0) {
        if (keepWorks === true) {
          // 保留作品：转移归属至管理员
          if (!admin) {
            throw Object.assign(new Error('系统错误：未找到管理员账号'), { status: 500 });
          }
          await trx('cases').where('designer_id', id).update({ designer_id: admin.id });
        } else if (keepWorks === false) {
          // 删除作品：先清理 image_library 引用计数，再删 works
          const images = await trx('case_images')
            .whereIn('case_id', trx('cases').where('designer_id', id).select('id'));
          for (const img of images) {
            await trx('image_library').where('id', img.library_image_id).decrement('reference_count', 1);
          }
          await trx('cases').where('designer_id', id).del();
        }
      }

      // 清理所有 FK 引用（nullable → SET NULL，NOT NULL → 转移给 admin）
      await trx('cases').where('reviewed_by', id).update({ reviewed_by: null });
      await trx('image_library').where('uploaded_by', id).update({ uploaded_by: null });

      // material_orders — user_id 是 NOT NULL，其余 nullable
      await trx('material_orders').where('designer_id', id).update({ designer_id: null });
      await trx('material_orders').where('supervisor_id', id).update({ supervisor_id: null });
      await trx('material_orders').where('reviewed_by', id).update({ reviewed_by: null });
      if (admin) {
        await trx('material_orders').where('user_id', id).update({ user_id: admin.id });
      }

      await trx('material_order_logs').where('operator_id', id).update({ operator_id: null });

      // construction_phases — 6 个 FK 列，全部 nullable
      await trx('construction_phases').where('designer_id', id).update({ designer_id: null });
      await trx('construction_phases').where('design_director_id', id).update({ design_director_id: null });
      await trx('construction_phases').where('engineer_id', id).update({ engineer_id: null });
      await trx('construction_phases').where('engineering_director_id', id).update({ engineering_director_id: null });
      await trx('construction_phases').where('design_reviewed_by', id).update({ design_reviewed_by: null });
      await trx('construction_phases').where('construction_reviewed_by', id).update({ construction_reviewed_by: null });

      // construction_phase_logs.operator_id — NOT NULL，转移给 admin
      if (admin) {
        await trx('construction_phase_logs').where('operator_id', id).update({ operator_id: admin.id });
      }

      // 删除设计师
      await trx('designers').where('id', id).del();
    });

    return { deleted_works: keepWorks === false ? count : 0, kept_works: keepWorks === true ? count : 0 };
  },

  // ==========================================
  // 头像审核
  // ==========================================

  /** 待审核头像列表 */
  async listAvatarReviews(pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 12));
    const offset = (page - 1) * pageSize;

    let query = db('designers')
      .where('avatar_review_status', 'pending')
      .select(
        'id', 'name', 'avatar_url', 'pending_avatar_url',
        'avatar_review_status', 'updated_at'
      );

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('updated_at', 'asc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  /** 审核通过 */
  async approveAvatar(id) {
    const designer = await db('designers').where('id', id).first();
    if (!designer) {
      throw Object.assign(new Error('设计师不存在'), { status: 404 });
    }
    if (designer.avatar_review_status !== 'pending') {
      throw Object.assign(new Error('该设计师没有待审核的头像'), { status: 400 });
    }

    await db('designers').where('id', id).update({
      avatar_url: designer.pending_avatar_url,
      pending_avatar_url: null,
      avatar_review_status: 'approved',
    });

    return db('designers').where('id', id).select(
      'id', 'name', 'avatar_url', 'avatar_review_status'
    ).first();
  },

  /** 审核驳回 */
  async rejectAvatar(id) {
    const designer = await db('designers').where('id', id).first();
    if (!designer) {
      throw Object.assign(new Error('设计师不存在'), { status: 404 });
    }
    if (designer.avatar_review_status !== 'pending') {
      throw Object.assign(new Error('该设计师没有待审核的头像'), { status: 400 });
    }

    await db('designers').where('id', id).update({
      pending_avatar_url: null,
      avatar_review_status: 'rejected',
    });

    return db('designers').where('id', id).select(
      'id', 'name', 'avatar_url', 'avatar_review_status'
    ).first();
  },
  // ═══════════════════════════════════════════
  // V1.3 施工阶段 — 待办数统计
  // ═══════════════════════════════════════════

  /** 设计师待上传设计图 */
  async getDesignerTaskCount(userId) {
    const [{ count }] = await db('construction_phases')
      .where('designer_id', userId)
      .whereIn('status', ['assigned', 'design_director_rejected'])
      .count('* as count');
    return count;
  },

  /** 设计总监待审核设计 */
  async getDesignDirectorTaskCount(userId) {
    const [{ count }] = await db('construction_phases')
      .where('design_director_id', userId)
      .where('status', 'design_uploaded')
      .count('* as count');
    return count;
  },

  /** 工程师待确认+待完工 */
  async getEngineerTaskCount(userId) {
    const [row] = await db('construction_phases')
      .where('engineer_id', userId)
      .whereIn('status', ['design_admin_approved', 'construction_confirmed',
        'engineering_director_rejected', 'construction_admin_rejected'])
      .count('* as count');
    return row.count;
  },

  /** 工程总监待审核完工 */
  async getEngineeringDirectorTaskCount(userId) {
    const [{ count }] = await db('construction_phases')
      .where('engineering_director_id', userId)
      .where('status', 'construction_uploaded')
      .count('* as count');
    return count;
  },
};

module.exports = designerService;
