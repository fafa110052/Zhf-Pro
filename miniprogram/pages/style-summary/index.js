// 选材清单页 — 7 大品类分组清单 + 价格汇总 + 业主信息提交
const api = require('../../utils/api');
const util = require('../../utils/util');

const DRAFT_STORAGE_KEY = 'style_wizard_draft';

/** 金额显示：整数不带小数，带小数保留 2 位 */
function formatMoney(n) {
  const num = Number(n) || 0;
  return num % 1 === 0 ? String(num) : num.toFixed(2);
}

Page({
  data: {
    ready: false,
    loading: true,
    error: false,
    missing: false,       // 无交接数据（直接进入/重启后打开）

    // 展示模型：[{ page_number, name, rows: [{type:'item'|'skip', ...}] }]
    sections: [],
    originalTotal: '',
    discountTotal: '',
    savedAmount: '',      // 空串 = 不显示"已省"标签

    ownerName: '',
    ownerPhone: '',
    community: '',
    roomNumber: '',
    submitting: false,
  },

  onLoad() {
    // 向导页通过 globalData 交接（selections 过大不走 URL），读后即清
    const app = getApp();
    this._handoff = app.globalData.styleWizardHandoff || null;
    app.globalData.styleWizardHandoff = null;
    this.loadData();
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  async loadData() {
    if (!this._handoff || !this._handoff.selections) {
      const pageData = { missing: true, loading: false };
      if (this._readyFired) this.setData(Object.assign({ ready: true }, pageData));
      else this._pageData = pageData;
      return;
    }
    this.setData({ loading: true, error: false, ready: false });
    try {
      const list = (await api.getStyleCategories()) || [];
      const categories = list
        .slice()
        .sort((a, b) => a.page_number - b.page_number)
        .map((c) => Object.assign({}, c, {
          subcategories: (c.subcategories || []).slice().sort((a, b) => a.sort_order - b.sort_order),
        }));

      const model = this.buildModel(categories, this._handoff.selections);
      this._items = model.items; // 提交用扁平数组（与展示同序）
      const saved = model.origTotal - model.discTotal;
      const pageData = {
        loading: false,
        error: false,
        sections: model.sections,
        originalTotal: formatMoney(model.origTotal),
        discountTotal: formatMoney(model.discTotal),
        savedAmount: saved > 0 ? formatMoney(saved) : '',
      };
      if (this._readyFired) this.setData(Object.assign({ ready: true }, pageData));
      else this._pageData = pageData;
    } catch (err) {
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  onRetry() {
    this.loadData();
  },

  /**
   * selections → 分组展示模型 + 提交 items
   * 第 2 步为 door、第 6 步为 lighting 特殊 key，其余按子品类 sub_{id}
   */
  buildModel(categories, selections) {
    const sections = [];
    const items = [];
    let origTotal = 0;
    let discTotal = 0;

    const addItem = (row, submitItem) => {
      if (submitItem.original_price != null) origTotal += Number(submitItem.original_price) || 0;
      if (submitItem.discount_price != null) discTotal += Number(submitItem.discount_price) || 0;
      items.push(submitItem);
      return row;
    };

    categories.forEach((cat) => {
      const rows = [];

      if (cat.page_number === 2) {
        const sel = selections.door;
        if (sel && sel.kind === 'door') {
          const name = [sel.series_name, sel.color_name].filter(Boolean).join(' · ');
          rows.push(addItem({
            type: 'item',
            name,
            subLabel: '门系列',
            image: util.fullImageUrl(sel.image_url),
            originalText: sel.original_price != null ? formatMoney(sel.original_price) : '',
            discountText: sel.discount_price != null ? formatMoney(sel.discount_price) : '',
            extra: '',
          }, {
            name,
            subcategory_name: '门系列',
            image_url: sel.image_url,
            original_price: sel.original_price,
            discount_price: sel.discount_price,
            series_name: sel.series_name,
            color_name: sel.color_name,
          }));
        } else {
          rows.push({ type: 'skip', subLabel: '门系列' });
        }
      } else if (cat.page_number === 6) {
        const sel = selections.lighting;
        if (sel && sel.kind === 'lighting') {
          rows.push(addItem({
            type: 'item',
            name: sel.name,
            subLabel: '灯具套餐',
            image: util.fullImageUrl(sel.image_url),
            originalText: sel.original_price != null ? formatMoney(sel.original_price) : '',
            discountText: sel.discount_price != null ? formatMoney(sel.discount_price) : '',
            extra: '',
          }, {
            name: sel.name,
            subcategory_name: '灯具套餐',
            image_url: sel.image_url,
            original_price: sel.original_price,
            discount_price: sel.discount_price,
          }));
        } else {
          rows.push({ type: 'skip', subLabel: '灯具套餐' });
        }
      } else {
        (cat.subcategories || []).forEach((sub) => {
          const sel = selections['sub_' + sub.id];
          if (sel && sel.kind === 'material') {
            const submitItem = {
              name: sel.name,
              subcategory_name: sub.name,
              image_url: sel.image_url,
              original_price: sel.original_price,
              discount_price: sel.discount_price,
            };
            if (sel.lock_direction) submitItem.lock_direction = sel.lock_direction;
            if (sel.chaise_direction) submitItem.chaise_direction = sel.chaise_direction;
            rows.push(addItem({
              type: 'item',
              name: sel.name,
              subLabel: sub.name,
              image: util.fullImageUrl(sel.image_url),
              originalText: sel.original_price != null ? formatMoney(sel.original_price) : '',
              discountText: sel.discount_price != null ? formatMoney(sel.discount_price) : '',
              extra: [sel.lock_direction, sel.chaise_direction].filter(Boolean).join(' · '),
            }, submitItem));
          } else if (sel && sel.kind === 'door') {
            // 卫生间门：系列名 · 颜色名 + 锁向
            const name = [sel.series_name, sel.color_name].filter(Boolean).join(' · ');
            const submitItem = {
              name,
              subcategory_name: sub.name,
              image_url: sel.image_url,
              original_price: sel.original_price,
              discount_price: sel.discount_price,
              series_name: sel.series_name,
              color_name: sel.color_name,
            };
            if (sel.lock_direction) submitItem.lock_direction = sel.lock_direction;
            rows.push(addItem({
              type: 'item',
              name,
              subLabel: sub.name,
              image: util.fullImageUrl(sel.image_url),
              originalText: sel.original_price != null ? formatMoney(sel.original_price) : '',
              discountText: sel.discount_price != null ? formatMoney(sel.discount_price) : '',
              extra: sel.lock_direction || '',
            }, submitItem));
          } else {
            // 跳过或缺失都按"未选"展示
            rows.push({ type: 'skip', subLabel: sub.name });
          }
        });
      }

      sections.push({ page_number: cat.page_number, name: cat.name, rows });
    });

    return { sections, items, origTotal, discTotal };
  },

  // ═══════════════════════════════════════════
  // 业主信息表单 + 提交
  // ═══════════════════════════════════════════

  onFieldInput(e) {
    const update = {};
    update[e.currentTarget.dataset.field] = e.detail.value;
    this.setData(update);
  },

  async onSubmit() {
    if (this.data.submitting) return;
    const name = (this.data.ownerName || '').trim();
    const phone = (this.data.ownerPhone || '').trim();
    const community = (this.data.community || '').trim();
    const room = (this.data.roomNumber || '').trim();

    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入11位手机号', icon: 'none' });
      return;
    }
    if (!community) {
      wx.showToast({ title: '请输入小区', icon: 'none' });
      return;
    }
    if (!room) {
      wx.showToast({ title: '请输入房号', icon: 'none' });
      return;
    }

    const app = getApp();
    if (!app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '提交选材单需要先登录',
        confirmText: '去登录',
        success: (r) => {
          if (r.confirm) wx.navigateTo({ url: '/pages/designer-login/index' });
        },
      });
      return;
    }

    this.setData({ submitting: true });
    try {
      await api.submitStyleOrder({
        style_id: this._handoff.style_id,
        owner_name: name,
        owner_phone: phone,
        community,
        room_number: room,
        items: this._items || [],
      });
      // 服务端草稿在提交时已删除，这里清掉本地草稿
      try { wx.removeStorageSync(DRAFT_STORAGE_KEY); } catch (e) {}
      wx.reLaunch({ url: '/pages/style-my-selections/index?submitted=1' });
    } catch (err) {
      // 错误 toast 由 request.js 统一弹出
      this.setData({ submitting: false });
    }
  },

  onGoWizard() {
    wx.switchTab({ url: '/pages/style-select/index' });
  },
});
