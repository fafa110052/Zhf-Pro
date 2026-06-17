const api = require('../../utils/api');
const { PHASE_STATUS_MAP, PHASE_TYPE_MAP } = require('../../utils/constants');

Page({
  data: {
    list: [], allList: [], activeTab: 'confirm',   // confirm | upload
    loading: true, error: false, ready: false,
    PHASE_STATUS_MAP, PHASE_TYPE_MAP,
  },

  onLoad() { this.loadData(); },
  onReady() {
    this._readyFired = true;
    if (this._pageData) { this.setData(Object.assign({ ready: true }, this._pageData)); this._pageData = null; }
  },
  onPullDownRefresh() { this.loadData().then(() => wx.stopPullDownRefresh()); },

  async loadData() {
    this.setData({ loading: true, error: false, ready: false });
    try {
      const res = await api.getEngineerPhases();
      const allList = (res.list || []).map(item => ({
        ...item,
        phaseLabel: (PHASE_TYPE_MAP[item.phase_type] || {}).label || item.phase_type,
        statusLabel: (PHASE_STATUS_MAP[item.status] || {}).label || item.status,
        statusColor: (PHASE_STATUS_MAP[item.status] || {}).colorClass || '',
      }));
      const pageData = { allList, loading: false };
      if (this._readyFired) { this.setData(Object.assign({ ready: true }, pageData)); } else { this._pageData = pageData; }
      this.filterList();
    } catch (err) { this.setData({ loading: false, error: true, ready: true }); }
  },

  filterList() {
    const tab = this.data.activeTab;
    const list = this.data.allList.filter(item =>
      tab === 'confirm' ? ['design_admin_approved', 'owner_design_reviewed'].includes(item.status)
        : ['construction_confirmed', 'engineering_director_rejected', 'construction_admin_rejected'].includes(item.status)
    );
    this.setData({ list });
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, () => this.filterList());
  },

  onTapItem(e) {
    wx.navigateTo({ url: `/pages/engineer-task-detail/index?phaseId=${e.currentTarget.dataset.id}` });
  },
  onRetry() { this.loadData(); },
});
