const api = require('../../utils/api');
const { PHASE_STATUS_MAP, PHASE_TYPE_MAP } = require('../../utils/constants');
const { fullImageUrl } = require('../../utils/util');

// 工程师需要操作的状态（显示红色提醒）
const ENGINEER_ACTION_STATUSES = ['construction_confirmed', 'engineering_director_rejected'];

Page({
  data: {
    list: [], allList: [], projects: [],
    loading: true, error: false, ready: false,
    mode: 'active',
    PHASE_STATUS_MAP, PHASE_TYPE_MAP,
  },

  onLoad(options) {
    this.setData({ mode: options.mode || 'active' });
    this.loadData();
  },
  onShow() { if (this._readyFired) { this.loadData(); } },
  onReady() {
    this._readyFired = true;
    if (this._pageData) { this.setData(Object.assign({ ready: true }, this._pageData)); this._pageData = null; }
  },
  onPullDownRefresh() { this.loadData().then(() => wx.stopPullDownRefresh()); },

  async loadData() {
    this.setData({ loading: true, error: false, ready: false });
    try {
      const res = await api.getEngineerPhases();
      const allList = (res.list || []).map(item => {
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
          needsAction: ENGINEER_ACTION_STATUSES.includes(item.status),
          designThumb: designImages.length > 0 ? fullImageUrl(designImages[0]) : '',
          constructionThumb: constructionImages.length > 0 ? fullImageUrl(constructionImages[0]) : '',
          designCount: designImages.length,
          constructionCount: constructionImages.length,
        };
      });
      const pageData = { allList, loading: false };
      if (this._readyFired) { this.setData(Object.assign({ ready: true }, pageData)); } else { this._pageData = pageData; }
      this.filterList();
    } catch (err) { this.setData({ loading: false, error: true, ready: true }); }
  },

  filterList() {
    const { mode } = this.data;

    // 全部项目：显示所有阶段，不按状态过滤
    if (mode === 'all') {
      let list = this.data.allList;
      const projectMap = {};
      list.forEach(item => {
        const key = item.order_no || 'unknown';
        if (!projectMap[key]) {
          projectMap[key] = { orderNo: item.order_no, propertyName: item.property_name || '—', roomNumber: item.room_number || '', phases: [] };
        }
        projectMap[key].phases.push(item);
      });
      this.setData({ list, projects: Object.values(projectMap) });
      return;
    }

    // mode=active：我的任务 — 跟自己有关但未竣工（排除 owner_accepted 和 locked）
    let list = this.data.allList.filter(item =>
      item.status !== 'owner_accepted' && item.status !== 'locked'
    );
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
    this.setData({ list, projects });
  },

  onTapItem(e) {
    wx.navigateTo({ url: `/pages/engineer-task-detail/index?phaseId=${e.currentTarget.dataset.id}` });
  },
  onRetry() { this.loadData(); },
});

function parseImagesJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch (_) { return []; }
}

