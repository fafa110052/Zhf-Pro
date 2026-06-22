/**
 * 分类筛选页
 *
 * 功能：
 *   - 顶部三维度 Tab（户型 / 部位 / 风格）
 *   - 二级标签云（单维度单选）
 *   - 交叉筛选（多维度 AND 逻辑）
 *   - 排序切换（最新 / 最热）
 *   - 两列瀑布流 + 上拉加载更多
 */
const api = require('../../utils/api');
const util = require('../../utils/util');

// 维度 Tab 配置
// 注意：key 需与 /api/v1/categories 返回的 type 字段一致
const DIMENSION_TABS = [
  { key: 'house_type', label: '户型' },
  { key: 'area', label: '部位' },
  { key: 'style', label: '风格' },
];

// 维度 → API 参数映射
const DIMENSION_PARAM_MAP = {
  house_type: 'house_type_id',
  area: 'area_category_id',
  style: 'style_category_id',
};

// 渲染窗口：最多保留 48 个作品节点，超出自动回收，防止 DOM 堆积导致卡顿
var MAX_RENDERED = 48;
var EST_ITEM_HEIGHT = 280; // 瀑布流单卡估算高度（px），用于回收后滚动补偿

Page({
  data: {
    // Tab
    tabs: DIMENSION_TABS,
    activeTabKey: 'house_type',

    // 分类字典（按 type 分组）
    categoryMap: {}, // { house_type: [{id,name}], area_category: [...], style_category: [...] }

    // 当前各维度选中的分类 ID（单选，null 表示未选）
    selected: {
      house_type_id: null,
      area_category_id: null,
      style_category_id: null,
    },

    // 排序
    sortBy: 'newest', // newest | popular

    // 当前维度下的标签列表（预计算 selected 状态，WXML 不能调用函数）
    activeTags: [],

    // 已选筛选条件汇总（用于顶部筛选条展示）
    selectedFilters: [],
    hasAnyFilter: false,

    // 作品列表
    works: [],
    page: 1,
    totalPages: 1,
    loading: true,   // 首次加载
    loadingMore: false,
    hasMore: true,
    error: false,    // 加载失败

    // 搜索关键词（从首页传入）
    keyword: '',

    // 分类加载失败标记
    categoryError: false,

    // 渲染窗口：已折叠的旧作品数
    trimmedCount: 0,
  },

  // 跟踪滚动位置（节点回收后补偿用）
  onPageScroll(e) {
    this._scrollTop = e.scrollTop;
  },

  // ═══════════════════════════════════════════
  // 生命周期
  // ═══════════════════════════════════════════

  onLoad() {
    this.loadCategories();
  },

  onShow() {
    // 读取首页传入的预设参数（一次性消费）
    var app = getApp();
    var presetTab = app.globalData.categoryTab;
    var presetSort = app.globalData.categorySort;
    var presetKeyword = app.globalData.categoryKeyword;
    app.globalData.categoryTab = null;
    app.globalData.categorySort = null;
    app.globalData.categoryKeyword = null;

    if (!presetTab && !presetSort && !presetKeyword) return;

    // 有预设：更新状态（分类数据可能尚未加载完成，但 loadWorks 不依赖 categoryMap）
    var updates = {};
    if (presetTab) updates.activeTabKey = presetTab;
    if (presetSort) updates.sortBy = presetSort;
    if (presetKeyword) updates.keyword = presetKeyword;

    this.setData(updates, function () {
      this.updateActiveTags();
      this.updateSelectedFilters();
      // 仅在分类已加载时才重新拉取（loadCategories 完成后会自动拉取）
      if (Object.keys(this.data.categoryMap).length > 0) {
        this.loadWorks(true);
      }
    }.bind(this));
  },

  // ═══════════════════════════════════════════
  // 下拉刷新
  // ═══════════════════════════════════════════

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, categoryError: false });
    // 下拉刷新时重新加载分类和作品
    Promise.all([
      this.loadCategories(),
      this.loadWorks(true),
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ═══════════════════════════════════════════
  // 上拉加载更多
  // ═══════════════════════════════════════════

  onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.loadMore();
  },

  // ═══════════════════════════════════════════
  // 加载分类字典
  // ═══════════════════════════════════════════

  async loadCategories() {
    try {
      const categoryMap = await api.getCategories();
      if (!categoryMap || Object.keys(categoryMap).length === 0) {
        throw new Error('分类数据为空');
      }
      this.setData({ categoryMap, categoryError: false });
      this.updateActiveTags();
      this.updateSelectedFilters();
      // 分类加载完成后加载作品
      this.loadWorks(true);
    } catch (err) {
      console.error('加载分类失败:', err);
      // 显示可见错误信息帮助调试
      wx.showToast({ title: '分类加载失败，请检查网络或下拉刷新', icon: 'none', duration: 2500 });
      this.setData({ categoryError: true });
      this.loadWorks(true);
    }
  },

  // ═══════════════════════════════════════════
  // 加载作品列表
  // ═══════════════════════════════════════════

  async loadWorks(reset) {
    var page = reset ? 1 : this.data.page;
    if (reset) {
      this.setData({ loading: true, works: [], page: 1 });
    }

    try {
      var params = {
        page: page,
        page_size: 12,
        sort_by: this.data.sortBy,
      };

      // 搜索关键词
      if (this.data.keyword) {
        params.keyword = this.data.keyword;
      }

      // 拼装已选筛选条件
      var selected = this.data.selected;
      if (selected.house_type_id) params.house_type_id = selected.house_type_id;
      if (selected.area_category_id) params.area_category_id = selected.area_category_id;
      if (selected.style_category_id) params.style_category_id = selected.style_category_id;

      var result = await api.getWorks(params);
      var rawList = result.list || [];
      var pagination = result.pagination || {};

      // 转换数据格式以匹配 work-card 组件
      var list = rawList.map(function (item) {
        return transformWork(item);
      });

      if (reset) {
        this.setData({
          works: list,
          page: pagination.page || 1,
          totalPages: pagination.total_pages || 1,
          loading: false,
          hasMore: (pagination.page || 1) < (pagination.total_pages || 1),
        });
      } else {
        var allWorks = this.data.works.concat(list);
        var trimmed = 0;
        if (allWorks.length > MAX_RENDERED) {
          trimmed = allWorks.length - MAX_RENDERED;
          allWorks = allWorks.slice(-MAX_RENDERED);
        }
        this.setData({
          works: allWorks,
          page: pagination.page || page,
          totalPages: pagination.total_pages || 1,
          loadingMore: false,
          hasMore: (pagination.page || page) < (pagination.total_pages || 1),
          trimmedCount: (this.data.trimmedCount || 0) + trimmed,
        }, function () {
          // 回收节点后补偿滚动位置，防止画面跳动
          if (trimmed > 0 && this._scrollTop > 0) {
            var removedRows = Math.ceil(trimmed / 2);
            var compensation = removedRows * EST_ITEM_HEIGHT;
            wx.pageScrollTo({ scrollTop: Math.max(0, this._scrollTop - compensation), duration: 0 });
          }
        }.bind(this));
      }
    } catch (err) {
      console.error('加载作品失败:', err);
      if (reset) {
        this.setData({ loading: false, error: true });
      } else {
        this.setData({ loadingMore: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    }
  },

  async loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    await this.loadWorks(false);
  },

  // ═══════════════════════════════════════════
  // 切换维度 Tab
  // ═══════════════════════════════════════════

  onTabTap(e) {
    var key = e.currentTarget.dataset.key;
    if (key === this.data.activeTabKey) return;
    this.setData({ activeTabKey: key });
    this.updateActiveTags();
  },

  // ═══════════════════════════════════════════
  // 点击标签（单选：替换当前维度已选项）
  // ═══════════════════════════════════════════

  onTagTap(e) {
    var tagId = e.currentTarget.dataset.id;
    var paramKey = DIMENSION_PARAM_MAP[this.data.activeTabKey];

    var selected = this.data.selected;
    // 点击已选中标签 → 取消选中
    if (selected[paramKey] === tagId) {
      selected[paramKey] = null;
    } else {
      selected[paramKey] = tagId;
    }

    this.setData({ selected: selected });
    this.updateActiveTags();
    this.updateSelectedFilters();
    // 筛选条件变化 → 重新加载
    this.loadWorks(true);
  },

  // ═══════════════════════════════════════════
  // 切换排序
  // ═══════════════════════════════════════════

  onSortTap(e) {
    var sort = e.currentTarget.dataset.sort;
    if (sort === this.data.sortBy) return;
    this.setData({ sortBy: sort });
    this.loadWorks(true);
  },

  // ═══════════════════════════════════════════
  // 移除单个筛选条件
  // ═══════════════════════════════════════════

  onRemoveFilter(e) {
    var paramKey = e.currentTarget.dataset.paramKey;
    var selected = this.data.selected;
    selected[paramKey] = null;
    this.setData({ selected: selected });
    this.updateActiveTags();
    this.updateSelectedFilters();
    this.loadWorks(true);
  },

  // 清除搜索关键词
  onClearKeyword() {
    this.setData({ keyword: '' });
    this.loadWorks(true);
  },

  // ═══════════════════════════════════════════
  // 清除所有筛选
  // ═══════════════════════════════════════════

  onClearFilter() {
    this.setData({
      selected: { house_type_id: null, area_category_id: null, style_category_id: null },
      sortBy: 'newest',
    });
    this.updateActiveTags();
    this.updateSelectedFilters();
    this.loadWorks(true);
  },

  // ═══════════════════════════════════════════
  // 点击作品卡片 → 跳转详情页
  // ═══════════════════════════════════════════

  /** 点击重试 */
  onRetry() {
    this.setData({ error: false, loading: true });
    this.loadWorks(true);
  },

  onWorkTap(e) {
    var id = e.detail.id;
    wx.navigateTo({ url: '/pages/work-detail/index?id=' + id });
  },

  // ═══════════════════════════════════════════
  // 预计算：当前维度下的标签列表（含 selected 状态）
  // ═══════════════════════════════════════════

  updateActiveTags() {
    var activeTabKey = this.data.activeTabKey;
    var categoryMap = this.data.categoryMap;
    var selected = this.data.selected;
    var paramKey = DIMENSION_PARAM_MAP[activeTabKey];

    var rawTags = categoryMap[activeTabKey] || [];
    var tags = rawTags.map(function (tag) {
      return {
        id: tag.id,
        name: tag.name,
        selected: selected[paramKey] === tag.id,
      };
    });

    this.setData({ activeTags: tags });
  },

  // ═══════════════════════════════════════════
  // 预计算：已选筛选条件汇总（用于顶部筛选条）
  // ═══════════════════════════════════════════

  updateSelectedFilters() {
    var selected = this.data.selected;
    var categoryMap = this.data.categoryMap;
    var filters = [];

    // 遍历三个维度，找出已选项
    var dims = [
      { paramKey: 'house_type_id', catKey: 'house_type', label: '户型' },
      { paramKey: 'area_category_id', catKey: 'area', label: '部位' },
      { paramKey: 'style_category_id', catKey: 'style', label: '风格' },
    ];

    for (var i = 0; i < dims.length; i++) {
      var dim = dims[i];
      var selectedId = selected[dim.paramKey];
      if (selectedId) {
        // 从分类字典中查找名称
        var cats = categoryMap[dim.catKey] || [];
        var name = '';
        for (var j = 0; j < cats.length; j++) {
          if (cats[j].id === selectedId) {
            name = cats[j].name;
            break;
          }
        }
        filters.push({
          paramKey: dim.paramKey,
          catKey: dim.catKey,
          name: name || String(selectedId),
          dimLabel: dim.label,
        });
      }
    }

    this.setData({
      selectedFilters: filters,
      hasAnyFilter: filters.length > 0,
    });
  },
});

// ═══════════════════════════════════════════
// 辅助函数：将 API 作品数据转为 work-card 所需格式
// ═══════════════════════════════════════════

function transformWork(item) {
  return {
    id: item.id,
    cover_url: util.fullImageUrl(item.cover_image),
    title: item.title,
    area_text: util.formatArea(item.area_sqm),
    budget_text: formatBudgetRange(item.budget_min, item.budget_max),
    view_count: util.formatNumber(item.view_count),
    style_category_name: item.style_category_name || '',
    house_type_name: item.house_type_name || '',
    area_category_name: item.area_category_name || '',
    designer_name: item.designer_name || '',
  };
}

/** 预算区间文本 */
function formatBudgetRange(min, max) {
  if (!min && !max) return '';
  if (min && max) {
    return (min === max) ? util.formatBudget(min) : util.formatBudget(min) + '-' + util.formatBudget(max);
  }
  if (min) return util.formatBudget(min) + '起';
  return util.formatBudget(max) + '以内';
}
