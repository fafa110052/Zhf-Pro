/**
 * 我的选材申请列表 — 参照 work-detail onReady+ready 模式
 */
const api = require('../../utils/api');
const { ORDER_STATUS_MAP } = require('../../utils/constants');

Page({
  data: {
    orders: [],
    page: 1,
    totalPages: 1,
    loading: true,
    loadingMore: false,
    hasMore: true,
    error: false,
    ready: false,
    ORDER_STATUS_MAP,
  },

  onLoad() {
    this.loadOrders(true);
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  onPullDownRefresh() {
    this.loadOrders(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.loadMore();
  },

  async loadOrders(reset) {
    const page = reset ? 1 : this.data.page;
    if (reset) this.setData({ loading: true, orders: [], page: 1, ready: false });

    try {
      const result = await api.getMyMaterialOrders({ page, page_size: 20 });
      const list = result.list || [];
      const pag = result.pagination || {};

      const orders = list.map((o) => ({
        ...o,
        statusLabel: (ORDER_STATUS_MAP[o.status] || {}).label || o.status,
        statusIcon: (ORDER_STATUS_MAP[o.status] || {}).icon || '',
        statusColor: (ORDER_STATUS_MAP[o.status] || {}).colorClass || '',
      }));

      if (reset) {
        const pageData = { orders, page: pag.page || 1, totalPages: pag.total_pages || 1, loading: false, hasMore: (pag.page || 1) < (pag.total_pages || 1) };
        if (this._readyFired) {
          this.setData(Object.assign({ ready: true }, pageData));
        } else {
          this._pageData = pageData;
        }
      } else {
        this.setData({
          orders: this.data.orders.concat(orders),
          page: pag.page || page, totalPages: pag.total_pages || 1,
          loadingMore: false, hasMore: (pag.page || page) < (pag.total_pages || 1),
        });
      }
    } catch (err) {
      console.error('加载申请列表失败:', err);
      if (reset) this.setData({ loading: false, error: true, ready: true });
      else this.setData({ loadingMore: false });
    }
  },

  async loadMore() {
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    await this.loadOrders(false);
  },

  onOrderTap(e) {
    const { orderNo } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/material-order-detail/index?orderNo=${orderNo}` });
  },

  onRetry() { this.loadOrders(true); },
});
