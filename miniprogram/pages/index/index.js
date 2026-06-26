/**
 * 首页
 *
 * 模块：
 *   - 搜索栏
 *   - 轮播 Banner（后端动态配置）
 *   - 分类快捷入口（户型 / 部位 / 风格）
 *   - 热门推荐瀑布流
 */
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    // Banner
    banners: [],
    bannerLoading: true,

    // 分类快捷入口
    quickCats: [
      { key: 'house_type', icon: '🏠', label: '户型' },
      { key: 'area', icon: '🔨', label: '部位' },
      { key: 'style', icon: '🎨', label: '风格' },
    ],

    // 热门作品
    hotWorks: [],
    hotLoading: true,
    hotError: false,

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
      // 后端返回 config_value 为解析后的对象 { image_url, title, link }
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

  /** 点击 Banner — 根据 link 类型执行不同操作 */
  onBannerTap(e) {
    var link = e.detail.link;
    if (!link) {
      // 无链接则预览大图
      var banner = this.data.banners[e.detail.index];
      if (banner && banner.image) {
        wx.previewImage({ urls: [banner.image], current: banner.image });
      }
      return;
    }

    // 纯数字 → 作品详情
    if (/^\d+$/.test(link)) {
      wx.navigateTo({ url: '/pages/work-detail/index?id=' + link });
      return;
    }

    // 小程序页面路径 → 内部跳转
    if (link.startsWith('/pages/')) {
      wx.navigateTo({ url: link });
      return;
    }

    // 外部链接 → 提示用户（小程序无法直接跳转外部）
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

  /** 搜索确认 → 携带关键词跳转分类页 */
  onSearchConfirm() {
    var keyword = (this.data.searchKeyword || '').trim();
    if (!keyword) return;

    // 通过 globalData 传递搜索关键词（switchTab 不支持 URL 参数）
    var app = getApp();
    app.globalData.categoryKeyword = keyword;
    app.globalData.categorySort = 'newest';
    wx.switchTab({ url: '/pages/category/index' });
  },

  /** 清除搜索关键词 */
  onSearchClear() {
    this.setData({ searchKeyword: '' });
  },

  /** 点击搜索栏（保留兼容 — 不输入直接点击则跳转分类页） */
  onSearchTap() {
    wx.switchTab({ url: '/pages/category/index' });
  },

  /** 点击分类快捷入口 → 跳转分类页 */
  onQuickCatTap(e) {
    var key = e.currentTarget.dataset.key;
    // 跳转分类页并传递默认 Tab
    wx.switchTab({ url: '/pages/category/index' });
    // 存储选中的 tab，分类页 onShow 时读取
    var app = getApp();
    app.globalData.categoryTab = key;
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
