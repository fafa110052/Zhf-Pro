/**
 * 作品详情页
 *
 * 模块：
 *   1. 全屏图片轮播（swiper + 计数器 + 返回按钮）
 *   2. 双指放大预览（wx.previewImage）
 *   3. 作品信息卡片（标题/标签/面积/预算/浏览量/日期/描述）
 *   4. 设计师名片
 *   5. 分享功能
 */
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    workId: null,
    work: null,
    images: [],
    designer: null,

    // 当前轮播索引
    currentSwiper: 0,

    // 状态
    loading: true,
    error: false,
    ready: false,    // 页面过渡完成后再显示内容

    // 图片加载状态：loading | loaded | error
    imageLoadState: {},

    // 举报弹窗
    showReport: false,
    reportSubmitting: false,
    reportReasons: [
      { value: 'fake', label: '虚假信息/夸大宣传' },
      { value: 'infringe', label: '侵权/盗用他人作品' },
      { value: 'vulgar', label: '低俗/不良内容' },
      { value: 'other', label: '其他' },
    ],
    reportForm: {
      reason_type: '',
      reason_detail: '',
      contact: '',
    },
  },

  onLoad(options) {
    var id = Number(options.id);
    if (!id) {
      util.showToast('作品不存在', 'error');
      setTimeout(function () { wx.navigateBack(); }, 1500);
      return;
    }
    this.setData({ workId: id });
    this.loadDetail();
  },

  onReady() {
    // 页面首次渲染完成 — 过渡动画此时通常已结束
    this._pageReady = true;
    if (this._dataReady && this._detailData) {
      this.setData(Object.assign({ ready: true }, this._detailData));
    }
  },

  // ═══════════════════════════════════════════
  // 加载作品详情
  // ═══════════════════════════════════════════

  async loadDetail() {
    this.setData({ loading: true, error: false, ready: false });
    this._dataReady = false;

    // 记录开始时间，确保至少显示 350ms 的加载态（覆盖页面过渡动画）
    var startTime = Date.now();
    var MIN_LOADING = 350;

    try {
      var work = await api.getWorkDetail(this.data.workId);

      // 格式化图片列表
      var images = (work.images || []).map(function (img) {
        return {
          id: img.id,
          image_url: util.fullImageUrl(img.image_url),
          thumb_url: util.fullImageUrl(img.thumb_url || img.image_url),
        };
      });

      // 初始化图片加载状态（全部标记为 loading）
      var imageLoadState = {};
      images.forEach(function (img) {
        imageLoadState[img.id] = 'loading';
      });

      // 设计师数据从展平的工作对象中提取
      var designer = {
        id: work.designer_id,
        name: work.designer_name || '未知设计师',
        avatar_url: util.fullImageUrl(work.designer_avatar),
        phone: work.designer_phone || '',
        years_of_exp: work.designer_years || 0,
        bio: work.designer_bio || '',
      };

      // 格式化预算区间
      var budgetText = formatBudgetRange(work.budget_min, work.budget_max);

      var detailData = {
        work: {
          title: work.title,
          description: work.description || '',
          house_type_name: work.house_type_name || '',
          area_category_name: work.area_category_name || '',
          style_category_name: work.style_category_name || '',
          area_text: util.formatArea(work.area_sqm),
          budget_text: budgetText,
          view_count: work.view_count || 0,
          created_at_text: util.formatTime(work.created_at, 'date'),
          cover_image: util.fullImageUrl(work.cover_image),
          vr_url: work.vr_url || '',
        },
        images: images,
        designer: designer,
        imageLoadState: imageLoadState,
        loading: false,
      };

      // 动态设置导航栏标题
      if (work.title) {
        wx.setNavigationBarTitle({ title: work.title });
      }

      // 确保加载态持续至少 MIN_LOADING ms，覆盖页面滑入动画
      var elapsed = Date.now() - startTime;
      var remaining = Math.max(0, MIN_LOADING - elapsed);

      this._detailData = detailData;
      this._dataReady = true;

      if (remaining > 0) {
        var that = this;
        setTimeout(function () {
          that._showDetail();
        }, remaining);
      } else {
        this._showDetail();
      }
    } catch (err) {
      console.error('作品详情加载失败:', err);
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  /** 延迟显示详情内容（确保页面过渡完成） */
  _showDetail() {
    if (!this._detailData) return;
    if (this._pageReady) {
      this.setData(Object.assign({ ready: true }, this._detailData));
    }
    // 如果页面尚未 onReady，等 onReady 回调中再设置
  },

  // ═══════════════════════════════════════════
  // 图片轮播切换
  // ═══════════════════════════════════════════

  onSwiperChange(e) {
    this.setData({ currentSwiper: e.detail.current });
  },

  /** 图片加载完成 */
  onImageLoad(e) {
    var id = e.currentTarget.dataset.id;
    this.setData({ ['imageLoadState.' + id]: 'loaded' });
  },

  /** 图片加载失败 */
  onImageError(e) {
    var id = e.currentTarget.dataset.id;
    this.setData({ ['imageLoadState.' + id]: 'error' });
  },

  // ═══════════════════════════════════════════
  // 点击图片 → 全屏双指缩放预览
  // ═══════════════════════════════════════════

  onPreviewImage() {
    var urls = this.data.images.map(function (img) {
      return img.image_url;
    });
    if (urls.length === 0) return;

    wx.previewImage({
      urls: urls,
      current: urls[this.data.currentSwiper] || urls[0],
    });
  },

  // ═══════════════════════════════════════════
  // 分享
  // ═══════════════════════════════════════════

  onShareAppMessage() {
    var work = this.data.work || {};
    return {
      title: work.title || '住好房装修作品',
      path: '/pages/work-detail/index?id=' + this.data.workId,
      imageUrl: work.cover_image || '',
    };
  },

  // ═══════════════════════════════════════════
  // 举报
  // ═══════════════════════════════════════════

  // ─── VR 看房 ───
  onTapVR() {
    const vrUrl = this.data.work && this.data.work.vr_url;
    if (!vrUrl) return;

    // 从酷家乐链接中提取设计 ID，如 https://www.kujiale.com/cloud/design/3FO3DXSFRQ94/airoaming
    const designId = vrUrl.match(/\/design\/([A-Za-z0-9]+)\//);
    const id = designId ? designId[1] : '';

    wx.navigateToMiniProgram({
      appId: 'wxc2d8d319dfc12a95',
      path: id ? 'pages/index/index?designId=' + id : '',
      extraData: { url: vrUrl },
      envVersion: 'release',
      fail(err) {
        console.error('跳转全景720失败:', err);
        wx.showToast({ title: '打开失败，请稍后重试', icon: 'none' });
      },
    });
  },

  onOpenReport() {
    this.setData({
      showReport: true,
      reportForm: { reason_type: '', reason_detail: '', contact: '' },
    });
  },

  onCloseReport() {
    if (this.data.reportSubmitting) return;
    this.setData({ showReport: false });
  },

  onSelectReason(e) {
    var value = e.currentTarget.dataset.value;
    this.setData({ 'reportForm.reason_type': value });
  },

  onReportDetailInput(e) {
    this.setData({ 'reportForm.reason_detail': e.detail.value });
  },

  onReportContactInput(e) {
    this.setData({ 'reportForm.contact': e.detail.value });
  },

  async onSubmitReport() {
    var form = this.data.reportForm;
    if (!form.reason_type) {
      util.showToast('请选择举报原因', 'none');
      return;
    }
    if (form.reason_type === 'other' && !form.reason_detail.trim()) {
      util.showToast('请填写举报原因', 'none');
      return;
    }
    if (this.data.reportSubmitting) return;

    this.setData({ reportSubmitting: true });
    try {
      await api.submitReport(this.data.workId, {
        reason_type: form.reason_type,
        reason_detail: form.reason_detail.trim() || undefined,
        contact: form.contact.trim() || undefined,
      });
      this.setData({ showReport: false, reportSubmitting: false });
      wx.showToast({ title: '举报已提交，感谢反馈', icon: 'none', duration: 2500 });
    } catch (err) {
      console.error('举报提交失败:', err);
      this.setData({ reportSubmitting: false });
      wx.showToast({ title: err && err.message ? err.message : '提交失败，请重试', icon: 'none', duration: 2500 });
    }
  },

  // ═══════════════════════════════════════════
  // 重试
  // ═══════════════════════════════════════════

  onRetry() {
    this.setData({ error: false, ready: false });
    this.loadDetail();
  },
});

// ═══════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════

function formatBudgetRange(min, max) {
  if (!min && !max) return '';
  if (min && max) {
    return min === max ? util.formatBudget(min) : util.formatBudget(min) + '-' + util.formatBudget(max);
  }
  if (min) return util.formatBudget(min) + '起';
  return util.formatBudget(max) + '以内';
}
