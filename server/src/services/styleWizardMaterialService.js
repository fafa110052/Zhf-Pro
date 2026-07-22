const db = require('../db/connection');

const styleWizardMaterialService = {
  async listMaterials(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;
    let q = db('style_materials')
      .select('style_materials.*', 'style_subcategories.name as subcategory_name', 'style_categories.name as category_name')
      .leftJoin('style_subcategories', 'style_materials.subcategory_id', 'style_subcategories.id')
      .leftJoin('style_categories', 'style_subcategories.category_id', 'style_categories.id');
    if (filters.subcategory_id) q = q.where('style_materials.subcategory_id', parseInt(filters.subcategory_id));
    if (filters.category_id) q = q.where('style_subcategories.category_id', parseInt(filters.category_id));
    if (filters.keyword) {
      q = q.where(function () {
        this.where('style_materials.name', 'like', `%${filters.keyword}%`)
          .orWhere('style_materials.brand', 'like', `%${filters.keyword}%`);
      });
    }
    const [{ count }] = await q.clone().count('* as count');
    const list = await q.orderBy('style_materials.sort_order', 'asc').offset(offset).limit(pageSize);
    return { list, pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) } };
  },

  async getMaterial(id) {
    const m = await db('style_materials')
      .select('style_materials.*', 'style_subcategories.name as subcategory_name')
      .leftJoin('style_subcategories', 'style_materials.subcategory_id', 'style_subcategories.id')
      .where('style_materials.id', id).first();
    if (!m) throw Object.assign(new Error('材料不存在'), { status: 404 });
    m.styles = await db('material_styles').select('styles.id', 'styles.name')
      .join('styles', 'material_styles.style_id', 'styles.id')
      .where('material_styles.material_id', id);
    return m;
  },

  async createMaterial(fields) {
    const { subcategory_id, name, model, brand, image_url,
      original_price, discount_price, specs, attributes, has_chaise,
      old_code, new_code, applicable_scopes, sort_order, style_ids } = fields;
    // 标题至少填一项（名称/品牌/型号）；瓷砖用品牌，卫浴用型号
    if (!subcategory_id || (!name && !brand && !model)) throw Object.assign(new Error('子品类必填，名称、品牌或型号至少填一项'), { status: 400 });
    const sort = sort_order || 0;
    const id = await db.transaction(async (trx) => {
      // 排序值冲突时，同子品类内 >= 该值的材料整体后移一位（与风格管理一致）
      const clash = await trx('style_materials').where({ subcategory_id, sort_order: sort }).first();
      if (clash) await trx('style_materials').where('subcategory_id', subcategory_id).where('sort_order', '>=', sort).increment('sort_order', 1);
      const [newId] = await trx('style_materials').insert({
        subcategory_id, name: name || '', model: model || null, brand: brand || null,
        image_url: image_url || null,
        original_price: original_price ?? null, discount_price: discount_price ?? null,
        specs: specs || null,
        attributes: attributes ? JSON.stringify(attributes) : null,
        has_chaise: has_chaise ? 1 : 0,
        old_code: old_code || null, new_code: new_code || null,
        applicable_scopes: applicable_scopes ? JSON.stringify(applicable_scopes) : null,
        sort_order: sort,
      });
      if (style_ids && style_ids.length > 0) {
        await trx('material_styles').insert(style_ids.map(sid => ({ material_id: newId, style_id: sid })));
      }
      return newId;
    });
    return db('style_materials').where('id', id).first();
  },

  async updateMaterial(id, fields) {
    const ex = await db('style_materials').where('id', id).first();
    if (!ex) throw Object.assign(new Error('材料不存在'), { status: 404 });
    const u = {};
    ['name', 'model', 'brand', 'image_url', 'specs', 'old_code', 'new_code'].forEach(f => {
      if (fields[f] !== undefined) u[f] = fields[f];
    });
    if (u.name === null) u.name = ''; // name 列非空，空标题存空串
    const finalName = u.name !== undefined ? u.name : ex.name;
    const finalBrand = u.brand !== undefined ? u.brand : ex.brand;
    const finalModel = u.model !== undefined ? u.model : ex.model;
    if (!finalName && !finalBrand && !finalModel) throw Object.assign(new Error('名称、品牌或型号至少填一项'), { status: 400 });
    if (fields.subcategory_id !== undefined) u.subcategory_id = fields.subcategory_id;
    if (fields.original_price !== undefined) u.original_price = fields.original_price;
    if (fields.discount_price !== undefined) u.discount_price = fields.discount_price;
    if (fields.has_chaise !== undefined) u.has_chaise = fields.has_chaise ? 1 : 0;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    if (fields.enabled !== undefined) u.enabled = fields.enabled;
    if (fields.attributes !== undefined) u.attributes = JSON.stringify(fields.attributes);
    if (fields.applicable_scopes !== undefined) u.applicable_scopes = JSON.stringify(fields.applicable_scopes);
    await db.transaction(async (trx) => {
      // 改到已被占用的排序值（或换了子品类）时，目标子品类内 >= 该值的材料整体后移一位
      const subId = u.subcategory_id !== undefined ? u.subcategory_id : ex.subcategory_id;
      const targetSort = u.sort_order !== undefined ? u.sort_order : ex.sort_order;
      const sortChanged = u.sort_order !== undefined && u.sort_order !== ex.sort_order;
      const subChanged = u.subcategory_id !== undefined && u.subcategory_id !== ex.subcategory_id;
      if (sortChanged || subChanged) {
        const clash = await trx('style_materials').where({ subcategory_id: subId, sort_order: targetSort }).whereNot('id', id).first();
        if (clash) await trx('style_materials').where('subcategory_id', subId).where('sort_order', '>=', targetSort).whereNot('id', id).increment('sort_order', 1);
      }
      await trx('style_materials').where('id', id).update(u);
      if (fields.style_ids !== undefined) {
        await trx('material_styles').where('material_id', id).del();
        if (fields.style_ids.length > 0) {
          await trx('material_styles').insert(fields.style_ids.map(sid => ({ material_id: id, style_id: sid })));
        }
      }
    });
    return db('style_materials').where('id', id).first();
  },

  async deleteMaterial(id) {
    await db('material_styles').where('material_id', id).del();
    await db('style_materials').where('id', id).del();
  },

  async getMaterialsByStyleAndSubcategory(styleId, subcategoryId) {
    return db('style_materials')
      .select('style_materials.*')
      .join('material_styles', 'style_materials.id', 'material_styles.material_id')
      .where('material_styles.style_id', styleId)
      .where('style_materials.subcategory_id', subcategoryId)
      .where('style_materials.enabled', true)
      .orderBy('style_materials.sort_order', 'asc');
  },
};

module.exports = styleWizardMaterialService;
