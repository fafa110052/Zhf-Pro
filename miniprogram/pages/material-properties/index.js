/**
 * 楼盘筛选页 — 在线选材入口
 *
 * 展示所有已开通选材功能的楼盘列表，支持关键词搜索
 * 点击楼盘 → 进入该楼盘的专属选材页面
 */
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    properties: [],
    keyword: '',
    loading: true,
    error: false,
    ready: false,
  },

  onLoad() {
    this.loadProperties();
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  onPullDownRefresh() {
    this.loadProperties().then(() => wx.stopPullDownRefresh());
  },

  /** 加载已开通选材的楼盘列表 */
  async loadProperties() {
    this.setData({ loading: true, error: false, ready: false });

    try {
      const result = await api.getProperties(this.data.keyword || undefined);
      const list = (result.list || []).map(function (item) {
        return {
          id: item.id,
          name: item.name,
          address: item.address,
          cover_url: util.fullImageUrl(item.cover_image),
        };
      });

      const pageData = { properties: list, loading: false };
      if (this._readyFired) {
        this.setData(Object.assign({ ready: true }, pageData));
      } else {
        this._pageData = pageData;
      }
    } catch (err) {
      console.error('加载楼盘列表失败:', err);
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  /** 搜索输入 */
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  /** 搜索确认 */
  onSearchConfirm() {
    this.loadProperties();
  },

  /** 清除搜索 */
  onClearSearch() {
    this.setData({ keyword: '' });
    this.loadProperties();
  },

  /** 点击楼盘 → 跳转选材页 */
  onPropertyTap(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/material-selection/index?propertyId=${id}&propertyName=${name}`,
    });
  },

  /** 点击重试 */
  onRetry() {
    this.loadProperties();
  },
});
