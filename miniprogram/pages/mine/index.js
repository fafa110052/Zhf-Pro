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

    // isDesigner 现在只指 personnel_type === 'designer'（实际设计师岗位）
    var isDesigner = app.isDesignerPersonnel();
    var isGuest = app.isGuest();
    var isOwner = app.isOwner();
    var isDesignDirector = app.isDesignDirector();
    var isEngineer = app.isEngineer();
    var isEngineeringDirector = app.isEngineeringDirector();
    var isEmployee = app.isDesigner(); // role === 'designer' — 所有员工（含设计师/设计总监/工程师/工程总监）
    var personnelType = app.globalData.personnelType || null;

    // 从服务端拉取最新数据（所有员工角色）
    var userInfo = app.globalData.userInfo;
    if (isEmployee) {
      try {
        var profile = await api.getDesignerProfile({ silent: true });
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
          personnel_type: profile.personnel_type,
        };
        app.globalData.userInfo = userInfo;
        app.globalData.role = userInfo.role;
        app.globalData.personnelType = userInfo.personnel_type;
        wx.setStorageSync('userInfo', userInfo);
      } catch (err) {
        console.error('刷新个人信息失败:', err);
        userInfo = app.globalData.userInfo;
      }
    }

    // 业主：拉取个人资料（含楼盘信息）
    if (isOwner) {
      try {
        var ownerProfile = await api.getDesignerProfile({ silent: true });
        userInfo = Object.assign({}, app.globalData.userInfo, {
          id: ownerProfile.id,
          name: ownerProfile.name,
          phone: ownerProfile.phone,
          avatar_url: util.fullImageUrl(ownerProfile.avatar_url),
          role: ownerProfile.role,
          property_name: ownerProfile.property_name || '未分配',
          building: ownerProfile.building || '',
          room: ownerProfile.room || '',
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

    // 仅设计师（personnel_type=designer）加载统计数据
    // isDesigner 不包括业主（即使 personnel_type 误设，role 优先）
    if (isDesigner && !isOwner) {
      try {
        var stats = await api.getMyStats({ silent: true });
        this.setData({
          stats: stats,
          statsText: formatStats(stats),
        });
      } catch (err) {
        console.error('加载统计数据失败:', err);
      }
    }

    // V1.3 施工角色 — 获取待办数（仅进行中）
    // isEmployee 已排除业主（role !== 'designer'），此处加 isOwner 双重保险
    if (isEmployee && !isOwner) {
      try {
        var taskRes = null;
        if (isDesigner) taskRes = await api.getDesignerPhases({ silent: true });
        else if (isDesignDirector) taskRes = await api.getDesignDirectorPhases({ silent: true });
        else if (isEngineer) taskRes = await api.getEngineerPhases({ silent: true });
        else if (isEngineeringDirector) taskRes = await api.getEngineeringDirectorPhases({ silent: true });
        var allList = (taskRes && taskRes.list) ? taskRes.list : [];
        var activeList = allList.filter(function(item) { return isActivePhase(item.status); });
        this.setData({ taskCount: activeList.length });
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

  // V1.3 施工角色导航 — mode=active（进行中）/ mode=all（全部项目）
  onGoDesignerTasks() { wx.navigateTo({ url: '/pages/designer-tasks/index?mode=active' }); },
  onGoDesignDirectorReviews() { wx.navigateTo({ url: '/pages/design-director-reviews/index?mode=active' }); },
  onGoEngineerTasks() { wx.navigateTo({ url: '/pages/engineer-tasks/index?mode=active' }); },
  onGoEngineeringDirectorReviews() { wx.navigateTo({ url: '/pages/engineering-director-reviews/index?mode=active' }); },
  onGoMyProjects() {
    if (this.data.isDesigner) wx.navigateTo({ url: '/pages/designer-tasks/index?mode=all' });
    else if (this.data.isDesignDirector) wx.navigateTo({ url: '/pages/design-director-reviews/index?mode=all' });
    else if (this.data.isEngineer) wx.navigateTo({ url: '/pages/engineer-tasks/index?mode=all' });
    else if (this.data.isEngineeringDirector) wx.navigateTo({ url: '/pages/engineering-director-reviews/index?mode=all' });
  },

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

/** 是否进行中（未验收、未驳回） */
function isActivePhase(status) {
  return ![
    'owner_accepted',
    'design_director_rejected', 'design_admin_rejected',
    'engineering_director_rejected', 'construction_admin_rejected',
    'owner_design_disputed', 'owner_disputed',
  ].includes(status);
}
