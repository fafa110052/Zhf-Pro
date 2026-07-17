// 风格选择页 — 风格选材向导入口（tab 页）
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    ready: false,
    loading: true,
    error: false,
    styles: [],
  },

  onLoad() {
    this.loadStyles();
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  onShow() {
    // 返回该页时刷新（管理端可能新增风格）
    if (this.data.ready && !this.data.loading) this.loadStyles(true);
  },

  async loadStyles(silent) {
    if (!silent) this.setData({ loading: true, error: false });
    try {
      const res = await api.getStyles();
      const styles = (res || []).map(s => Object.assign({}, s, {
        cover_image: util.fullImageUrl(s.cover_image),
      }));
      const pageData = { styles, loading: false, error: false };
      if (this._readyFired) this.setData(Object.assign({ ready: true }, pageData));
      else this._pageData = pageData;
    } catch (err) {
      const pageData = { loading: false, error: true };
      if (this._readyFired) this.setData(Object.assign({ ready: true }, pageData));
      else this._pageData = pageData;
    }
  },

  onRetry() {
    this.loadStyles();
  },

  // 点击风格卡片直接进入向导
  onTapStyle(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/style-wizard/index?style_id=${id}&step=1` });
  },
});
