/**
 * 首页 V2.0 — 温暖精致风
 *
 * 模块：
 *   - 搜索栏
 *   - 品牌融合 Banner（Slogan 叠加）
 *   - 核心优势图标
 *   - 热门推荐瀑布流
 *   - 设计团队（横向滑动卡片 + 数据条）
 *   - 免费量房（3步流程 + 预约按钮）
 */
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    // Banner
    banners: [],
    bannerLoading: true,

    // 核心优势（按服务流程排序）
    advantages: [
      { icon: '🏗️', label: '自有施工队', desc: '自营团队不转包' },
      { icon: '🌿', label: '环保材料', desc: '品牌主材直供' },
      { icon: '💰', label: '先装后付', desc: '验收合格再付款' },
      { icon: '🛡️', label: '5年质保', desc: '住进去也安心' },
    ],

    // 设计团队（静态占位，后续接入 API）
    designers: [
      { avatar: '/images/zhflogo.png', name: '张工', styles: '现代·轻奢' },
      { avatar: '/images/zhflogo.png', name: '李工', styles: '法式·奶油' },
      { avatar: '/images/zhflogo.png', name: '王工', styles: '日式·原木' },
      { avatar: '/images/zhflogo.png', name: '陈工', styles: '极简·北欧' },
    ],

    // 热门作品
    hotWorks: [],
    hotLoading: true,
    hotError: false,

    // 免费量房步骤
    measureSteps: [
      { icon: '📋', label: '在线预约', desc: '填写房屋信息' },
      { icon: '📐', label: '上门测量', desc: '专业免费量房' },
      { icon: '📊', label: '出方案报价', desc: '透明无增项' },
    ],

    // 搜索
    searchKeyword: '',
  },

  onLoad() {
    this.loadHomepageConfig();
    this.loadHotWorks();
  },

  onShow() {
    // 首次加载后不再自动刷新
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadHomepageConfig(),
      this.loadHotWorks(),
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ═══════════════════════════════════════════
  // 加载 Banner
  // ═══════════════════════════════════════════

  async loadHomepageConfig() {
    try {
      var data = await api.getHomepageConfig();
      var banners = (data.banner || []).map(function (b) {
        var cfg = b.config_value || {};
        return {
          id: b.id,
          image: util.fullImageUrl(cfg.image_url || ''),
          title: cfg.title || '',
          link: cfg.link || '',
        };
      });
      this.setData({ banners: banners, bannerLoading: false });
    } catch (err) {
      console.error('加载首页配置失败:', err);
      this.setData({ bannerLoading: false });
    }
  },

  // ═══════════════════════════════════════════
  // 加载热门推荐
  // ═══════════════════════════════════════════

  async loadHotWorks() {
    try {
      var works = await api.getHotWorks(6);
      var list = works.map(function (item) {
        return {
          id: item.id,
          cover_url: util.fullImageUrl(item.cover_thumb || item.cover_image),
          title: item.title,
          area_text: util.formatArea(item.area_sqm),
          budget_text: formatBudgetRange(item.budget_min, item.budget_max),
          view_count: util.formatNumber(item.view_count),
          style_category_name: item.style_category_name || '',
          designer_name: item.designer_name || '',
        };
      });
      this.setData({ hotWorks: list, hotLoading: false, hotError: false });
    } catch (err) {
      console.error('加载热门作品失败:', err);
      this.setData({ hotLoading: false, hotError: true });
    }
  },

  // ═══════════════════════════════════════════
  // 事件
  // ═══════════════════════════════════════════

  /** 点击 Banner */
  onBannerTap(e) {
    var link = e.detail.link;
    if (!link) {
      var banner = this.data.banners[e.detail.index];
      if (banner && banner.image) {
        wx.previewImage({ urls: [banner.image], current: banner.image });
      }
      return;
    }

    if (/^\d+$/.test(link)) {
      wx.navigateTo({ url: '/pages/work-detail/index?id=' + link });
      return;
    }

    if (link.startsWith('/pages/')) {
      wx.navigateTo({ url: link });
      return;
    }

    wx.showModal({
      title: '外部链接',
      content: '链接: ' + link + '\n小程序内无法直接打开网页',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  /** 搜索输入 */
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  /** 搜索确认 */
  onSearchConfirm() {
    var keyword = (this.data.searchKeyword || '').trim();
    if (!keyword) {
      wx.switchTab({ url: '/pages/category/index' });
      return;
    }
    var app = getApp();
    app.globalData.categoryKeyword = keyword;
    app.globalData.categorySort = 'newest';
    wx.switchTab({ url: '/pages/category/index' });
  },

  /** 清除搜索关键词 */
  onSearchClear() {
    this.setData({ searchKeyword: '' });
  },

  /** 点击搜索栏 → 跳转分类页 */
  onSearchTap() {
    wx.switchTab({ url: '/pages/category/index' });
  },

  /** 点击热门作品 → 跳转详情 */
  onWorkTap(e) {
    var id = e.detail.id;
    wx.navigateTo({ url: '/pages/work-detail/index?id=' + id });
  },

  /** 重试加载热门 */
  onRetryHot() {
    this.setData({ hotError: false, hotLoading: true });
    this.loadHotWorks();
  },

  /** 查看更多热门 → 跳转分类页（最热排序）*/
  onMoreHot() {
    var app = getApp();
    app.globalData.categorySort = 'popular';
    wx.switchTab({ url: '/pages/category/index' });
  },

  /** 免费量房预约 → 暂为占位提示 */
  onFreeMeasureTap() {
    wx.showToast({ title: '敬请期待', icon: 'none' });
  },
});

/** 预算区间文本 */
function formatBudgetRange(min, max) {
  if (!min && !max) return '';
  if (min && max) {
    return min === max ? util.formatBudget(min) : util.formatBudget(min) + '-' + util.formatBudget(max);
  }
  if (min) return util.formatBudget(min) + '起';
  return util.formatBudget(max) + '以内';
}
