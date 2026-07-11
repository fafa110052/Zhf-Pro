/**
 * 首页 V3.0 — 温暖精致风
 *
 * 模块：
 *   - 品牌融合 Banner（Slogan 叠加）
 *   - 免费量房（3步流程 + 预约按钮）
 *   - 核心优势（2×2 图文网格）
 *   - 设计团队（横向滑动卡片 + 数据条）
 *   - 热门推荐瀑布流
 */
const api = require('../../utils/api');
const util = require('../../utils/util');
const { IC } = require('../../utils/icons');

Page({
  data: {
    // Banner
    banners: [],
    bannerLoading: true,

    // 核心优势（2×2 图文网格）
    advantages: [
      { icon: IC.hardhat, label: '匠心工艺', desc: '精工细作品质保障' },
      { icon: IC.leaf, label: '环保材料', desc: '品牌主材直供' },
      { icon: IC.bulb, label: '透明报价', desc: '预算清晰无增项' },
      { icon: IC.user, label: '一对一服务', desc: '专属设计师全程跟进' },
    ],

    // 设计团队（从 API 读取）
    designers: [],

    // 热门作品
    hotWorks: [],
    hotLoading: true,
    hotError: false,

    // 免费量房步骤
    measureSteps: [
      { icon: IC.clipboard, label: '在线预约', desc: '填写房屋信息' },
      { icon: IC.ruler, label: '上门测量', desc: '专业免费量房' },
      { icon: IC.chart, label: '出方案报价', desc: '透明无增项' },
    ],

    // 隐私协议弹窗
    showPrivacy: false,

    // 运营数据（后端可配，兜底默认值）
    stats: {
      families: '500+',
      works: '1200+',
      slogan: '匠心工艺·品质交付',
    },
  },

  onLoad() {
    // 首次启动检查隐私协议
    var agreed = wx.getStorageSync('privacy_agreed');
    if (!agreed) {
      this.setData({ showPrivacy: true });
      wx.hideTabBar();
    }

    this.loadHomepageConfig();
    this.loadHotWorks();
    this.loadDesignTeam();
  },

  onShow() {
    // 首次加载后不再自动刷新
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadHomepageConfig(),
      this.loadHotWorks(),
      this.loadDesignTeam(),
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

      // 运营数据（stats 类型，取第一条；无则保持默认）
      var update = { banners: banners, bannerLoading: false };
      var statsList = data.stats || [];
      if (statsList.length > 0) {
        var s = statsList[0].config_value || {};
        update.stats = {
          families: s.families || this.data.stats.families,
          works: s.works || this.data.stats.works,
          slogan: s.slogan || this.data.stats.slogan,
        };
      }

      this.setData(update);
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
  // 加载设计团队
  // ═══════════════════════════════════════════

  async loadDesignTeam() {
    try {
      var list = await api.getDesignTeam();
      var designers = list.map(function (item) {
        return {
          avatar: item.avatar_url ? util.fullImageUrl(item.avatar_url) : '/images/zhfanglogo.png',
          name: item.name,
          styles: item.styles || '',
        };
      });
      this.setData({ designers: designers });
    } catch (err) {
      console.error('加载设计团队失败:', err);
      // 失败时保持空数组，UI 自行处理
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

  /** 免费量房预约 */
  onFreeMeasureTap() {
    wx.navigateTo({ url: '/pages/measurement-appointment/index' });
  },

  // ═══════════════════════════════════════════
  // 隐私协议弹窗
  // ═══════════════════════════════════════════

  /** 遮罩点击 — 阻止穿透操作背景 */
  onOverlayTap() {
    // 空函数，仅用于 catchtap 阻止事件穿透
  },

  /** 同意并继续 */
  onAgreePrivacy() {
    wx.setStorageSync('privacy_agreed', Date.now());
    this.setData({ showPrivacy: false });
    wx.showTabBar();
  },

  /** 暂不同意 */
  onDisagreePrivacy() {
    wx.showModal({
      title: '温馨提示',
      content: '需要同意《用户协议》和《隐私政策》才能使用住好房的所有服务。确定要退出吗？',
      confirmText: '退出',
      cancelText: '再想想',
      success: function (res) {
        if (res.confirm) {
          wx.exitMiniProgram();
        }
      },
    });
  },

  /** 打开用户协议 */
  onOpenAgreement() {
    wx.navigateTo({ url: '/pages/agreement/index' });
  },

  /** 打开隐私政策 */
  onOpenPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' });
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
