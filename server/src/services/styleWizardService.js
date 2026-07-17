const db = require('../db/connection');

const styleWizardService = {
  // ===== 风格 CRUD =====
  async listStyles(includeDisabled = false) {
    let q = db('styles').orderBy('sort_order', 'asc');
    if (!includeDisabled) q = q.where('enabled', true);
    return q;
  },
  async getStyle(id) {
    const s = await db('styles').where('id', id).first();
    if (!s) throw Object.assign(new Error('风格不存在'), { status: 404 });
    return s;
  },
  async createStyle({ name, cover_image, description, sort_order, enabled, vr_url }) {
    if (!name) throw Object.assign(new Error('风格名称不能为空'), { status: 400 });
    const sort = sort_order !== undefined ? sort_order : 0;
    const id = await db.transaction(async (trx) => {
      // 排序值冲突时，原有 >= 该值的风格整体后移一位，保证排序唯一
      const clash = await trx('styles').where('sort_order', sort).first();
      if (clash) await trx('styles').where('sort_order', '>=', sort).increment('sort_order', 1);
      const [newId] = await trx('styles').insert({
        name, cover_image: cover_image || null,
        description: description || null,
        vr_url: vr_url || null,
        sort_order: sort,
        enabled: enabled !== undefined ? enabled : true,
      });
      return newId;
    });
    return db('styles').where('id', id).first();
  },
  async updateStyle(id, fields) {
    const ex = await db('styles').where('id', id).first();
    if (!ex) throw Object.assign(new Error('风格不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.cover_image !== undefined) u.cover_image = fields.cover_image;
    if (fields.description !== undefined) u.description = fields.description;
    if (fields.vr_url !== undefined) u.vr_url = fields.vr_url || null;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    if (fields.enabled !== undefined) u.enabled = fields.enabled;
    await db.transaction(async (trx) => {
      // 改到已被占用的排序值时，其余 >= 该值的风格整体后移一位
      if (u.sort_order !== undefined && u.sort_order !== ex.sort_order) {
        const clash = await trx('styles').where('sort_order', u.sort_order).whereNot('id', id).first();
        if (clash) await trx('styles').where('sort_order', '>=', u.sort_order).whereNot('id', id).increment('sort_order', 1);
      }
      await trx('styles').where('id', id).update(u);
    });
    return db('styles').where('id', id).first();
  },
  async deleteStyle(id) {
    const ex = await db('styles').where('id', id).first();
    if (!ex) throw Object.assign(new Error('风格不存在'), { status: 404 });
    await db('styles').where('id', id).del();
  },

  // ===== 风格选择页页眉配置（存 homepage_config，type=style_header 单行） =====
  async getSelectPageConfig() {
    const defaults = { image_url: null, title: '选择你的装修风格', subtitle: 'CHOOSE YOUR STYLE' };
    const row = await db('homepage_config').where('config_type', 'style_header').first();
    if (!row) return defaults;
    let cv = row.config_value;
    if (typeof cv === 'string') { try { cv = JSON.parse(cv); } catch { cv = {}; } }
    return Object.assign({}, defaults, cv || {});
  },
  async updateSelectPageConfig({ image_url, title, subtitle }) {
    const value = JSON.stringify({
      image_url: image_url || null,
      title: title || '选择你的装修风格',
      subtitle: subtitle || 'CHOOSE YOUR STYLE',
    });
    const row = await db('homepage_config').where('config_type', 'style_header').first();
    if (row) await db('homepage_config').where('id', row.id).update({ config_value: value });
    else await db('homepage_config').insert({ config_type: 'style_header', config_value: value });
    return this.getSelectPageConfig();
  },

  // ===== 品类 + 子品类 =====
  async listCategories() {
    const cats = await db('style_categories').orderBy('page_number', 'asc');
    const subs = await db('style_subcategories').orderBy('sort_order', 'asc');
    return cats.map(c => ({ ...c, subcategories: subs.filter(s => s.category_id === c.id) }));
  },
  async updateCategory(id, fields) {
    const ex = await db('style_categories').where('id', id).first();
    if (!ex) throw Object.assign(new Error('品类不存在'), { status: 404 });
    const u = {};
    if (fields.cover_image !== undefined) u.cover_image = fields.cover_image || null;
    if (Object.keys(u).length) await db('style_categories').where('id', id).update(u);
    return db('style_categories').where('id', id).first();
  },
  async getSubcategories(categoryId) {
    return db('style_subcategories').where('category_id', categoryId).orderBy('sort_order', 'asc');
  },
  async createSubcategory({ category_id, name, sort_order, layout_type, columns, attribute_template }) {
    if (!category_id || !name) throw Object.assign(new Error('品类和名称为必填'), { status: 400 });
    const [id] = await db('style_subcategories').insert({
      category_id, name, sort_order: sort_order || 0,
      layout_type: layout_type || 'image_top_text_bottom',
      columns: columns || 2,
      attribute_template: attribute_template || null,
    });
    return db('style_subcategories').where('id', id).first();
  },
  async updateSubcategory(id, fields) {
    const ex = await db('style_subcategories').where('id', id).first();
    if (!ex) throw Object.assign(new Error('子品类不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    if (fields.layout_type !== undefined) u.layout_type = fields.layout_type;
    if (fields.columns !== undefined) u.columns = fields.columns;
    if (fields.attribute_template !== undefined) u.attribute_template = fields.attribute_template;
    await db('style_subcategories').where('id', id).update(u);
    return db('style_subcategories').where('id', id).first();
  },
  async deleteSubcategory(id) {
    await db('style_subcategories').where('id', id).del();
  },

  // ===== 门系列 + 颜色 + 门材料 =====
  async listDoorSeries() {
    const series = await db('door_series').orderBy('sort_order', 'asc');
    for (const s of series) {
      s.colors = await db('door_colors').where('series_id', s.id).orderBy('sort_order', 'asc');
    }
    return series;
  },
  async getDoorSeries(id) {
    const s = await db('door_series').where('id', id).first();
    if (!s) throw Object.assign(new Error('门系列不存在'), { status: 404 });
    s.colors = await db('door_colors').where('series_id', id).orderBy('sort_order', 'asc');
    return s;
  },
  async createDoorSeries({ name, image_url, sort_order }) {
    if (!name) throw Object.assign(new Error('系列名称不能为空'), { status: 400 });
    const [id] = await db('door_series').insert({ name, image_url: image_url || null, sort_order: sort_order || 0 });
    return db('door_series').where('id', id).first();
  },
  async updateDoorSeries(id, fields) {
    const ex = await db('door_series').where('id', id).first();
    if (!ex) throw Object.assign(new Error('门系列不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.image_url !== undefined) u.image_url = fields.image_url;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    await db('door_series').where('id', id).update(u);
    return db('door_series').where('id', id).first();
  },
  async deleteDoorSeries(id) {
    await db('door_colors').where('series_id', id).del();
    await db('door_materials').where('series_id', id).del();
    await db('door_series').where('id', id).del();
  },
  async listDoorColors(seriesId) {
    return db('door_colors').where('series_id', seriesId).orderBy('sort_order', 'asc');
  },
  async createDoorColor({ series_id, name, image_url, sort_order }) {
    if (!series_id || !name) throw Object.assign(new Error('系列和颜色名称为必填'), { status: 400 });
    const [id] = await db('door_colors').insert({ series_id, name, image_url: image_url || null, sort_order: sort_order || 0 });
    return db('door_colors').where('id', id).first();
  },
  async deleteDoorColor(id) {
    await db('door_materials').where('color_id', id).del();
    await db('door_colors').where('id', id).del();
  },
  async listDoorMaterials(seriesId, styleId) {
    return db('door_materials')
      .select('door_materials.*', 'door_colors.name as color_name')
      .join('door_colors', 'door_materials.color_id', 'door_colors.id')
      .where('door_materials.series_id', seriesId)
      .where('door_materials.style_id', styleId)
      .orderBy('door_colors.sort_order', 'asc');
  },
  async createDoorMaterial({ series_id, color_id, style_id, image_url, original_price, discount_price, specs }) {
    const [id] = await db('door_materials').insert({
      series_id, color_id, style_id,
      image_url: image_url || null,
      original_price: original_price ?? null,
      discount_price: discount_price ?? null,
      specs: specs || null,
    });
    return db('door_materials').where('id', id).first();
  },
  async deleteDoorMaterial(id) {
    await db('door_materials').where('id', id).del();
  },

  // ===== 灯具套餐 =====
  async listLightingPackages() {
    const pkgs = await db('lighting_packages').orderBy('sort_order', 'asc');
    for (const p of pkgs) {
      p.items = await db('lighting_package_items').where('package_id', p.id).orderBy('sort_order', 'asc');
    }
    return pkgs;
  },
  async getLightingPackage(id) {
    const p = await db('lighting_packages').where('id', id).first();
    if (!p) throw Object.assign(new Error('灯具套餐不存在'), { status: 404 });
    p.items = await db('lighting_package_items').where('package_id', id).orderBy('sort_order', 'asc');
    return p;
  },
  async createLightingPackage({ name, image_url, original_price, discount_price, sort_order, items }) {
    if (!name) throw Object.assign(new Error('套餐名称不能为空'), { status: 400 });
    const [id] = await db('lighting_packages').insert({
      name, image_url: image_url || null,
      original_price: original_price ?? null,
      discount_price: discount_price ?? null,
      sort_order: sort_order || 0,
    });
    if (items && items.length > 0) {
      await db('lighting_package_items').insert(items.map(it => ({ package_id: id, ...it })));
    }
    return db('lighting_packages').where('id', id).first();
  },
  async updateLightingPackage(id, fields) {
    const ex = await db('lighting_packages').where('id', id).first();
    if (!ex) throw Object.assign(new Error('灯具套餐不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.image_url !== undefined) u.image_url = fields.image_url;
    if (fields.original_price !== undefined) u.original_price = fields.original_price;
    if (fields.discount_price !== undefined) u.discount_price = fields.discount_price;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    await db('lighting_packages').where('id', id).update(u);
    if (fields.items !== undefined) {
      await db('lighting_package_items').where('package_id', id).del();
      if (fields.items.length > 0) {
        await db('lighting_package_items').insert(fields.items.map(it => ({ package_id: id, ...it })));
      }
    }
    return db('lighting_packages').where('id', id).first();
  },
  async deleteLightingPackage(id) {
    await db('lighting_package_items').where('package_id', id).del();
    await db('lighting_packages').where('id', id).del();
  },

  // ===== 草稿 =====
  async saveDraft(userId, { style_id, current_step, data }) {
    const ex = await db('selection_drafts').where('user_id', userId).first();
    if (ex) {
      await db('selection_drafts').where('user_id', userId).update({
        style_id: style_id ?? ex.style_id,
        current_step: current_step ?? ex.current_step,
        data: data ? JSON.stringify(data) : ex.data,
        updated_at: db.fn.now(),
      });
    } else {
      await db('selection_drafts').insert({
        user_id: userId, style_id,
        current_step: current_step || 1,
        data: data ? JSON.stringify(data) : '{}',
      });
    }
    return db('selection_drafts').where('user_id', userId).first();
  },
  async getDraft(userId) {
    const draft = await db('selection_drafts').where('user_id', userId).first();
    if (!draft) return null;
    if (draft.data) draft.data = JSON.parse(draft.data);
    return draft;
  },

  // ===== 选材单 =====
  async submitOrder({ user_id, style_id, owner_name, owner_phone, community, room_number, items }) {
    if (!user_id || !items) throw Object.assign(new Error('用户和选材项为必填'), { status: 400 });
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [{ count }] = await db('selection_orders').where('order_no', 'like', `${today}%`).count('* as count');
    const orderNo = today + String(count + 1).padStart(2, '0');

    const itemsArr = typeof items === 'string' ? JSON.parse(items) : items;
    let origTotal = 0, discTotal = 0;
    for (const it of itemsArr) {
      if (it.original_price) origTotal += Number(it.original_price);
      if (it.discount_price) discTotal += Number(it.discount_price);
    }

    const [id] = await db('selection_orders').insert({
      order_no: orderNo, user_id, style_id,
      owner_name: owner_name || null, owner_phone: owner_phone || null,
      community: community || null, room_number: room_number || null,
      original_total: origTotal, discount_total: discTotal,
      items: JSON.stringify(itemsArr),
      status: 'pending', submitted_at: db.fn.now(),
    });
    await db('selection_drafts').where('user_id', user_id).del();
    return db('selection_orders').where('id', id).first();
  },
  async listOrders(filters = {}, pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(pagination.page_size) || 20));
    const offset = (page - 1) * pageSize;
    let q = db('selection_orders').select('selection_orders.*', 'styles.name as style_name')
      .leftJoin('styles', 'selection_orders.style_id', 'styles.id');
    if (filters.status) q = q.where('selection_orders.status', filters.status);
    if (filters.user_id) q = q.where('selection_orders.user_id', filters.user_id);
    const [{ count }] = await q.clone().count('* as count');
    const list = await q.orderBy('selection_orders.created_at', 'desc').offset(offset).limit(pageSize);
    return { list, pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) } };
  },
  async getOrder(id) {
    const order = await db('selection_orders')
      .select('selection_orders.*', 'styles.name as style_name')
      .leftJoin('styles', 'selection_orders.style_id', 'styles.id')
      .where('selection_orders.id', id).first();
    if (!order) throw Object.assign(new Error('选材单不存在'), { status: 404 });
    if (order.items) order.items = JSON.parse(order.items);
    return order;
  },
};

module.exports = styleWizardService;
