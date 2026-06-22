/**
 * 作品管理列表（设计师端）
 *
 * 功能：
 *   1. 状态Tab筛选（全部/草稿/审核中/已通过/已驳回）
 *   2. 作品列表 + 状态标签
 *   3. 编辑/删除/提交审核操作
 *   4. 下拉刷新
 */
var app = getApp();
var { getMyWorks, deleteWork, submitWork } = require('../../utils/api');
var { fullImageUrl, formatTime, showConfirm } = require('../../utils/util');
var { WORK_STATUS_MAP } = require('../../utils/constants');

// 渲染窗口：最多保留 60 个作品节点，超出自动回收
var MAX_RENDERED = 60;
var EST_ITEM_HEIGHT = 220; // 管理列表单卡估算高度（px）

Page({
  data: {
    // 状态 Tab
    statusTabs: [
      { key: '', label: '全部' },
      { key: 'draft', label: '草稿' },
      { key: 'pending', label: '审核中' },
      { key: 'approved', label: '已通过' },
      { key: 'rejected', label: '已驳回' },
    ],
    activeStatus: '',

    // 作品列表
    works: [],
    page: 1,
    hasMore: true,
    loading: false,
    initialLoading: true,
    error: false,

    // 操作中
    operating: false,

    // 渲染窗口：已折叠的旧作品数
    trimmedCount: 0,
  },

  // 跟踪滚动位置（节点回收后补偿用）
  onPageScroll(e) {
    this._scrollTop = e.scrollTop;
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
    this.loadWorks(true);
  },

  onPullDownRefresh() {
    this.loadWorks(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadWorks();
    }
  },

  /**
   * 加载作品列表
   */
  async loadWorks(reset = false) {
    if (this.data.loading) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const params = { page, page_size: 20 };
      if (this.data.activeStatus) {
        params.status = this.data.activeStatus;
      }

      const result = await getMyWorks(params);
      const formatted = (result.list || []).map(function (w) {
        return {
          id: w.id,
          title: w.title,
          cover_url: fullImageUrl(w.cover_image),
          area_sqm: w.area_sqm,
          budget_min: w.budget_min,
          budget_max: w.budget_max,
          review_status: w.review_status,
          reject_reason: w.reject_reason,
          view_count: w.view_count,
          created_at: w.created_at,
          house_type_name: w.house_type_name || '',
          area_category_name: w.area_category_name || '',
          style_category_name: w.style_category_name || '',
          status_label: WORK_STATUS_MAP[w.review_status] ? WORK_STATUS_MAP[w.review_status].label : w.review_status,
          status_class: WORK_STATUS_MAP[w.review_status] ? WORK_STATUS_MAP[w.review_status].colorClass : 'tag-gray',
          created_at_text: formatTime(w.created_at, 'date'),
        };
      });

      if (reset) {
        this.setData({
          works: formatted,
          page: page + 1,
          hasMore: (result.list || []).length >= 20,
          loading: false,
          initialLoading: false,
          error: false,
          trimmedCount: 0,
        });
      } else {
        var allWorks = [...this.data.works, ...formatted];
        var trimmed = 0;
        if (allWorks.length > MAX_RENDERED) {
          trimmed = allWorks.length - MAX_RENDERED;
          allWorks = allWorks.slice(-MAX_RENDERED);
        }
        this.setData({
          works: allWorks,
          page: page + 1,
          hasMore: (result.list || []).length >= 20,
          loading: false,
          initialLoading: false,
          error: false,
          trimmedCount: (this.data.trimmedCount || 0) + trimmed,
        }, function () {
          if (trimmed > 0 && this._scrollTop > 0) {
            var compensation = trimmed * EST_ITEM_HEIGHT;
            wx.pageScrollTo({ scrollTop: Math.max(0, this._scrollTop - compensation), duration: 0 });
          }
        }.bind(this));
      }
    } catch (err) {
      console.error('作品列表加载失败:', err);
      this.setData({
        loading: false,
        initialLoading: false,
        error: reset,
      });
    }
  },

  /**
   * 切换状态 Tab
   */
  onStatusTap(e) {
    const { key } = e.currentTarget.dataset;
    if (key === this.data.activeStatus) return;
    this.setData({ activeStatus: key });
    this.loadWorks(true);
  },

  /**
   * 进入作品详情（仅已通过可查看）
   */
  onWorkTap(e) {
    const { id, status } = e.currentTarget.dataset;
    if (status !== 'approved') {
      wx.showToast({ title: '审核通过后才可查看', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/work-detail/index?id=${id}` });
  },

  /**
   * 编辑作品
   */
  onEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/work-upload/index?id=${id}` });
  },

  /**
   * 提交审核
   */
  async onSubmit(e) {
    const { id } = e.currentTarget.dataset;
    const confirmed = await showConfirm('提交后管理员将进行审核，确定提交？', '提交审核');
    if (!confirmed) return;

    try {
      await submitWork(id);
      wx.showToast({ title: '已提交审核', icon: 'success' });
      this.loadWorks(true);
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },

  /**
   * 删除作品
   */
  async onDelete(e) {
    const { id } = e.currentTarget.dataset;
    const confirmed = await showConfirm('删除后不可恢复，确定删除？', '删除作品');
    if (!confirmed) return;

    try {
      await deleteWork(id);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadWorks(true);
    } catch (err) {
      wx.showToast({ title: err.message || '删除失败', icon: 'none' });
    }
  },

  /**
   * 新建作品
   */
  onCreate() {
    wx.navigateTo({ url: '/pages/work-upload/index' });
  },
});
