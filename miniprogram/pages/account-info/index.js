/**
 * 账号信息页
 * 展示手机号、角色，入口到注销账号
 */
var app = getApp();

Page({
  data: {
    phone: '',
    roleLabel: '',
    ready: false,
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData({ ready: true, ...this._pageData });
    }
  },

  onShow() {
    this.loadInfo();
  },

  loadInfo() {
    var user = app.globalData.userInfo || {};
    var phone = user.phone || '';
    var roleLabel = this.getRoleLabel(user.role);
    var pageData = { phone: phone, roleLabel: roleLabel };
    if (this._readyFired) {
      this.setData({ ready: true, ...pageData });
    } else {
      this._pageData = pageData;
    }
  },

  getRoleLabel(role) {
    var map = {
      owner: '业主',
      designer: '设计师',
      design_director: '设计总监',
      engineer: '工程师',
      engineering_director: '工程总监',
      guest: '游客',
    };
    return map[role] || role || '未知';
  },

  /** 跳转注销账号 */
  onGoCancelAccount() {
    wx.navigateTo({ url: '/pages/account-cancel/index' });
  },
});
