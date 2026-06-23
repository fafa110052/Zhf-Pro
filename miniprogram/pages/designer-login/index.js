/**
 * 设计师登录页
 *
 * 两种登录方式：
 *   1. 微信手机号快捷登录（推荐）— getPhoneNumber 授权
 *   2. 手机号手动登录 — 开发模式 / 降级兜底
 *
 * 快捷登录流程：
 *   a. 用户勾选协议
 *   b. 点击"微信手机号快捷登录"
 *   c. 微信弹出授权弹窗 → 用户同意
 *   d. 获取 wx.login code + phone code
 *   e. 后端调微信接口解密手机号 → 返回 token
 *   f. 若微信未配置 AppID → 降级为手动输入
 */
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    phone: '',
    agreeTerms: false,
    loading: false,
    quickLoginLoading: false,
    devMode: true,
    showManual: false, // 是否展开手动输入区域
  },

  /**
   * 手机号输入
   */
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  /**
   * 同意协议切换
   */
  onAgreeToggle() {
    this.setData({ agreeTerms: !this.data.agreeTerms });
  },

  /**
   * 展开/收起手动输入
   */
  onToggleManual() {
    this.setData({ showManual: !this.data.showManual });
  },

  /**
   * 跳转用户协议页
   */
  onOpenAgreement(e) {
    wx.navigateTo({ url: '/pages/agreement/index' });
  },

  /**
   * 跳转隐私政策页
   */
  onOpenPrivacy(e) {
    wx.navigateTo({ url: '/pages/privacy/index' });
  },

  /**
   * ═══════════════════════════════════════════
   * 微信手机号快捷登录
   * ═══════════════════════════════════════════
   */
  async onGetPhoneNumber(e) {
    // 已在使用中
    if (this.data.quickLoginLoading) return;

    // 再次确认协议
    if (!this.data.agreeTerms) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }

    const phoneCode = e.detail?.code;
    if (!phoneCode) {
      // 用户拒绝授权或 getPhoneNumber 失败
      const errMsg = e.detail?.errMsg || '';
      if (errMsg.indexOf('deny') !== -1 || errMsg.indexOf('cancel') !== -1) {
        // 用户主动拒绝，不提示错误，展开手动输入
        this.setData({ showManual: true });
      } else {
        wx.showToast({ title: '获取手机号失败，请尝试手动输入', icon: 'none', duration: 2000 });
        this.setData({ showManual: true });
      }
      return;
    }

    this.setData({ quickLoginLoading: true });

    try {
      // 1. wx.login 获取登录凭证
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

      // 2. 调后端快捷登录接口
      const result = await api.wechatPhoneLogin(wxCode, phoneCode);

      // 3. 存储登录态
      this._handleLoginSuccess(result);
    } catch (err) {
      console.error('快捷登录失败:', err);
      const msg = err.message || '登录失败';

      // 微信未配置 → 降级手动
      if (err.status === 501 || msg.indexOf('AppID') !== -1 || msg.indexOf('配置') !== -1) {
        wx.showToast({ title: '快捷登录暂不可用，请手动输入手机号', icon: 'none', duration: 2500 });
        this.setData({ showManual: true });
      } else if (msg.indexOf('拒绝') !== -1) {
        // 用户拒绝，静默降级
        this.setData({ showManual: true });
      } else {
        wx.showToast({ title: msg, icon: 'none', duration: 2500 });
      }
    } finally {
      this.setData({ quickLoginLoading: false });
    }
  },

  /**
   * ═══════════════════════════════════════════
   * 手动手机号登录（开发模式 / 降级兜底）
   * ═══════════════════════════════════════════
   */
  async onLogin() {
    var phone = this.data.phone;
    var agreeTerms = this.data.agreeTerms;

    if (this.data.loading) return;

    // ── 校验 ──
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

      // 尝试微信登录获取 code
      var code = null;
      try {
        var loginRes = await new Promise(function (resolve, reject) {
          wx.login({
            success: resolve,
            fail: reject,
            timeout: 5000,
          });
        });
        code = loginRes.code;
      } catch (wxErr) {
        console.warn('wx.login 失败，使用开发模式:', wxErr);
      }

      if (code) {
        // 正式流程：code 传给后端换取 openid
        result = await api.designerLogin(code, phone);
      } else {
        // 开发模式兜底：仅用手机号登录
        result = await api.designerLoginDev(phone);
      }

      // ── 存储登录态 ──
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

  /**
   * ═══════════════════════════════════════════
   * 登录成功处理
   * ═══════════════════════════════════════════
   */
  _handleLoginSuccess(result) {
    app.setLogin(result.user, result.token);

    var personnelType = result.user.personnel_type;
    var role = result.user.role;

    // 业主 → 我的页面
    if (role === 'owner') {
      wx.showToast({ title: '业主登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
      return;
    }

    // 游客 → 直接去我的页面，不区分 personnel_type
    if (role === 'guest') {
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(function () { wx.switchTab({ url: '/pages/mine/index' }); }, 800);
      return;
    }

    // 员工（role === 'designer'）→ 按岗位分流
    if (personnelType === 'designer') {
      // 设计师：首次 → 设计师中心，后续 → 我的
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

  /**
   * 返回
   */
  onBack() {
    var pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/mine/index' });
    }
  },
});
