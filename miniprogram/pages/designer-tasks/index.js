/**
 * 设计师 — 待处理阶段列表
 */
const api = require('../../utils/api');
const { PHASE_STATUS_MAP, PHASE_TYPE_MAP } = require('../../utils/constants');
const { fullImageUrl } = require('../../utils/util');

Page({
  data: {
    list: [],
    loading: true,
    error: false,
    ready: false,
    mode: 'active',  // active=进行中 / all=全部
    PHASE_STATUS_MAP,
    PHASE_TYPE_MAP,
  },

  onLoad(options) {
    this.setData({ mode: options.mode || 'active' });
    this.loadData();
  },

  onShow() {
    if (this._readyFired) { this.loadData(); }
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    this.setData({ loading: true, error: false, ready: false });
    try {
      const res = await api.getDesignerPhases();
      const list = (res.list || []).map(item => {
        const designImages = parseImagesJson(item.design_images);
        const constructionImages = parseImagesJson(item.construction_images);
        // 列表仅需缩略图，删除完整图片数组以节省内存
        delete item.design_images;
        delete item.construction_images;
        delete item.owner_design_dispute_images;
        delete item.dispute_images;
        return {
          ...item,
          phaseLabel: (PHASE_TYPE_MAP[item.phase_type] || {}).label || item.phase_type,
          statusLabel: (PHASE_STATUS_MAP[item.status] || {}).label || item.status,
          statusColor: (PHASE_STATUS_MAP[item.status] || {}).colorClass || '',
          designThumb: designImages.length > 0 ? fullImageUrl(designImages[0]) : '',
          constructionThumb: constructionImages.length > 0 ? fullImageUrl(constructionImages[0]) : '',
          designCount: designImages.length,
          constructionCount: constructionImages.length,
        };
      });
      // 按项目分组
      const projectMap = {};
      list.forEach(item => {
        const key = item.order_no || 'unknown';
        if (!projectMap[key]) {
          projectMap[key] = {
            orderNo: item.order_no,
            propertyName: item.property_name || '—',
            roomNumber: item.room_number || '',
            phases: [],
          };
        }
        projectMap[key].phases.push(item);
      });
      const projects = Object.values(projectMap);
      // mode=active → 进行中（排除已完成/驳回） / mode=all → 仅已验收完成
      const filteredProjects = this.data.mode === 'active'
        ? projects.map(function(p) {
            return Object.assign({}, p, { phases: p.phases.filter(function(ph) { return isActivePhase(ph.status); }) });
          }).filter(function(p) { return p.phases.length > 0; })
        : projects.map(function(p) {
            return Object.assign({}, p, { phases: p.phases.filter(function(ph) { return ph.status === 'owner_accepted'; }) });
          }).filter(function(p) { return p.phases.length > 0; });
      const pageData = { projects: filteredProjects, loading: false };
      if (this._readyFired) {
        this.setData(Object.assign({ ready: true }, pageData));
      } else {
        this._pageData = pageData;
      }
    } catch (err) {
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  onTapItem(e) {
    const phaseId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/designer-task-detail/index?phaseId=${phaseId}` });
  },

  onRetry() { this.loadData(); },
});

/** 解析图片 JSON 字段（后端可能返回字符串或已解析数组） */
function parseImagesJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch (_) { return []; }
}

/** 是否进行中（未验收、未驳回） */
function isActivePhase(status) {
  return !['owner_accepted','design_director_rejected','design_admin_rejected',
    'engineering_director_rejected','construction_admin_rejected',
    'owner_design_disputed','owner_disputed'].includes(status);
}
