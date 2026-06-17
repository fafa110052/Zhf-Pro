/**
 * 楼盘筛选页 — 在线选材入口
 *
 * 展示所有已开通选材功能的楼盘列表，支持关键词搜索
 * 点击楼盘 → 进入该楼盘的专属选材页面
 */
const api = require('../../utils/api');

Page({
  data: {
    properties: [],
    keyword: '',
    loading: true,
    error: false,
  },

  onLoad() {
    this.loadProperties();
  },

  onPullDownRefresh() {
    this.loadProperties().then(() => wx.stopPullDownRefresh());
  },

  /** 加载已开通选材的楼盘列表 */
  async loadProperties() {
    this.setData({ loading: true, error: false });

    try {
      const result = await api.getProperties(this.data.keyword || undefined);
      this.setData({
        properties: result.list || [],
        loading: false,
      });
    } catch (err) {
      console.error('加载楼盘列表失败:', err);
      this.setData({ loading: false, error: true });
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
