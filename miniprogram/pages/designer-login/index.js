/**
 * 登录页 V2.1 — 温暖精致风
 *
 * 两种登录方式：
 *   1. 手机号登录 — 输入手机号后点击按钮登录
 *   2. 微信授权快捷登录 — getPhoneNumber 一键授权
 *
 * 协议未勾选时弹出确认框
 */
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    phone: '',
    agreeTerms: false,
    loading: false,
    quickLoginLoading: false,
    showAgreementModal: false,
  },

  _modalCallback: null,
  _pendingPhoneCode: null,

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onAgreeToggle() {
    this.setData({ agreeTerms: !this.data.agreeTerms });
  },

  onOpenAgreement() {
    wx.navigateTo({ url: '/pages/agreement/index' });
  },

  onOpenPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' });
  },

  // ═══ 弹窗事件 ═══
  noop() {},

  onModalCancel() {
    this.setData({ showAgreementModal: false });
    this._modalCallback = null;
    this._pendingPhoneCode = null;
  },

  onModalConfirm() {
    this.setData({ agreeTerms: true, showAgreementModal: false });
    var cb = this._modalCallback;
    var pendingCode = this._pendingPhoneCode;
    this._modalCallback = null;
    this._pendingPhoneCode = null;

    if (cb) {
      cb(); // 手机号登录：直接执行登录
    } else if (pendingCode) {
      // 微信登录：用已获取的 phoneCode 继续登录
      this.setData({ quickLoginLoading: true });
      this._doWechatLogin(pendingCode);
    }
  },

  // ═══ 微信手机号快捷登录 ═══
  async onGetPhoneNumber(e) {
    const phoneCode = e.detail?.code;

    // 用户拒绝授权
    if (!phoneCode) {
      this.setData({ quickLoginLoading: false });
      return;
    }

    // 未勾选协议 → 暂存 code，弹出自定义弹窗
    if (!this.data.agreeTerms) {
      this._pendingPhoneCode = phoneCode;
      this.setData({ showAgreementModal: true });
      return;
    }

    // 已勾选 → 直接登录
    this.setData({ quickLoginLoading: true });
    this._doWechatLogin(phoneCode);
  },

  /** 执行微信手机号登录 API */
  async _doWechatLogin(phoneCode) {
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
      } else {
        wx.showToast({ title: msg, icon: 'none', duration: 2500 });
      }
    } finally {
      this.setData({ quickLoginLoading: false });
    }
  },

  // ═══ 手机号登录 ═══
  onLogin() {
    if (this.data.loading) return;

    var phone = (this.data.phone || '').trim();
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    if (!this.data.agreeTerms) {
      var that = this;
      this._modalCallback = function () {
        that.doPhoneLogin();
      };
      this.setData({ showAgreementModal: true });
      return;
    }

    this.doPhoneLogin();
  },

  /** 执行手机号登录 */
  async doPhoneLogin() {
    var phone = (this.data.phone || '').trim();

    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
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
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(function () {
        if (hasSetup) {
          wx.switchTab({ url: '/pages/mine/index' });
        } else {
          wx.redirectTo({ url: '/pages/designer-center/index' });
        }
      }, 800);
    } else if (personnelType === 'design_director') {
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
    } else if (personnelType === 'engineer') {
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
    } else if (personnelType === 'engineering_director') {
      wx.showToast({ title: '登录成功', icon: 'success' });
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
