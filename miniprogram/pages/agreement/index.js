/**
 * 用户协议页
 */
Page({
  data: {},

  onLoad() {
    wx.setNavigationBarTitle({ title: '用户协议' });
  },

  onBack() {
    wx.navigateBack();
  },
});
