const api = require('../../utils/api');
const { PHASE_STATUS_MAP, PHASE_TYPE_MAP, UPLOAD_MAX_COUNT, TEMPLATE_IDS } = require('../../utils/constants');
const { fullImageUrl } = require('../../utils/util');

Page({
  data: {
    phaseId: null, phase: null,
    loading: true, error: false, ready: false,
    // 上传完工图
    selectedImages: [], uploading: false,
    constructionDescription: '',
    acting: false,
    PHASE_STATUS_MAP, PHASE_TYPE_MAP,
  },

  onLoad(options) { this.setData({ phaseId: options.phaseId }); this.loadDetail(); },
  onReady() {
    this._readyFired = true;
    if (this._pageData) { this.setData(Object.assign({ ready: true }, this._pageData)); this._pageData = null; }
  },

  async loadDetail() {
    if (!this.data.phaseId) return;
    this.setData({ loading: true, error: false, ready: false });
    try {
      const phase = await api.getPhaseDetail(this.data.phaseId);
      if (phase.design_images) phase.design_images = phase.design_images.map(url => fullImageUrl(url));
      if (phase.construction_images) phase.construction_images = phase.construction_images.map(url => fullImageUrl(url));
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

  // 确认设计
  async onConfirmDesign() {
    wx.showModal({
      title: '确认设计图', content: '确认设计图无误？确认后需工程总监二次确认方可施工。', confirmText: '确认',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ acting: true });
        try {
          await api.confirmDesign(this.data.phaseId);
          wx.requestSubscribeMessage({ tmplIds: [TEMPLATE_IDS.todoNotify, TEMPLATE_IDS.reviewResult], success: () => {}, fail: () => {} });
          wx.showToast({ title: '已确认', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        } catch (err) { wx.showToast({ title: err?.message || '失败', icon: 'none' }); }
        finally { this.setData({ acting: false }); }
      },
    });
  },

  // 选图
  onChooseImages() {
    const remaining = UPLOAD_MAX_COUNT - this.data.selectedImages.length;
    if (remaining <= 0) { wx.showToast({ title: `最多${UPLOAD_MAX_COUNT}张`, icon: 'none' }); return; }
    wx.chooseMedia({
      count: remaining, mediaType: ['image'], sizeType: ['compressed'], sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ selectedImages: [...this.data.selectedImages, ...res.tempFiles.map(f => f.tempFilePath)] });
      },
    });
  },

  onRemoveImage(e) {
    const imgs = [...this.data.selectedImages];
    imgs.splice(e.currentTarget.dataset.index, 1);
    this.setData({ selectedImages: imgs });
  },

  onDescriptionInput(e) {
    this.setData({ constructionDescription: e.detail.value });
  },

  // 提交完工图
  async onSubmitConstruction() {
    if (this.data.selectedImages.length === 0) {
      wx.showToast({ title: '请至少选择一张完工图', icon: 'none' }); return;
    }
    wx.requestSubscribeMessage({ tmplIds: [TEMPLATE_IDS.todoNotify, TEMPLATE_IDS.reviewResult], success: () => {}, fail: () => {} });
    this.setData({ uploading: true });
    try {
      const urls = [];
      for (const path of this.data.selectedImages) {
        const r = await api.uploadImage(path);
        urls.push(r.image_url);
      }
      await api.uploadConstructionImages(this.data.phaseId, urls, this.data.constructionDescription);
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (err) { wx.showToast({ title: err?.message || '失败', icon: 'none' }); }
    finally { this.setData({ uploading: false }); }
  },

  onPreview(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ current: url, urls: [url] });
  },
  onRetry() { this.loadDetail(); },
});
