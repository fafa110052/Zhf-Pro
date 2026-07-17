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

  // VR 看房：酷家乐链接跳全景720小程序；其他平台链接复制后引导浏览器打开
  onTapVR(e) {
    const vrUrl = e.currentTarget.dataset.url;
    if (!vrUrl) return;
    if (vrUrl.indexOf('kujiale.com') > -1) {
      wx.navigateToMiniProgram({
        appId: 'wxc2d8d319dfc12a95',
        path: 'pages/design-detail/pano/pano?url=' + encodeURIComponent(vrUrl),
        envVersion: 'release',
        fail() {
          wx.showToast({ title: '打开失败，请稍后重试', icon: 'none' });
        },
      });
      return;
    }
    wx.setClipboardData({
      data: vrUrl,
      success() {
        wx.showModal({
          title: 'VR看房',
          content: 'VR链接已复制，请打开手机浏览器，粘贴到地址栏观看全景',
          showCancel: false,
          confirmText: '知道了',
        });
      },
    });
  },
});
