// VR 全景看房 — web-view 加载自有域名中转页，中转页内嵌酷家乐
const { BASE_URL } = require('../../utils/constants');

Page({
  data: { src: '' },

  onLoad(options) {
    let raw = options.u || '';
    // 各端对 query 是否自动 decode 行为不一，统一先 decode 再 encode
    try { raw = decodeURIComponent(raw); } catch (e) { /* 保持原值 */ }
    if (!raw || raw.indexOf('kujiale.com') === -1) {
      wx.showToast({ title: '链接无效', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ src: BASE_URL + '/vr.html?u=' + encodeURIComponent(raw) });
  },
});
