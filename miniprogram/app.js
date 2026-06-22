/**
 * 住好房装修展示平台 — 小程序入口
 *
 * 全局状态：
 *   - userInfo: 当前用户信息（null = 未登录）
 *   - token: JWT 令牌
 *   - role: 用户角色（guest | designer | admin，null = 未登录）
 */
const { checkLogin } = require('./utils/api');

App({
  globalData: {
    userInfo: null,       // 用户信息对象
    token: null,           // JWT token
    role: null,            // guest | designer | admin
    // baseUrl: 'http://localhost:3000',  // 本地模拟器
    baseUrl: 'http://192.168.1.8:3000',  // 真机测试（与 constants.js 保持一致）
    isOnline: true,       // 网络状态
  },

  onLaunch() {
    // ── 监听网络状态变化 ──
    var that = this;
    wx.onNetworkStatusChange(function (res) {
      that.globalData.isOnline = res.isConnected;
      if (!res.isConnected) {
        wx.showToast({ title: '网络连接已断开', icon: 'none', duration: 2000 });
      }
    });

    // 恢复登录态
    var token = wx.getStorageSync('token');
    var userInfo = wx.getStorageSync('userInfo');

    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.role = userInfo.role || null;

      // 异步校验 token 有效性
      // 记录发起校验时的 token，防止竞态条件：用户重新登录后旧校验结果清掉新登录态
      var tokenAtCheck = token;
      checkLogin().then(function (valid) {
        // 仅当 token 未被替换时才清理（用户可能已重新登录）
        if (!valid && this.globalData.token === tokenAtCheck) {
          this.clearLogin();
        }
      }.bind(this)).catch(function () {
        // 网络错误不强制登出
      });
    }
  },

  /**
   * 是否已登录（含游客）
   */
  isLoggedIn() {
    return !!(this.globalData.token && this.globalData.userInfo);
  },

  /**
   * 是否为设计师
   */
  isDesigner() {
    return this.globalData.role === 'designer';
  },

  /**
   * 是否为游客
   */
  isGuest() {
    return this.globalData.role === 'guest';
  },

  /**
   * 是否为业主
   */
  isOwner() {
    return this.globalData.role === 'owner';
  },

  /** V1.3 — 是否为设计师（personnel_type） */
  isDesignerPersonnel() {
    return this.globalData.userInfo && this.globalData.userInfo.personnel_type === 'designer';
  },

  /** V1.3 — 是否为设计总监 */
  isDesignDirector() {
    return this.globalData.userInfo && this.globalData.userInfo.personnel_type === 'design_director';
  },

  /** V1.3 — 是否为工程师 */
  isEngineer() {
    return this.globalData.userInfo && this.globalData.userInfo.personnel_type === 'engineer';
  },

  /** V1.3 — 是否为工程总监 */
  isEngineeringDirector() {
    return this.globalData.userInfo && this.globalData.userInfo.personnel_type === 'engineering_director';
  },

  /**
   * 保存登录信息
   */
  setLogin(userInfo, token) {
    var role = userInfo.role || 'guest';
    this.globalData.userInfo = userInfo;
    this.globalData.token = token;
    this.globalData.role = role;
    this.globalData.personnelType = userInfo.personnel_type || null;

    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
  },

  /**
   * 清除登录态
   */
  clearLogin() {
    this.globalData.userInfo = null;
    this.globalData.token = null;
    this.globalData.role = null;

    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  },

  /**
   * 获取全局数据
   */
  getGlobal(key) {
    return this.globalData[key];
  },
});
