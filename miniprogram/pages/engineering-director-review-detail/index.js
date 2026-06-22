const api = require('../../utils/api');
const { PHASE_STATUS_MAP, PHASE_TYPE_MAP } = require('../../utils/constants');
const { fullImageUrl } = require('../../utils/util');

Page({
  data: {
    phaseId: null, phase: null, loading: true, error: false, ready: false,
    rejectOpen: false, rejectReason: '', rejecting: false, acting: false,
    PHASE_STATUS_MAP, PHASE_TYPE_MAP,
  },

  onLoad(options) { this.setData({ phaseId: options.phaseId }); this.loadDetail(); },
  onReady() { this._readyFired = true; if (this._pageData) { this.setData(Object.assign({ ready: true }, this._pageData)); this._pageData = null; } },

  async loadDetail() {
    if (!this.data.phaseId) return;
    this.setData({ loading: true, error: false, ready: false });
    try {
      const phase = await api.getPhaseDetail(this.data.phaseId);
      if (phase.construction_images) phase.construction_images = phase.construction_images.map(url => fullImageUrl(url));
      if (phase.design_images) phase.design_images = phase.design_images.map(url => fullImageUrl(url));
      if (phase.order_no) {
        try {
          const orderPhases = await api.getOrderPhases(phase.order_no);
          phase.progress = (orderPhases.list || []).map(p => ({
            phase_order: p.phase_order,
            label: (PHASE_TYPE_MAP[p.phase_type] || {}).label || p.phase_type,
            status: p.status,
            statusLabel: (PHASE_STATUS_MAP[p.status] || {}).label || p.status,
            isCurrent: p.id == phase.id,
            dotClass: p.id == phase.id ? 'active' :
              (p.status === 'owner_accepted' ? 'done' :
               p.status && p.status !== 'assigned' ? 'started' : 'pending'),
            lineClass: p.status === 'owner_accepted' ? 'done' : '',
          }));
        } catch (_) { /* 静默 */ }
      }
      const pageData = { phase, loading: false };
      if (this._readyFired) { this.setData(Object.assign({ ready: true }, pageData)); } else { this._pageData = pageData; }
    } catch (err) { this.setData({ loading: false, error: true, ready: true }); }
  },

  // 确认设计图
  async onConfirmDesign() {
    wx.showModal({
      title: '确认设计图', content: '确认设计图无误，进入施工阶段？', confirmText: '确认',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ acting: true });
        try {
          await api.directorConfirmDesign(this.data.phaseId);
          wx.requestSubscribeMessage({ tmplIds: [], success: () => {}, fail: () => {} });
          wx.showToast({ title: '已确认', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        } catch (err) { wx.showToast({ title: err?.message || '失败', icon: 'none' }); }
        finally { this.setData({ acting: false }); }
      },
    });
  },

  async onApprove() {
    wx.showModal({ title: '确认通过', content: '确定审核通过该完工图吗？', confirmText: '通过',
      success: async (res) => { if (!res.confirm) return; this.setData({ acting: true });
        try { await api.approveEngineeringDirector(this.data.phaseId); wx.requestSubscribeMessage({ tmplIds: [], success: () => {}, fail: () => {} });
          wx.showToast({ title: '已通过', icon: 'success' }); setTimeout(() => wx.navigateBack(), 1000); }
        catch (err) { wx.showToast({ title: err?.message || '操作失败', icon: 'none' }); } finally { this.setData({ acting: false }); } },
    });
  },

  onOpenReject() { this.setData({ rejectOpen: true, rejectReason: '' }); },
  onCloseReject() { this.setData({ rejectOpen: false }); },
  onReasonInput(e) { this.setData({ rejectReason: e.detail.value }); },

  async onSubmitReject() {
    if (!this.data.rejectReason.trim()) { wx.showToast({ title: '请填写驳回原因', icon: 'none' }); return; }
    this.setData({ rejecting: true });
    try { await api.rejectEngineeringDirector(this.data.phaseId, this.data.rejectReason.trim());
      wx.requestSubscribeMessage({ tmplIds: [], success: () => {}, fail: () => {} });
      wx.showToast({ title: '已驳回', icon: 'success' }); setTimeout(() => wx.navigateBack(), 1000); }
    catch (err) { wx.showToast({ title: err?.message || '操作失败', icon: 'none' }); } finally { this.setData({ rejecting: false }); }
  },

  onPreview(e) { const url = e.currentTarget.dataset.url; const urls = this.data.phase?.construction_images || [url]; wx.previewImage({ current: url, urls }); },
  onRetry() { this.loadDetail(); },
});
