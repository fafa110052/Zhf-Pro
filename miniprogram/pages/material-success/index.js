/**
 * 提交成功页
 *
 * 显示订单号和状态，提供后续操作入口
 */
Page({
  data: {
    orderNo: '',
    status: 'pending',
  },

  onLoad(options) {
    this.setData({
      orderNo: options.orderNo || '',
      status: options.status || 'pending',
    });
  },

  /** 查看我的申请 */
  onViewOrders() {
    wx.navigateTo({ url: '/pages/material-orders/index' });
  },

  /** 返回首页 */
  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  /** 继续选材 */
  onContinueSelect() {
    wx.switchTab({ url: '/pages/material-properties/index' });
  },
});
