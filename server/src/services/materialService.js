const db = require('../db/connection');

/**
 * 材料分类 · 材料管理业务逻辑（V1.1 新增）
 */
const materialService = {
  // ==========================================
  // 材料分类 — 列表（分页，含材料数量统计）
  // ==========================================
  async listCategories(pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;

    const [{ count }] = await db('material_categories').count('* as count');

    const list = await db('material_categories')
      .select('material_categories.*')
      .select(db.raw('(SELECT COUNT(*) FROM materials WHERE materials.category_id = material_categories.id) as material_count'))
      .orderBy('material_categories.sort_order', 'asc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 材料分类 — 新增
  // ==========================================
  async createCategory({ name, sort_order }) {
    if (!name) {
      throw Object.assign(new Error('分类名称不能为空'), { status: 400 });
    }
    if (name.length > 32) {
      throw Object.assign(new Error('分类名称不能超过32个字符'), { status: 400 });
    }

    const [id] = await db('material_categories').insert({
      name,
      sort_order: sort_order !== undefined ? sort_order : 0,
    });

    return db('material_categories').where('id', id).first();
  },

  // ==========================================
  // 材料分类 — 编辑
  // ==========================================
  async updateCategory(id, { name, sort_order }) {
    const existing = await db('material_categories').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('分类不存在'), { status: 404 });
    }

    const updates = {};
    if (name !== undefined) {
      if (name.length > 32) {
        throw Object.assign(new Error('分类名称不能超过32个字符'), { status: 400 });
      }
      updates.name = name;
    }
    if (sort_order !== undefined) updates.sort_order = sort_order;

    await db('material_categories').where('id', id).update(updates);
    return db('material_categories').where('id', id).first();
  },

  // ==========================================
  // 材料分类 — 删除（关联材料时返回 409）
  // ==========================================
  async deleteCategory(id) {
    const existing = await db('material_categories').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('分类不存在'), { status: 404 });
    }

    const [{ count }] = await db('materials')
      .where('category_id', id)
      .count('* as count');

    if (count > 0) {
      throw Object.assign(
        new Error(`该分类下存在 ${count} 条材料，无法删除`),
        { status: 409 }
      );
    }

    await db('material_categories').where('id', id).del();
  },

  // ==========================================
  // 材料 — 列表（Admin，分页 + 多条件筛选）
  // ==========================================
  async listMaterials(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;

    let query = db('materials')
      .select(
        'materials.*',
        'material_categories.name as category_name',
        'properties.name as property_name'
      )
      .leftJoin('material_categories', 'materials.category_id', 'material_categories.id')
      .leftJoin('properties', 'materials.property_id', 'properties.id');

    if (filters.property_id) {
      query = query.where('materials.property_id', parseInt(filters.property_id));
    }
    if (filters.category_id) {
      query = query.where('materials.category_id', parseInt(filters.category_id));
    }
    if (filters.keyword) {
      query = query.where(function () {
        this.where('materials.name', 'like', `%${filters.keyword}%`)
          .orWhere('materials.brand', 'like', `%${filters.keyword}%`);
      });
    }

    const [{ count }] = await query.clone().count('* as count');

    const list = await query
      .orderBy('materials.created_at', 'desc')
      .offset(offset)
      .limit(pageSize);

    return {
      list,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
  },

  // ==========================================
  // 材料 — 详情（Admin）
  // ==========================================
  async getMaterialById(id) {
    const material = await db('materials')
      .select(
        'materials.*',
        'material_categories.name as category_name',
        'properties.name as property_name'
      )
      .leftJoin('material_categories', 'materials.category_id', 'material_categories.id')
      .leftJoin('properties', 'materials.property_id', 'properties.id')
      .where('materials.id', id)
      .first();

    if (!material) {
      throw Object.assign(new Error('材料不存在'), { status: 404 });
    }

    return material;
  },

  // ==========================================
  // 材料 — 新增（Admin）
  // ==========================================
  async createMaterial({ category_id, property_id, name, brand, image_url, unit_price, price_unit, description, quantity }) {
    if (!category_id || !property_id || !name || !brand || unit_price === undefined) {
      throw Object.assign(new Error('分类、楼盘、名称、品牌和单价为必填字段'), { status: 400 });
    }
    if (name.length > 128) {
      throw Object.assign(new Error('材料名称不能超过128个字符'), { status: 400 });
    }
    if (brand.length > 64) {
      throw Object.assign(new Error('品牌名称不能超过64个字符'), { status: 400 });
    }
    if (unit_price <= 0) {
      throw Object.assign(new Error('单价必须大于0'), { status: 400 });
    }

    // 库存数量校验（0-999）
    const qty = quantity !== undefined ? parseInt(quantity) : 0;
    if (!Number.isInteger(qty) || qty < 0 || qty > 999) {
      throw Object.assign(new Error('库存数量必须为0-999的整数'), { status: 400 });
    }

    // 验证分类存在
    const category = await db('material_categories').where('id', category_id).first();
    if (!category) {
      throw Object.assign(new Error('材料分类不存在'), { status: 400 });
    }

    // 验证楼盘存在
    const property = await db('properties').where('id', property_id).first();
    if (!property) {
      throw Object.assign(new Error('楼盘不存在'), { status: 400 });
    }

    const [id] = await db('materials').insert({
      category_id,
      property_id,
      name,
      brand,
      image_url: image_url || null,
      unit_price,
      price_unit: price_unit || '/㎡',
      description: description || null,
      quantity: qty,
    });

    return db('materials').where('id', id).first();
  },

  // ==========================================
  // 材料 — 编辑（Admin）
  // ==========================================
  async updateMaterial(id, { category_id, property_id, name, brand, image_url, unit_price, price_unit, description, quantity }) {
    const existing = await db('materials').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('材料不存在'), { status: 404 });
    }

    const updates = {};

    if (category_id !== undefined) {
      const category = await db('material_categories').where('id', category_id).first();
      if (!category) throw Object.assign(new Error('材料分类不存在'), { status: 400 });
      updates.category_id = category_id;
    }
    if (property_id !== undefined) {
      const property = await db('properties').where('id', property_id).first();
      if (!property) throw Object.assign(new Error('楼盘不存在'), { status: 400 });
      updates.property_id = property_id;
    }
    if (name !== undefined) {
      if (name.length > 128) throw Object.assign(new Error('材料名称不能超过128个字符'), { status: 400 });
      updates.name = name;
    }
    if (brand !== undefined) {
      if (brand.length > 64) throw Object.assign(new Error('品牌名称不能超过64个字符'), { status: 400 });
      updates.brand = brand;
    }
    if (image_url !== undefined) updates.image_url = image_url;
    if (unit_price !== undefined) {
      if (unit_price <= 0) throw Object.assign(new Error('单价必须大于0'), { status: 400 });
      updates.unit_price = unit_price;
    }
    if (price_unit !== undefined) updates.price_unit = price_unit;
    if (description !== undefined) updates.description = description;
    if (quantity !== undefined) {
      const qty = parseInt(quantity);
      if (!Number.isInteger(qty) || qty < 0 || qty > 999) {
        throw Object.assign(new Error('库存数量必须为0-999的整数'), { status: 400 });
      }
      updates.quantity = qty;
    }

    await db('materials').where('id', id).update(updates);
    return db('materials').where('id', id).first();
  },

  // ==========================================
  // 材料 — 删除（被选材申请引用时返回 409）
  // ==========================================
  async deleteMaterial(id) {
    const existing = await db('materials').where('id', id).first();
    if (!existing) {
      throw Object.assign(new Error('材料不存在'), { status: 404 });
    }

    const [{ count }] = await db('material_order_items')
      .where('material_id', id)
      .count('* as count');

    if (count > 0) {
      throw Object.assign(
        new Error('该材料已被选材申请引用，无法删除'),
        { status: 409 }
      );
    }

    await db('materials').where('id', id).del();
  },

  // ==========================================
  // 公开接口 — 某楼盘的材料列表（按分类分组）
  // ==========================================
  async getMaterialsByProperty(propertyId, keyword) {
    // 验证楼盘存在且已开通选材
    const property = await db('properties').where('id', propertyId).first();
    if (!property) {
      throw Object.assign(new Error('楼盘不存在'), { status: 404 });
    }
    if (!property.material_enabled) {
      throw Object.assign(new Error('该楼盘未开通选材功能'), { status: 400 });
    }

    // 获取所有分类（按 sort_order 排序）
    const categories = await db('material_categories').orderBy('sort_order', 'asc');

    // 获取该楼盘下所有材料
    let materialQuery = db('materials').where('property_id', propertyId);
    if (keyword) {
      materialQuery = materialQuery.where('name', 'like', `%${keyword}%`);
    }
    const materials = await materialQuery;

    // 将材料按分类分组
    const groupedCategories = categories.map((cat) => ({
      category_id: cat.id,
      category_name: cat.name,
      materials: materials
        .filter((m) => m.category_id === cat.id)
        .map((m) => ({
          id: m.id,
          name: m.name,
          brand: m.brand,
          image_url: m.image_url,
          unit_price: m.unit_price,
          price_unit: m.price_unit,
          description: m.description,
          quantity: m.quantity,
          in_stock: m.quantity > 0,
        })),
    }));

    return {
      property_id: property.id,
      property_name: property.name,
      property_cover: property.cover_image || null,
      categories: groupedCategories,
    };
  },
};

module.exports = materialService;
