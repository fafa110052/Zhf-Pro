/**
 * 设计师 — 上传设计图 + 查看审核结果
 */
const api = require('../../utils/api');
const { PHASE_STATUS_MAP, PHASE_TYPE_MAP, UPLOAD_MAX_COUNT } = require('../../utils/constants');
const { fullImageUrl } = require('../../utils/util');

Page({
  data: {
    phaseId: null,
    phase: null,
    loading: true,
    error: false,
    ready: false,
    // 上传
    selectedImages: [],
    uploading: false,
    PHASE_STATUS_MAP,
    PHASE_TYPE_MAP,
  },

  onLoad(options) {
    this.setData({ phaseId: options.phaseId });
    this.loadDetail();
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  async loadDetail() {
    if (!this.data.phaseId) return;
    this.setData({ loading: true, error: false, ready: false });
    try {
      const phase = await api.getPhaseDetail(this.data.phaseId);
      if (phase.design_images) {
        phase.design_images = phase.design_images.map(url => fullImageUrl(url));
      }
      // 加载项目进度（所有阶段）
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
      if (this._readyFired) {
        this.setData(Object.assign({ ready: true }, pageData));
      } else {
        this._pageData = pageData;
      }
    } catch (err) {
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  // 选择图片
  onChooseImages() {
    const remaining = UPLOAD_MAX_COUNT - this.data.selectedImages.length;
    if (remaining <= 0) {
      wx.showToast({ title: `最多${UPLOAD_MAX_COUNT}张`, icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ selectedImages: [...this.data.selectedImages, ...paths] });
      },
    });
  },

  // 删除
  onRemoveImage(e) {
    const idx = e.currentTarget.dataset.index;
    const imgs = [...this.data.selectedImages];
    imgs.splice(idx, 1);
    this.setData({ selectedImages: imgs });
  },

  // 提交
  async onSubmit() {
    if (this.data.selectedImages.length === 0) {
      wx.showToast({ title: '请至少选择一张设计图', icon: 'none' });
      return;
    }
    // 请求订阅
    wx.requestSubscribeMessage({
      tmplIds: [''],
      success: () => {},
      fail: () => {},
      complete: () => {},
    });

    this.setData({ uploading: true });
    try {
      const uploadedUrls = [];
      for (const path of this.data.selectedImages) {
        const res = await api.uploadImage(path);
        uploadedUrls.push(res.image_url);
      }
      await api.uploadDesignImages(this.data.phaseId, uploadedUrls);
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (err) {
      wx.showToast({ title: err?.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ uploading: false });
    }
  },

  onPreview(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ current: url, urls: [url] });
  },

  onRetry() { this.loadDetail(); },
});
