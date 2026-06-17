/**
 * 我的页面
 *
 * 三种状态：
 *   未登录 → 显示登录入口
 *   已登录（游客）→ 显示个人信息 + 基础菜单
 *   已登录（设计师）→ 显示个人信息 + 统计 + 设计师菜单
 */
var app = getApp();
var api = require('../../utils/api');
var util = require('../../utils/util');

Page({
  data: {
    isLoggedIn: false,
    isDesigner: false,
    isGuest: false,
    isOwner: false,
    isDesignDirector: false,
    isEngineer: false,
    isEngineeringDirector: false,
    personnelType: null,
    taskCount: 0,
    userInfo: null,
    stats: null,
    statsText: null,
    loading: true,
  },

  onShow() {
    this.refreshState();
  },

  onPullDownRefresh() {
    this.refreshState().then(function () {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 刷新登录状态和用户数据
   */
  async refreshState() {
    var loggedIn = app.isLoggedIn();
    if (!loggedIn) {
      this.setData({
        isLoggedIn: false,
        isDesigner: false,
        isGuest: false,
        isOwner: false,
        loading: false,
      });
      return;
    }

    var isDesigner = app.isDesigner();
    var isGuest = app.isGuest();
    var isOwner = app.isOwner();
    var isDesignDirector = app.isDesignDirector();
    var isEngineer = app.isEngineer();
    var isEngineeringDirector = app.isEngineeringDirector();
    var personnelType = app.globalData.personnelType || null;

    // 从服务端拉取最新数据（含头像审核状态）
    var userInfo = app.globalData.userInfo;
    if (isDesigner) {
      try {
        var profile = await api.getDesignerProfile();
        // 头像审核：优先显示待审核头像
        var displayAvatar = profile.pending_avatar_url && profile.avatar_review_status === 'pending'
          ? profile.pending_avatar_url
          : profile.avatar_url;
        userInfo = {
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          avatar_url: util.fullImageUrl(displayAvatar),
          pending_avatar_url: util.fullImageUrl(profile.pending_avatar_url),
          avatar_review_status: profile.avatar_review_status,
          bio: profile.bio || '',
          years_of_exp: profile.years_of_exp || 0,
          status: profile.status,
          role: profile.role,
        };
        // 同步到全局
        app.globalData.userInfo = userInfo;
        app.globalData.role = userInfo.role;
        wx.setStorageSync('userInfo', userInfo);
      } catch (err) {
        console.error('刷新个人信息失败:', err);
        userInfo = app.globalData.userInfo;
      }
    }

    // 业主：拉取个人资料（含楼盘信息）
    if (isOwner) {
      try {
        var profile = await api.getDesignerProfile();
        userInfo = Object.assign({}, app.globalData.userInfo, {
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          avatar_url: util.fullImageUrl(profile.avatar_url),
          role: profile.role,
          property_name: profile.property_name || '未分配',
          building: profile.building || '',
          room: profile.room || '',
        });
        app.globalData.userInfo = userInfo;
        wx.setStorageSync('userInfo', userInfo);
      } catch (err) {
        console.error('刷新业主信息失败:', err);
        userInfo = app.globalData.userInfo;
      }
    }

    this.setData({
      isLoggedIn: true,
      isDesigner: isDesigner,
      isGuest: isGuest,
      isOwner: isOwner,
      isDesignDirector: isDesignDirector,
      isEngineer: isEngineer,
      isEngineeringDirector: isEngineeringDirector,
      personnelType: personnelType,
      userInfo: userInfo,
      loading: true,
    });

    // 仅设计师加载统计数据
    if (isDesigner) {
      try {
        var stats = await api.getMyStats();
        this.setData({
          stats: stats,
          statsText: formatStats(stats),
        });
      } catch (err) {
        console.error('加载统计数据失败:', err);
        var msg = err.message || '';
        if (msg.indexOf('401') !== -1 || msg.indexOf('403') !== -1) {
          app.clearLogin();
          this.setData({
            isLoggedIn: false,
            isDesigner: false,
            isGuest: false,
          });
        }
        // 权限不足时静默处理（游客调设计师接口会 403）
      }
    }

    // V1.3 施工角色 — 获取待办数
    if (isDesignDirector || isEngineer || isEngineeringDirector || isDesigner) {
      try {
        var taskRes = null;
        if (isDesigner) taskRes = await api.getDesignerPhases();
        else if (isDesignDirector) taskRes = await api.getDesignDirectorPhases();
        else if (isEngineer) taskRes = await api.getEngineerPhases();
        else if (isEngineeringDirector) taskRes = await api.getEngineeringDirectorPhases();
        this.setData({ taskCount: (taskRes && taskRes.list) ? taskRes.list.length : 0 });
      } catch (_) { /* 静默 */ }
    }

    this.setData({ loading: false });
  },

  /** 跳转登录页 */
  onGoLogin() {
    wx.navigateTo({ url: '/pages/designer-login/index' });
  },

  /** 跳转设计师中心 */
  onGoDesignerCenter() {
    wx.navigateTo({ url: '/pages/designer-center/index' });
  },

  /** 跳转作品管理 */
  onGoWorks() {
    wx.navigateTo({ url: '/pages/work-manage/index' });
  },

  /** 申请成为设计师 */
  onApplyDesigner() {
    wx.showModal({
      title: '申请设计师',
      content: '请联系管理员将您的账号升级为设计师，客服电话：400-000-0000',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  /** 退出登录 */
  onLogout() {
    var that = this;
    util.showConfirm('确定要退出登录吗？', '提示').then(function (ok) {
      if (ok) {
        app.clearLogin();
        that.setData({
          isLoggedIn: false,
          isDesigner: false,
          isGuest: false,
          userInfo: null,
          stats: null,
          statsText: null,
        });
        wx.showToast({ title: '已退出', icon: 'success' });
      }
    });
  },

  /** 我的选材申请 */
  onGoMaterialOrders() {
    wx.navigateTo({ url: '/pages/material-orders/index' });
  },

  // V1.3 施工角色导航
  onGoDesignerTasks() { wx.navigateTo({ url: '/pages/designer-tasks/index' }); },
  onGoDesignDirectorReviews() { wx.navigateTo({ url: '/pages/design-director-reviews/index' }); },
  onGoEngineerTasks() { wx.navigateTo({ url: '/pages/engineer-tasks/index' }); },
  onGoEngineeringDirectorReviews() { wx.navigateTo({ url: '/pages/engineering-director-reviews/index' }); },
  onGoMyProjects() { wx.navigateTo({ url: '/pages/material-orders/index' }); },

  /** 联系客服 */
  onContact() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-000-0000\n工作时间：9:00-18:00',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});

/** 格式化统计数据 */
function formatStats(stats) {
  return [
    { label: '作品', value: stats.total || 0 },
    { label: '已通过', value: stats.approved || 0 },
    { label: '审核中', value: stats.pending || 0 },
    { label: '浏览量', value: util.formatNumber(stats.total_views) },
  ];
}
