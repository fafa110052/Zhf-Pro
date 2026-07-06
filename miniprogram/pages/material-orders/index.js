/**
 * 我的选材申请列表 — 参照 work-detail onReady+ready 模式
 */
const api = require('../../utils/api');
const { ORDER_STATUS_MAP, PHASE_TYPE_MAP } = require('../../utils/constants');

Page({
  data: {
    orders: [],
    page: 1,
    totalPages: 1,
    loading: true,
    loadingMore: false,
    hasMore: true,
    error: false,
    ready: false,
    ORDER_STATUS_MAP,
    PHASE_TYPE_MAP,
    expandedSet: {},  // 展开状态：{ [order_no]: true }
  },

  onLoad() {
    this.loadOrders(true);
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  onPullDownRefresh() {
    this.loadOrders(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.loadMore();
  },

  async loadOrders(reset) {
    const page = reset ? 1 : this.data.page;
    if (reset) this.setData({ loading: true, orders: [], page: 1, ready: false });

    try {
      const result = await api.getMyMaterialOrders({ page, page_size: 20 });
      const list = result.list || [];
      const pag = result.pagination || {};

      const orders = list.map((o) => {
        const timeline = buildTimeline(o);
        const hasProgress = o.construction_status && o.construction_status !== 'not_started';
        // 找到当前进行中的阶段作为摘要
        const activeStep = timeline.find(function(s) { return s.state === 'active'; });
        const rejectedStep = timeline.find(function(s) { return s.state === 'rejected'; });
        const lastDone = timeline.slice().reverse().find(function(s) { return s.state === 'completed'; });
        var summaryText = '';
        if (rejectedStep) summaryText = rejectedStep.label + '已驳回';
        else if (activeStep) summaryText = activeStep.label + '阶段';
        else if (lastDone && lastDone.key === 'completion') summaryText = '已竣工';
        else if (lastDone) summaryText = lastDone.label + '已完成';
        else summaryText = '未开工';
        return {
          ...o,
          statusLabel: (ORDER_STATUS_MAP[o.status] || {}).label || o.status,
          statusIcon: (ORDER_STATUS_MAP[o.status] || {}).icon || '',
          statusColor: (ORDER_STATUS_MAP[o.status] || {}).colorClass || '',
          timeline: timeline,
          hasProgress: hasProgress,
          summaryText: summaryText,
        };
      });

      if (reset) {
        const pageData = { orders, page: pag.page || 1, totalPages: pag.total_pages || 1, loading: false, hasMore: (pag.page || 1) < (pag.total_pages || 1) };
        if (this._readyFired) {
          this.setData(Object.assign({ ready: true }, pageData));
        } else {
          this._pageData = pageData;
        }
      } else {
        this.setData({
          orders: this.data.orders.concat(orders),
          page: pag.page || page, totalPages: pag.total_pages || 1,
          loadingMore: false, hasMore: (pag.page || page) < (pag.total_pages || 1),
        });
      }
    } catch (err) {
      console.error('加载申请列表失败:', err);
      if (reset) this.setData({ loading: false, error: true, ready: true });
      else this.setData({ loadingMore: false });
    }
  },

  async loadMore() {
    this.setData({ loadingMore: true, page: this.data.page + 1 });
    await this.loadOrders(false);
  },

  onOrderTap(e) {
    const { orderNo } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/material-order-detail/index?orderNo=${orderNo}` });
  },

  /** 展开/收缩施工进度时间线 */
  onToggleTimeline(e) {
    const { orderNo } = e.currentTarget.dataset;
    const expandedSet = Object.assign({}, this.data.expandedSet);
    if (expandedSet[orderNo]) {
      delete expandedSet[orderNo];
    } else {
      expandedSet[orderNo] = true;
    }
    this.setData({ expandedSet });
  },

  onRetry() { this.loadOrders(true); },
});

/**
 * 根据后端返回的施工数据计算 6 段时间线状态
 * @param {Object} o - order 原始数据 { construction_status, current_phase_order, phase1_status }
 * @returns {Array<{label, state}>} state: 'completed'|'active'|'pending'|'rejected'
 */
function buildTimeline(o) {
  var status = o.construction_status || 'not_started';
  var cur = o.current_phase_order || 0;
  var designStatus = o.phase1_status;

  // 设计阶段状态
  var designState = 'pending';
  if (designStatus) {
    if (['design_director_rejected', 'design_admin_rejected', 'owner_design_disputed'].indexOf(designStatus) !== -1) {
      designState = 'rejected';
    } else if (['owner_design_reviewed', 'engineer_design_confirmed'].indexOf(designStatus) !== -1
      || designStatus.indexOf('construction_') === 0 || designStatus === 'owner_accepted') {
      designState = 'completed';
    } else {
      designState = 'active'; // assigned / design_uploaded / design_director_approved / design_admin_approved
    }
  }

  var steps = [
    { key: 'design',         label: '设计',     order: 0, state: designState, stateText: STATE_TEXT[designState] || '' },
    { key: 'demolition',     label: '打拆',     order: 1, state: 'pending',   stateText: '待施工' },
    { key: 'water_electric', label: '水电',     order: 2, state: 'pending',   stateText: '待施工' },
    { key: 'painting',       label: '油工',     order: 3, state: 'pending',   stateText: '待施工' },
    { key: 'material_install', label: '主材安装', order: 4, state: 'pending',   stateText: '待施工' },
    { key: 'completion',     label: '竣工',     order: 5, state: 'pending',   stateText: '待施工' },
  ];

  // 设计未完成（驳回/审核中/未开始）→ 施工阶段全部锁定"待施工"
  // 只有设计已完成后，才根据 current_phase_order 推进施工进度
  if (designState !== 'completed') return steps;

  // 未开工 → 施工阶段全部 pending
  if (status === 'not_started') return steps;

  // 已竣工 → 施工阶段全部 completed
  if (status === 'completed') {
    for (var i = 1; i < steps.length; i++) { steps[i].state = 'completed'; steps[i].stateText = '已完成'; }
    return steps;
  }

  // 施工中 → 根据 current_phase_order 判断
  for (var j = 1; j < steps.length; j++) {
    if (steps[j].order < cur) { steps[j].state = 'completed'; steps[j].stateText = '已完成'; }
    else if (steps[j].order === cur) { steps[j].state = 'active'; steps[j].stateText = '进行中'; }
    else { steps[j].state = 'pending'; steps[j].stateText = '待施工'; }
  }

  return steps;
}

var STATE_TEXT = { completed: '已完成', active: '进行中', pending: '待施工', rejected: '已驳回' };
