/**
 * 注销账号页（仅游客 / 业主可达）
 * 合规流程：二次确认 → 调后端匿名化注销 → 清登出并回首页
 */
var app = getApp();
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    submitting: false,
  },

  onConfirmCancel() {
    var that = this;
    util
      .showConfirm('注销后账号无法恢复，个人信息将被删除，确定继续吗？', '最终确认')
      .then(function (ok) {
        if (!ok) return;
        that.setData({ submitting: true });
        api
          .cancelAccount()
          .then(function () {
            app.clearLogin();
            app.globalData.personnelType = null; // clearLogin 不清该字段，补清防残留
            wx.showToast({ title: '账号已注销', icon: 'success' });
            setTimeout(function () {
              wx.reLaunch({ url: '/pages/index/index' });
            }, 1200);
          })
          .catch(function () {
            // 错误提示由 request.js 统一弹出
            that.setData({ submitting: false });
          });
      });
  },

  onBack() {
    wx.navigateBack();
  },
});
