/**
 * 登录页 V2.0 — 温暖精致风
 *
 * 两种登录方式并排展示：
 *   1. 微信授权快捷登录 — getPhoneNumber 一键授权
 *   2. 手机号手动登录 — 点击展开输入区
 *
 * 协议未勾选时按钮置灰不可用
 */
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    phone: '',
    agreeTerms: false,
    loading: false,
    quickLoginLoading: false,
    showPhoneInput: false,
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onAgreeToggle() {
    this.setData({ agreeTerms: !this.data.agreeTerms });
  },

  /** 展开/收起手机号输入区 */
  onTogglePhone() {
    if (!this.data.agreeTerms) return;
    this.setData({ showPhoneInput: !this.data.showPhoneInput });
  },

  onOpenAgreement() {
    wx.navigateTo({ url: '/pages/agreement/index' });
  },

  onOpenPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' });
  },

  // ═══ 微信手机号快捷登录 ═══
  async onGetPhoneNumber(e) {
    if (this.data.quickLoginLoading) return;

    if (!this.data.agreeTerms) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }

    const phoneCode = e.detail?.code;
    if (!phoneCode) {
      const errMsg = e.detail?.errMsg || '';
      if (errMsg.indexOf('deny') !== -1 || errMsg.indexOf('cancel') !== -1) {
        this.setData({ showPhoneInput: true });
      } else {
        wx.showToast({ title: '获取手机号失败，请尝试手动输入', icon: 'none', duration: 2000 });
        this.setData({ showPhoneInput: true });
      }
      return;
    }

    this.setData({ quickLoginLoading: true });

    try {
      let wxCode = null;
      try {
        const loginRes = await new Promise((resolve, reject) => {
          wx.login({ success: resolve, fail: reject, timeout: 5000 });
        });
        wxCode = loginRes.code;
      } catch (wxErr) {
        console.warn('wx.login 失败:', wxErr);
        throw new Error('微信登录失败，请尝试手动输入');
      }

      const result = await api.wechatPhoneLogin(wxCode, phoneCode);
      this._handleLoginSuccess(result);
    } catch (err) {
      console.error('快捷登录失败:', err);
      const msg = err.message || '登录失败';
      if (err.status === 501 || msg.indexOf('AppID') !== -1 || msg.indexOf('配置') !== -1) {
        wx.showToast({ title: '快捷登录暂不可用，请手动输入手机号', icon: 'none', duration: 2500 });
        this.setData({ showPhoneInput: true });
      } else if (msg.indexOf('拒绝') !== -1) {
        this.setData({ showPhoneInput: true });
      } else {
        wx.showToast({ title: msg, icon: 'none', duration: 2500 });
      }
    } finally {
      this.setData({ quickLoginLoading: false });
    }
  },

  // ═══ 手动手机号登录 ═══
  async onLogin() {
    var phone = this.data.phone;
    var agreeTerms = this.data.agreeTerms;

    if (this.data.loading) return;

    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    if (!agreeTerms) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      var result;
      var code = null;
      try {
        var loginRes = await new Promise(function (resolve, reject) {
          wx.login({ success: resolve, fail: reject, timeout: 5000 });
        });
        code = loginRes.code;
      } catch (wxErr) {
        console.warn('wx.login 失败，使用开发模式:', wxErr);
      }

      if (code) {
        result = await api.designerLogin(code, phone);
      } else {
        result = await api.designerLoginDev(phone);
      }

      this._handleLoginSuccess(result);
    } catch (err) {
      console.error('登录失败:', err);
      var msg = err.message || '登录失败，请重试';
      if (msg.indexOf('网络异常') !== -1 || msg.indexOf('超时') !== -1) {
        wx.showToast({ title: '网络异常，请检查网络连接后重试', icon: 'none', duration: 3000 });
      } else if (msg.indexOf('手机号') !== -1) {
        wx.showToast({ title: msg, icon: 'none', duration: 2500 });
      } else {
        wx.showToast({ title: '登录失败，请确认手机号后重试', icon: 'none', duration: 2500 });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  // ═══ 登录成功处理 ═══
  _handleLoginSuccess(result) {
    app.setLogin(result.user, result.token);

    var personnelType = result.user.personnel_type;
    var role = result.user.role;

    if (role === 'owner') {
      wx.showToast({ title: '业主登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
      return;
    }

    if (role === 'guest') {
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
      return;
    }

    if (personnelType === 'designer') {
      var hasSetup = wx.getStorageSync('designer_has_setup');
      wx.showToast({ title: '设计师登录成功', icon: 'success' });
      setTimeout(function () {
        if (hasSetup) {
          wx.switchTab({ url: '/pages/mine/index' });
        } else {
          wx.redirectTo({ url: '/pages/designer-center/index' });
        }
      }, 800);
    } else if (personnelType === 'design_director') {
      wx.showToast({ title: '设计总监登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
    } else if (personnelType === 'engineer') {
      wx.showToast({ title: '工程师登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
    } else if (personnelType === 'engineering_director') {
      wx.showToast({ title: '工程总监登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
    } else {
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(function () {
        var pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/mine/index' });
        }
      }, 800);
    }
  },
});
