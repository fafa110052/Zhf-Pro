// 风格选择页 — 风格选材向导入口（tab 页）
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    ready: false,
    loading: true,
    error: false,
    styles: [],
    header: { image_url: '', title: '选择你的装修风格', subtitle: 'CHOOSE YOUR STYLE' },
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
      // 页眉配置失败不阻塞页面，保留默认文案
      const [res, config] = await Promise.all([
        api.getStyles(),
        api.getStyleSelectConfig().catch(() => null),
      ]);
      const styles = (res || []).map(s => Object.assign({}, s, {
        cover_image: util.fullImageUrl(s.cover_image),
      }));
      const header = {
        image_url: config && config.image_url ? util.fullImageUrl(config.image_url) : '',
        title: (config && config.title) || '选择你的装修风格',
        subtitle: (config && config.subtitle) || 'CHOOSE YOUR STYLE',
      };
      const pageData = { styles, header, loading: false, error: false };
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
