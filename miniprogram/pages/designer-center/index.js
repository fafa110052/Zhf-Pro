/**
 * 设计师中心
 *
 * 功能：
 *   1. 个人信息展示（从服务端实时拉取）
 *   2. 编辑资料（头像/姓名/手机/简介/经验）
 *   3. 数据概览
 *   4. 快捷入口（管理作品 / 上传作品）
 */
const app = getApp();
const { getMyStats, getDesignerProfile } = require('../../utils/api');
const { formatNumber, fullImageUrl, formatTime, showConfirm } = require('../../utils/util');
const http = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    stats: {
      total: 0,
      approved: 0,
      pending: 0,
      total_views: 0,
    },
    // 格式化后的统计
    statsText: [],

    // 编辑模式
    editing: false,
    editForm: {},
    saving: false,
  },

  onShow() {
    // 角色守卫：仅设计师可访问
    if (!app.isDesigner()) {
      wx.showToast({ title: '仅设计师可访问', icon: 'none' });
      setTimeout(function () {
        wx.switchTab({ url: '/pages/mine/index' });
      }, 1000);
      return;
    }

    this.loadProfile();
    this.loadStats();
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    try {
      await Promise.all([this.loadProfile(), this.loadStats()]);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 从服务端拉取最新个人信息
   */
  async loadProfile() {
    try {
      const profile = await getDesignerProfile();
      // 头像审核：如果存在待审核头像则优先显示，否则显示已通过的头像
      const displayAvatar = profile.pending_avatar_url && profile.avatar_review_status === 'pending'
        ? profile.pending_avatar_url
        : profile.avatar_url;
      const userInfo = {
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        avatar_url: fullImageUrl(displayAvatar),
        pending_avatar_url: fullImageUrl(profile.pending_avatar_url),
        avatar_review_status: profile.avatar_review_status,
        bio: profile.bio || '',
        years_of_exp: profile.years_of_exp || 0,
        status: profile.status,
        created_at: profile.created_at,
        openid: profile.openid,
        role: profile.role,
      };
      // 同步到全局（含角色，确保管理员后台变更后小程序端即时生效）
      app.globalData.userInfo = userInfo;
      app.globalData.role = userInfo.role;
      wx.setStorageSync('userInfo', userInfo);

      this.setData({ userInfo });
    } catch (err) {
      console.error('个人信息加载失败:', err);
      // 降级：使用缓存数据
      const cached = app.globalData.userInfo;
      if (cached) {
        this.setData({ userInfo: cached });
      }
    }
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const stats = await getMyStats();
      this.setData({
        stats: {
          total: stats.total || 0,
          approved: stats.approved || 0,
          pending: stats.pending || 0,
          total_views: stats.total_views || 0,
        },
        statsText: [
          { label: '总作品', value: stats.total || 0, color: 'text-primary' },
          { label: '已通过', value: stats.approved || 0, color: 'text-success' },
          { label: '审核中', value: stats.pending || 0, color: 'text-warning' },
          { label: '总浏览', value: formatNumber(stats.total_views), color: 'text-accent' },
        ],
      });
    } catch (err) {
      console.error('统计加载失败:', err);
    }
  },

  /**
   * 进入编辑模式
   */
  onEdit() {
    const { userInfo } = this.data;
    const bio = userInfo.bio || '';
    this.setData({
      editing: true,
      editForm: {
        name: userInfo.name || '',
        phone: userInfo.phone || '',
        bio: bio,
        years_of_exp: userInfo.years_of_exp || 0,
        avatar_url: userInfo.avatar_url || '',
        bioLength: bio.length,
      },
    });
  },

  /**
   * 取消编辑
   */
  onCancelEdit() {
    this.setData({ editing: false, editForm: {} });
  },

  /**
   * 表单字段变更
   */
  onFieldChange(e) {
    const { field } = e.currentTarget.dataset;
    const update = { [`editForm.${field}`]: e.detail.value };
    // 当简介字段变化时同步更新字数
    if (field === 'bio') {
      update['editForm.bioLength'] = e.detail.value.length;
    }
    this.setData(update);
  },

  /**
   * 选择头像
   */
  onChooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFilePaths[0];
        try {
          const { uploadImage } = require('../../utils/api');
          const result = await uploadImage(filePath);
          this.setData({
            ['editForm.avatar_url']: result.image_url,
          });
          wx.showToast({ title: '头像已更新', icon: 'success' });
        } catch (err) {
          wx.showToast({ title: '头像上传失败', icon: 'none' });
        }
      },
    });
  },

  /**
   * 保存资料
   */
  async onSave() {
    const { editForm } = this.data;

    // 校验
    if (!editForm.name || !editForm.name.trim()) {
      wx.showToast({ title: '姓名不能为空', icon: 'none' });
      return;
    }
    if (editForm.phone && !/^1[3-9]\d{9}$/.test(editForm.phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    try {
      await http.put('/designer/profile', editForm, { auth: true });

      // 重新拉取服务端数据（确保一致性）
      await this.loadProfile();

      this.setData({
        editing: false,
        saving: false,
      });

      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      this.setData({ saving: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  /**
   * 快捷入口 — 管理作品
   */
  onGoWorks() {
    wx.navigateTo({ url: '/pages/work-manage/index' });
  },

  /**
   * 快捷入口 — 施工任务
   */
  onGoTasks() {
    wx.navigateTo({ url: '/pages/designer-tasks/index' });
  },

  /**
   * 快捷入口 — 上传新作品
   */
  onGoUpload() {
    wx.navigateTo({ url: '/pages/work-upload/index' });
  },

  /**
   * 预览头像大图
   */
  onPreviewAvatar() {
    const { userInfo } = this.data;
    if (userInfo && userInfo.avatar_url) {
      wx.previewImage({
        urls: [userInfo.avatar_url],
        current: userInfo.avatar_url,
      });
    }
  },
});
