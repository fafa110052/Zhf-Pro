// 我的选材页 — 选材单列表 + 状态 + 分页
const api = require('../../utils/api');
const util = require('../../utils/util');

const STATUS_MAP = {
  pending: { label: '待联系', cls: 'pending' },
  contacted: { label: '已联系', cls: 'contacted' },
  completed: { label: '已完成', cls: 'completed' },
};

/** 金额显示：整数不带小数，带小数保留 2 位 */
function formatMoney(n) {
  const num = Number(n) || 0;
  return num % 1 === 0 ? String(num) : num.toFixed(2);
}

/** 订单行 → 展示模型（items 是 JSON 字符串，解析后取明细） */
function decorateOrder(order) {
  let items = order.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) { items = []; }
  }
  items = items || [];
  const status = STATUS_MAP[order.status] || { label: order.status || '未知', cls: 'pending' };
  return Object.assign({}, order, {
    itemsList: items.map((it) => ({
      name: it.name || '',
      subcategory_name: it.subcategory_name || '',
      discountText: it.discount_price != null ? formatMoney(it.discount_price) : '',
    })),
    itemCount: items.length,
    statusLabel: status.label,
    statusCls: status.cls,
    originalText: formatMoney(order.original_total),
    discountText: formatMoney(order.discount_total),
    submittedText: util.formatTime(order.submitted_at),
  });
}

Page({
  data: {
    ready: false,
    loading: true,
    error: false,
    loggedIn: true,

    orders: [],
    page: 1,
    totalPages: 1,
    loadingMore: false,
    expandedId: null,   // 展开明细的订单 id
  },

  onLoad(options) {
    if (options && options.submitted === '1') {
      wx.showToast({ title: '提交成功', icon: 'success' });
    }
    this.loadData();
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  onShow() {
    // 首次 onShow 早于数据返回，由 ready/loading 门控跳过
    if (!this.data.ready || this.data.loading) return;
    const app = getApp();
    if (!app.globalData.token) {
      if (this.data.loggedIn) this.setData({ loggedIn: false, orders: [] });
      return;
    }
    // 回到页面刷新（登录态变化 / 订单状态可能变化）
    this.loadData(this.data.loggedIn);
  },

  /**
   * 加载第 1 页；silent = 不闪 loading 的静默刷新
   */
  async loadData(silent) {
    const app = getApp();
    if (!app.globalData.token) {
      const pageData = { loggedIn: false, loading: false, error: false };
      if (this._readyFired) this.setData(Object.assign({ ready: true }, pageData));
      else this._pageData = pageData;
      return;
    }
    if (!silent) this.setData({ loading: true, error: false });
    try {
      const res = await api.getMyStyleOrders(1);
      const orders = ((res && res.list) || []).map(decorateOrder);
      const pagination = (res && res.pagination) || {};
      const pageData = {
        loggedIn: true,
        loading: false,
        error: false,
        orders,
        page: pagination.page || 1,
        totalPages: pagination.total_pages || 1,
        expandedId: null,
      };
      if (this._readyFired) this.setData(Object.assign({ ready: true }, pageData));
      else this._pageData = pageData;
    } catch (err) {
      if (silent) return;
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  onRetry() {
    this.loadData();
  },

  async onPullDownRefresh() {
    await this.loadData(this.data.ready && !this.data.error);
    wx.stopPullDownRefresh();
  },

  async onReachBottom() {
    if (!this.data.loggedIn || this.data.loading || this.data.loadingMore) return;
    if (this.data.page >= this.data.totalPages) return;
    const next = this.data.page + 1;
    this.setData({ loadingMore: true });
    try {
      const res = await api.getMyStyleOrders(next);
      const more = ((res && res.list) || []).map(decorateOrder);
      const pagination = (res && res.pagination) || {};
      this.setData({
        orders: this.data.orders.concat(more),
        page: pagination.page || next,
        totalPages: pagination.total_pages || this.data.totalPages,
        loadingMore: false,
      });
    } catch (err) {
      this.setData({ loadingMore: false });
    }
  },

  onToggleOrder(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedId: this.data.expandedId === id ? null : id });
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/designer-login/index' });
  },

  onGoStyle() {
    wx.switchTab({ url: '/pages/style-select/index' });
  },
});
