const api = require('../../utils/api');
const { PHASE_STATUS_MAP, PHASE_TYPE_MAP } = require('../../utils/constants');

Page({
  data: { list: [], loading: true, error: false, ready: false, PHASE_STATUS_MAP, PHASE_TYPE_MAP },
  onLoad() { this.loadData(); },
  onReady() { this._readyFired = true; if (this._pageData) { this.setData(Object.assign({ ready: true }, this._pageData)); this._pageData = null; } },
  onPullDownRefresh() { this.loadData().then(() => wx.stopPullDownRefresh()); },
  async loadData() {
    this.setData({ loading: true, error: false, ready: false });
    try {
      const res = await api.getEngineeringDirectorPhases();
      const list = (res.list || []).map(item => ({
        ...item, phaseLabel: (PHASE_TYPE_MAP[item.phase_type] || {}).label || item.phase_type,
        statusLabel: (PHASE_STATUS_MAP[item.status] || {}).label || item.status,
        statusColor: (PHASE_STATUS_MAP[item.status] || {}).colorClass || '',
      }));
      const pageData = { list, loading: false };
      if (this._readyFired) { this.setData(Object.assign({ ready: true }, pageData)); } else { this._pageData = pageData; }
    } catch (err) { this.setData({ loading: false, error: true, ready: true }); }
  },
  onTapItem(e) { wx.navigateTo({ url: `/pages/engineering-director-review-detail/index?phaseId=${e.currentTarget.dataset.id}` }); },
  onRetry() { this.loadData(); },
});
