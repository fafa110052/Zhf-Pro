const db = require('../db/connection');
const ExcelJS = require('exceljs');

const STATUS_LABEL = { pending: '待联系', contacted: '已联系', completed: '已完成' };

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
    const sort = sort_order || 0;
    const id = await db.transaction(async (trx) => {
      // 排序值冲突时，同品类内 >= 该值的子品类整体后移一位
      const clash = await trx('style_subcategories').where({ category_id, sort_order: sort }).first();
      if (clash) await trx('style_subcategories').where('category_id', category_id).where('sort_order', '>=', sort).increment('sort_order', 1);
      const [newId] = await trx('style_subcategories').insert({
        category_id, name, sort_order: sort,
        layout_type: layout_type || 'image_top_text_bottom',
        columns: columns || 2,
        attribute_template: attribute_template || null,
      });
      return newId;
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
    await db.transaction(async (trx) => {
      // 改到已被占用的排序值时，同品类内其余 >= 该值的子品类整体后移一位
      if (u.sort_order !== undefined && u.sort_order !== ex.sort_order) {
        const clash = await trx('style_subcategories').where({ category_id: ex.category_id, sort_order: u.sort_order }).whereNot('id', id).first();
        if (clash) await trx('style_subcategories').where('category_id', ex.category_id).where('sort_order', '>=', u.sort_order).whereNot('id', id).increment('sort_order', 1);
      }
      await trx('style_subcategories').where('id', id).update(u);
    });
    return db('style_subcategories').where('id', id).first();
  },
  async deleteSubcategory(id) {
    await db('style_subcategories').where('id', id).del();
  },

  // ===== 门系列 + 颜色 + 门材料 =====
  async listDoorSeries(pageNumber) {
    let q = db('door_series').orderBy('sort_order', 'asc');
    if (pageNumber !== undefined) q = q.where('page_number', pageNumber);
    const series = await q;
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
  async createDoorSeries({ name, image_url, sort_order, page_number }) {
    if (!name) throw Object.assign(new Error('系列名称不能为空'), { status: 400 });
    const sort = sort_order || 0;
    const pn = page_number || 2;
    const id = await db.transaction(async (trx) => {
      // 排序值冲突时，>= 该值的系列整体后移一位
      const clash = await trx('door_series').where('sort_order', sort).first();
      if (clash) await trx('door_series').where('sort_order', '>=', sort).increment('sort_order', 1);
      const [newId] = await trx('door_series').insert({ name, image_url: image_url || null, sort_order: sort, page_number: pn });
      return newId;
    });
    return db('door_series').where('id', id).first();
  },
  async updateDoorSeries(id, fields) {
    const ex = await db('door_series').where('id', id).first();
    if (!ex) throw Object.assign(new Error('门系列不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.image_url !== undefined) u.image_url = fields.image_url;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    if (fields.page_number !== undefined) u.page_number = fields.page_number;
    await db.transaction(async (trx) => {
      // 改到已被占用的排序值时，其余 >= 该值的系列整体后移一位
      if (u.sort_order !== undefined && u.sort_order !== ex.sort_order) {
        const clash = await trx('door_series').where('sort_order', u.sort_order).whereNot('id', id).first();
        if (clash) await trx('door_series').where('sort_order', '>=', u.sort_order).whereNot('id', id).increment('sort_order', 1);
      }
      await trx('door_series').where('id', id).update(u);
    });
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
    const dup = await db('door_colors').where({ series_id, name }).first('id');
    if (dup) throw Object.assign(new Error('该系列已有同名颜色'), { status: 400 });
    const sort = sort_order || 0;
    const id = await db.transaction(async (trx) => {
      // 排序值冲突时，同系列内 >= 该值的颜色整体后移一位
      const clash = await trx('door_colors').where({ series_id, sort_order: sort }).first();
      if (clash) await trx('door_colors').where('series_id', series_id).where('sort_order', '>=', sort).increment('sort_order', 1);
      const [newId] = await trx('door_colors').insert({ series_id, name, image_url: image_url || null, sort_order: sort });
      return newId;
    });
    return db('door_colors').where('id', id).first();
  },

  // ===== 通用颜色库（独立于系列，系列添加颜色时从中挑选） =====
  async listColorLibrary() {
    return db('door_color_library').orderBy('sort_order', 'asc').orderBy('id', 'asc');
  },
  async createLibraryColor({ name, image_url, sort_order }) {
    // 颜色卡以色块图为主，名称与图片均必填
    if (!name || !image_url) throw Object.assign(new Error('颜色名称和色块图为必填'), { status: 400 });
    const dup = await db('door_color_library').where('name', name).first('id');
    if (dup) throw Object.assign(new Error('颜色库已有同名颜色'), { status: 400 });
    const sort = sort_order || 0;
    const id = await db.transaction(async (trx) => {
      // 排序值冲突时，>= 该值的库颜色整体后移一位
      const clash = await trx('door_color_library').where('sort_order', sort).first();
      if (clash) await trx('door_color_library').where('sort_order', '>=', sort).increment('sort_order', 1);
      const [newId] = await trx('door_color_library').insert({ name, image_url, sort_order: sort });
      return newId;
    });
    return db('door_color_library').where('id', id).first();
  },
  async updateLibraryColor(id, fields) {
    const ex = await db('door_color_library').where('id', id).first();
    if (!ex) throw Object.assign(new Error('颜色不存在'), { status: 404 });
    const u = {};
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.image_url !== undefined) u.image_url = fields.image_url;
    if (fields.sort_order !== undefined) u.sort_order = fields.sort_order;
    if (u.name === '' || u.image_url === '') throw Object.assign(new Error('颜色名称和色块图为必填'), { status: 400 });
    await db.transaction(async (trx) => {
      // 改到已被占用的排序值时，其余 >= 该值的库颜色整体后移一位
      if (u.sort_order !== undefined && u.sort_order !== ex.sort_order) {
        const clash = await trx('door_color_library').where('sort_order', u.sort_order).whereNot('id', id).first();
        if (clash) await trx('door_color_library').where('sort_order', '>=', u.sort_order).whereNot('id', id).increment('sort_order', 1);
      }
      await trx('door_color_library').where('id', id).update(u);
    });
    return db('door_color_library').where('id', id).first();
  },
  async deleteLibraryColor(id) {
    // 系列中的颜色是入库时的副本，删除库颜色不影响已加入系列的颜色
    await db('door_color_library').where('id', id).del();
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
    // 后台表单已简化：系列/颜色/风格/图片全部必填，价格与规格不再录入（历史数据仍可展示）
    if (!series_id || !color_id || !style_id || !image_url) {
      throw Object.assign(new Error('系列、颜色、风格和图片为必填'), { status: 400 });
    }
    const dup = await db('door_materials').where({ series_id, color_id, style_id }).first('id');
    if (dup) throw Object.assign(new Error('该颜色已在此风格中'), { status: 400 });
    const [id] = await db('door_materials').insert({
      series_id, color_id, style_id,
      image_url,
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
    const sort = sort_order || 0;
    const id = await db.transaction(async (trx) => {
      // 排序值冲突时，>= 该值的套餐整体后移一位
      const clash = await trx('lighting_packages').where('sort_order', sort).first();
      if (clash) await trx('lighting_packages').where('sort_order', '>=', sort).increment('sort_order', 1);
      const [newId] = await trx('lighting_packages').insert({
        name, image_url: image_url || null,
        original_price: original_price ?? null,
        discount_price: discount_price ?? null,
        sort_order: sort,
      });
      if (items && items.length > 0) {
        await trx('lighting_package_items').insert(items.map(it => ({ package_id: newId, ...it })));
      }
      return newId;
    });
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
    await db.transaction(async (trx) => {
      // 改到已被占用的排序值时，其余 >= 该值的套餐整体后移一位
      if (u.sort_order !== undefined && u.sort_order !== ex.sort_order) {
        const clash = await trx('lighting_packages').where('sort_order', u.sort_order).whereNot('id', id).first();
        if (clash) await trx('lighting_packages').where('sort_order', '>=', u.sort_order).whereNot('id', id).increment('sort_order', 1);
      }
      await trx('lighting_packages').where('id', id).update(u);
      if (fields.items !== undefined) {
        await trx('lighting_package_items').where('package_id', id).del();
        if (fields.items.length > 0) {
          await trx('lighting_package_items').insert(fields.items.map(it => ({ package_id: id, ...it })));
        }
      }
    });
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

  // ===== Excel 导出 =====
  async exportOrders(orderIds) {
    if (!orderIds || !orderIds.length) throw Object.assign(new Error('请选择要导出的订单'), { status: 400 });

    const orders = await db('selection_orders')
      .select('selection_orders.*', 'styles.name as style_name')
      .leftJoin('styles', 'selection_orders.style_id', 'styles.id')
      .whereIn('selection_orders.id', orderIds)
      .orderBy('selection_orders.created_at', 'desc');

    // 预加载子品类→品类映射
    const subs = await db('style_subcategories')
      .select('style_subcategories.name', 'style_categories.name as category_name')
      .leftJoin('style_categories', 'style_subcategories.category_id', 'style_categories.id');
    const catMap = {};
    for (const s of subs) { catMap[s.name] = s.category_name || ''; }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('风格选材');

    ws.columns = [
      { header: '订单号', key: 'order_no', width: 14 },
      { header: '业主姓名', key: 'owner_name', width: 10 },
      { header: '联系电话', key: 'owner_phone', width: 14 },
      { header: '小区', key: 'community', width: 16 },
      { header: '房号', key: 'room_number', width: 10 },
      { header: '风格', key: 'style_name', width: 10 },
      { header: '状态', key: 'status', width: 8 },
      { header: '品类', key: 'category_name', width: 10 },
      { header: '子品类', key: 'subcategory_name', width: 12 },
      { header: '材料名称', key: 'item_name', width: 20 },
      { header: '原价', key: 'original_price', width: 10 },
      { header: '优惠价', key: 'discount_price', width: 10 },
      { header: '提交时间', key: 'submitted_at', width: 18 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };

    // 通用信息列按订单组合并（A-G 订单号→状态，M 提交时间）
    // 品类(H)和子品类(I)连续相同也合并
    const ORDER_MERGE_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'M'];

    for (const o of orders) {
      let items = [];
      try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch { /* ignore */ }

      const rowStart = ws.rowCount + 1;
      const common = {
        order_no: o.order_no, owner_name: o.owner_name || '', owner_phone: o.owner_phone || '',
        community: o.community || '', room_number: o.room_number || '',
        style_name: o.style_name || '', status: STATUS_LABEL[o.status] || o.status,
        submitted_at: o.submitted_at || '',
      };

      if (items.length === 0) {
        ws.addRow({ ...common, category_name: '', subcategory_name: '', item_name: '（无明细）',
          original_price: '', discount_price: '' });
      } else {
        for (const it of items) {
          const subName = it.subcategory_name || '';
          ws.addRow({
            ...common,
            category_name: catMap[subName] || '',
            subcategory_name: subName,
            item_name: it.name || '',
            original_price: it.original_price ? Number(it.original_price) : '',
            discount_price: it.discount_price ? Number(it.discount_price) : '',
          });
        }
      }

      const rowEnd = ws.rowCount;
      // 合并通用信息列
      if (rowEnd > rowStart) {
        for (const col of ORDER_MERGE_COLS) {
          ws.mergeCells(`${col}${rowStart}:${col}${rowEnd}`);
        }
        for (let r = rowStart; r <= rowEnd; r++) {
          for (const col of ORDER_MERGE_COLS) {
            ws.getCell(`${col}${r}`).alignment = { vertical: 'middle' };
          }
        }
      }

      // 合并连续的相同品类(H)和子品类(I)
      if (rowEnd > rowStart) {
        for (const col of ['H', 'I']) {
          let segStart = rowStart;
          for (let r = rowStart + 1; r <= rowEnd; r++) {
            const prevVal = ws.getCell(`${col}${r - 1}`).value;
            const curVal = ws.getCell(`${col}${r}`).value;
            if (curVal !== prevVal) {
              if (r - 1 > segStart) ws.mergeCells(`${col}${segStart}:${col}${r - 1}`);
              segStart = r;
            }
          }
          if (rowEnd > segStart) ws.mergeCells(`${col}${segStart}:${col}${rowEnd}`);
        }
      }
    }

    ws.getColumn('original_price').numFmt = '¥#,##0.00';
    ws.getColumn('discount_price').numFmt = '¥#,##0.00';

    return await wb.xlsx.writeBuffer();
  },
};

module.exports = styleWizardService;
