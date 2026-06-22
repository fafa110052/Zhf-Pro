/**
 * 选材申请详情页 — 通用项目详情页
 * 业主：审核设计图 + 验收
 * 其他角色：只读查看
 */
const api = require('../../utils/api');
const { ORDER_STATUS_MAP, PHASE_STATUS_MAP, PHASE_TYPE_MAP } = require('../../utils/constants');
const { fullImageUrl } = require('../../utils/util');

Page({
  data: {
    orderNo: '',
    detail: null,
    phases: [],
    activePhase: null,         // 当前活跃阶段

    // 施工进度模块显示控制
    showConstruction: false,

    // 人员信息（用于设计阶段 / 施工进度展示）
    designDesigner: null,
    designDirector: null,
    constructionEngineer: null,
    constructionEngineeringDirector: null,

    loading: true,
    error: false,
    ready: false,

    // 审核设计图（业主）
    designRejectOpen: false,
    designRejectReason: '',
    designRejectImages: [],
    designRejectUploading: false,
    designActing: false,

    // 验收（业主）
    disputeOpen: false,
    disputeReason: '',
    disputeImages: [],
    disputeUploading: false,
    acceptActing: false,

    ORDER_STATUS_MAP,
    PHASE_STATUS_MAP,
    PHASE_TYPE_MAP,
  },

  onLoad(options) {
    this.setData({ orderNo: options.orderNo || '' });
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
    if (!this.data.orderNo) return;
    this.setData({ loading: true, error: false, ready: false });

    try {
      const detail = await api.getMyMaterialOrderDetail(this.data.orderNo);
      let phases = [];
      let activePhase = null;
      let designPhase = null; // 设计阶段（独立于施工）

      // 转换施工阶段中的图片 URL
      if (detail.construction && detail.construction.phases) {
        detail.construction.phases = detail.construction.phases.map(p => ({
          ...p,
          design_images: (p.design_images || []).map(url => fullImageUrl(url)),
          construction_images: (p.construction_images || []).map(url => fullImageUrl(url)),
        }));
      }

      // 尝试加载施工阶段数据（取 activePhase 用于操作区 + 取 designPhase 用于设计阶段展示）
      try {
        const phaseResult = await api.getOrderPhases(this.data.orderNo);
        const rawPhases = phaseResult.phases || [];
        phases = rawPhases.map(p => ({
          ...p,
          design_images: (p.design_images || []).map(url => fullImageUrl(url)),
          construction_images: (p.construction_images || []).map(url => fullImageUrl(url)),
        }));
        // 找到当前需要业主操作的阶段
        activePhase = phases.find(p =>
          p.status === 'design_admin_approved' ||
          p.status === 'construction_admin_approved'
        ) || null;
        // 找到设计阶段（有设计图或处于设计审核流程中的阶段）
        designPhase = phases.find(p =>
          p.design_images && p.design_images.length > 0 &&
          ['design_uploaded','design_director_approved','design_admin_approved',
           'design_director_rejected','design_admin_rejected','owner_design_reviewed',
           'engineer_design_confirmed','owner_design_disputed'].includes(p.status)
        ) || null;
        // 如果找到了 activePhase（design_admin_approved），它也就是设计阶段
        if (!designPhase && activePhase && activePhase.status === 'design_admin_approved') {
          designPhase = activePhase;
        }
      } catch (_) {
        // 无施工数据则忽略
      }

      // 是否已进入施工阶段：设计已由业主确认，或有阶段进入施工状态
      const constructionStatuses = [
        'owner_design_reviewed', 'engineer_design_confirmed', 'construction_confirmed', 'construction_uploaded',
        'engineering_director_approved', 'engineering_director_rejected',
        'construction_admin_approved', 'construction_admin_rejected',
        'owner_accepted', 'owner_disputed',
      ];
      const showConstruction = (designPhase && constructionStatuses.includes(designPhase.status))
        || phases.some(p => constructionStatuses.includes(p.status));

      // 人员信息：设计阶段 → 设计师 + 设计总监；施工阶段 → 工程师 + 工程总监
      const designDesigner = designPhase?.designer || null;
      const designDirector = designPhase?.design_director || null;
      const engPhase = phases.find(p => p.engineer) || {};
      const constructionEngineer = engPhase.engineer || null;
      const dirPhase = phases.find(p => p.engineering_director) || {};
      const constructionEngineeringDirector = dirPhase.engineering_director || null;

      const pageData = {
        detail, phases, activePhase, designPhase,
        showConstruction,
        designDesigner, designDirector,
        constructionEngineer, constructionEngineeringDirector,
        loading: false,
      };
      if (this._readyFired) {
        this.setData(Object.assign({ ready: true }, pageData));
      } else {
        this._pageData = pageData;
      }
    } catch (err) {
      console.error('加载详情失败:', err);
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  // ═══════ 便捷属性 ═══════

  get activePhaseId() {
    return this.data.activePhase?.id || null;
  },

  // ═══════ 审核设计图（业主） ═══════

  onApproveDesign() {
    const that = this;
    wx.showModal({
      title: '审核设计图',
      content: '确认设计图通过审核？通过后工程师将开始施工。',
      success: async (res) => {
        if (!res.confirm) return;
        that.setData({ designActing: true });
        try {
          await api.approveOwnerDesign(that.data.activePhase.id);
          wx.showToast({ title: '审核通过', icon: 'success' });
          that.loadDetail();
        } catch (err) {
          wx.showToast({ title: err?.message || '操作失败', icon: 'none' });
        } finally {
          that.setData({ designActing: false });
        }
      },
    });
  },

  onOpenDesignReject() {
    this.setData({ designRejectOpen: true, designRejectReason: '', designRejectImages: [] });
  },

  onCloseDesignReject() {
    this.setData({ designRejectOpen: false });
  },

  onDesignReasonInput(e) {
    this.setData({ designRejectReason: e.detail.value });
  },

  onDesignChooseImages() {
    const that = this;
    const remain = 9 - (that.data.designRejectImages || []).length;
    if (remain <= 0) { wx.showToast({ title: '最多上传9张图片', icon: 'none' }); return; }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        const paths = (res.tempFiles || []).map(f => f.tempFilePath);
        that.setData({ designRejectImages: [...that.data.designRejectImages, ...paths] });
      },
    });
  },

  onDesignRemoveImage(e) {
    const idx = e.currentTarget.dataset.index;
    const arr = [...this.data.designRejectImages];
    arr.splice(idx, 1);
    this.setData({ designRejectImages: arr });
  },

  async onSubmitDesignDispute() {
    if (!this.data.designRejectReason.trim()) {
      wx.showToast({ title: '请填写驳回原因', icon: 'none' }); return;
    }
    this.setData({ designRejectUploading: true });
    try {
      // 上传图片
      const urls = [];
      for (const path of this.data.designRejectImages) {
        try {
          const res = await api.uploadImage(path);
          urls.push(res.url || res);
        } catch (_) { /* skip failed */ }
      }
      await api.disputeOwnerDesign(this.data.activePhase.id, {
        reason: this.data.designRejectReason.trim(),
        images: urls,
      });
      wx.showToast({ title: '已驳回', icon: 'success' });
      this.setData({ designRejectOpen: false });
      this.loadDetail();
    } catch (err) {
      wx.showToast({ title: err?.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ designRejectUploading: false });
    }
  },

  onPreviewDesignImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.activePhase?.design_images || [];
    wx.previewImage({ current: url, urls });
  },

  // ═══════ 验收（业主） ═══════

  onAcceptPhase() {
    const that = this;
    wx.showModal({
      title: '确认验收',
      content: '确认此阶段已完工，通过验收？',
      success: async (res) => {
        if (!res.confirm) return;
        that.setData({ acceptActing: true });
        try {
          await api.acceptPhase(that.data.activePhase.id);
          wx.showToast({ title: '验收通过', icon: 'success' });
          that.loadDetail();
        } catch (err) {
          wx.showToast({ title: err?.message || '操作失败', icon: 'none' });
        } finally {
          that.setData({ acceptActing: false });
        }
      },
    });
  },

  onOpenDispute() {
    this.setData({ disputeOpen: true, disputeReason: '', disputeImages: [] });
  },

  onCloseDispute() {
    this.setData({ disputeOpen: false });
  },

  onDisputeReasonInput(e) {
    this.setData({ disputeReason: e.detail.value });
  },

  onDisputeChooseImages() {
    const that = this;
    const remain = 9 - (that.data.disputeImages || []).length;
    if (remain <= 0) { wx.showToast({ title: '最多上传9张图片', icon: 'none' }); return; }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        const paths = (res.tempFiles || []).map(f => f.tempFilePath);
        that.setData({ disputeImages: [...that.data.disputeImages, ...paths] });
      },
    });
  },

  onDisputeRemoveImage(e) {
    const idx = e.currentTarget.dataset.index;
    const arr = [...this.data.disputeImages];
    arr.splice(idx, 1);
    this.setData({ disputeImages: arr });
  },

  async onSubmitDispute() {
    if (!this.data.disputeReason.trim()) {
      wx.showToast({ title: '请填写异议原因', icon: 'none' }); return;
    }
    this.setData({ disputeUploading: true });
    try {
      const urls = [];
      for (const path of this.data.disputeImages) {
        try {
          const res = await api.uploadImage(path);
          urls.push(res.url || res);
        } catch (_) { /* skip failed */ }
      }
      await api.disputePhase(this.data.activePhase.id, {
        reason: this.data.disputeReason.trim(),
        images: urls,
      });
      wx.showToast({ title: '已提交异议', icon: 'success' });
      this.setData({ disputeOpen: false });
      this.loadDetail();
    } catch (err) {
      wx.showToast({ title: err?.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ disputeUploading: false });
    }
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.activePhase?.construction_images || [];
    wx.previewImage({ current: url, urls });
  },

  onCopyOrderNo() {
    wx.setClipboardData({
      data: this.data.orderNo,
      success: () => wx.showToast({ title: '订单号已复制', icon: 'success' }),
    });
  },

  onRetry() { this.loadDetail(); },
});
