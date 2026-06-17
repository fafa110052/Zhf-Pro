const db = require('../db/connection');

const categoryService = {
  // ========== 公开接口 ==========

  /**
   * 获取所有启用的分类，按 type 分组返回
   * → 小程序筛选页每次都从此接口动态拉取分类选项
   */
  async getAll() {
    const categories = await db('categories')
      .where('is_active', 1)
      .orderBy('sort_order', 'asc');

    // 按 type 分组：{ house_type: [...], area: [...], style: [...] }
    const grouped = {};
    for (const cat of categories) {
      if (!grouped[cat.type]) grouped[cat.type] = [];
      grouped[cat.type].push(cat);
    }
    return grouped;
  },

  // ========== 管理端接口 ==========

  /** 获取全部分类（含已禁用），管理后台用 */
  async getAllAdmin() {
    return db('categories')
      .orderBy('type', 'asc')
      .orderBy('sort_order', 'asc');
  },

  /** 新增分类 */
  async create({ type, name, sort_order }) {
    if (!type || !name) {
      throw Object.assign(new Error('分类维度和名称不能为空'), { status: 400 });
    }
    const [id] = await db('categories').insert({ type, name, sort_order: sort_order || 0 });
    return db('categories').where('id', id).first();
  },

  /** 更新分类（名称、排序、启用状态）*/
  async update(id, { name, sort_order, is_active }) {
    const existing = await db('categories').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('分类不存在'), { status: 404 });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;

    await db('categories').where('id', id).update(updates);
    return db('categories').where('id', id).first();
  },

  /** 删除分类（被作品引用时禁止删除）*/
  async remove(id) {
    const existing = await db('categories').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('分类不存在'), { status: 404 });
    }

    // 检查引用：作品表通过三个 FK 引用了 categories
    const [refCount] = await db('cases')
      .where('house_type_id', id)
      .orWhere('area_category_id', id)
      .orWhere('style_category_id', id)
      .count('* as count');

    if (refCount.count > 0) {
      throw Object.assign(
        new Error(`该分类被 ${refCount.count} 个作品引用，无法删除。请先禁用此分类或移除引用`),
        { status: 409 }
      );
    }

    await db('categories').where('id', id).del();
  },
};

module.exports = categoryService;
