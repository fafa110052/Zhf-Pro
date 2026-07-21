// 风格选材向导页 — 7 步选材（手风琴品类 + 门系列 + 灯具套餐 + 草稿续选）
const api = require('../../utils/api');
const util = require('../../utils/util');

// Editorial 标题带各步英文副标题
const STEP_ENGLISH = {
  1: 'CERAMIC TILES',
  2: 'INTERIOR DOORS',
  3: 'BATHROOM',
  4: 'CUSTOM DECOR',
  5: 'SOFA',
  6: 'FURNITURE',
  7: 'LIGHTING',
};

const DRAFT_STORAGE_KEY = 'style_wizard_draft';

/**
 * 灯具套餐明细摘要，如"含5件：主厅灯×1 餐厅灯×1 卧室灯×3"
 */
function buildItemsSummary(items) {
  if (!items.length) return '';
  const order = [];
  const counts = {};
  items.forEach((it) => {
    const name = it.name || '灯具';
    if (counts[name] == null) {
      counts[name] = 0;
      order.push(name);
    }
    counts[name] += 1;
  });
  return `含${items.length}件：` + order.map((n) => `${n}×${counts[n]}`).join(' ');
}

Page({
  data: {
    ready: false,
    loading: true,
    error: false,

    step: 1,
    steps: [],              // progress-steps 标签（7 大品类名）
    categories: [],         // 按 page_number 排序的品类
    currentCategory: null,
    stepType: 'generic',    // generic | door | lighting
    stepEnglish: '',
    stepComplete: false,

    heroImage: '',          // 品类头图（后台配置，空则无头图）
    heroProgress: 0,        // 头图折叠进度 0~1（驱动虚化/缩小）

    // 规范选材结构（选材清单页直接消费）：
    // sub_{id}: {kind:'material',...} | {kind:'skip'}；door / lighting 为特殊 key
    selections: {},
    expandedSub: null,      // 展开中的子品类 id（第 2 步为门系列 id）
    pending: null,          // 待补充方向：{ subId, materialId, type:'lock'|'chaise', options }

    materialsCache: {},     // 材料缓存，key: 's' + subId
    loadingSubId: null,     // 展开体加载中的子品类/系列 id
    errorSubId: null,       // 展开体加载失败的子品类/系列 id

    doorSeries: [],
    doorLoaded: false,
    doorLoading: false,
    doorError: false,
    chosenSeriesId: null,   // 第 2 步已选门系列 id（先选系列，再选颜色）
    doorMaterialsCache: {}, // 门材料缓存，key: 's' + seriesId

    // 卫生间门系列（step 3 卫生间门子品类）
    bathDoorSeries: [],
    bathDoorLoaded: false,
    bathDoorLoading: false,
    bathDoorError: false,
    bathDoorChosenSeriesId: null,
    bathDoorMaterialsCache: {},

    lightingPackages: [],
    lightingLoaded: false,
    lightingLoading: false,
    lightingError: false,
    expandedPackage: null,  // 展开明细的套餐 id

    lightboxVisible: false,
    lightboxImages: [],
    lightboxIndex: 0,
    lightboxSelectedId: null,
  },

  onLoad(options) {
    this._styleId = Number(options.style_id) || null;
    this._entryStep = Math.min(7, Math.max(1, Number(options.step) || 1));
    this._lightboxSubId = null;
    this.loadData();
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
    // 首屏数据应用后再启动步骤内容加载，保证 this.data 可靠
    if (this._afterReady) {
      const fn = this._afterReady;
      this._afterReady = null;
      fn();
    }
  },

  // ═══════════════════════════════════════════
  // 首屏加载 + 草稿续选
  // ═══════════════════════════════════════════

  async loadData() {
    this.setData({ loading: true, error: false, ready: false });
    try {
      const list = (await api.getStyleCategories()) || [];
      const categories = list
        .slice()
        .sort((a, b) => a.page_number - b.page_number)
        .map((c) => Object.assign({}, c, {
          subcategories: (c.subcategories || []).slice().sort((a, b) => a.sort_order - b.sort_order)
            .map((s) => Object.assign({}, s, {
              isBathDoor: (s.name || '').indexOf('卫生间门') !== -1,
            })),
        }));

      // 草稿续选：登录走服务端，未登录走本地缓存
      let step = this._entryStep;
      let selections = {};
      const draft = await this.resolveDraft();
      if (draft) {
        step = Math.min(7, Math.max(1, draft.step || 1));
        selections = draft.selections || {};
      }

      const derived = this.deriveStep(step, categories, selections);
      const pageData = Object.assign({
        loading: false,
        error: false,
        categories,
        steps: categories.map((c) => ({ label: c.name })),
        selections,
      }, derived);

      if (this._readyFired) {
        this.setData(Object.assign({ ready: true }, pageData));
        this.loadStepBody(derived);
      } else {
        this._pageData = pageData;
        this._afterReady = () => this.loadStepBody(derived);
      }
    } catch (err) {
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  onRetry() {
    this.loadData();
  },

  /**
   * 头图折叠交互：表单卡片上滑覆盖头图，头图随进度虚化缩小。
   * 进度量化到 0.05 一档，避免每帧 setData；过渡由 CSS transition 平滑。
   */
  onPageScroll(e) {
    if (!this.data.heroImage) return;
    const range = 170; // px，≈ 卡片初始距顶 340rpx 的滚动行程
    let p = e.scrollTop / range;
    p = p < 0 ? 0 : (p > 1 ? 1 : p);
    p = Math.round(p * 20) / 20;
    if (p !== this.data.heroProgress) this.setData({ heroProgress: p });
  },

  /**
   * 拉取草稿并询问是否继续；返回 { step, selections } 或 null（无草稿/重新开始）
   */
  async resolveDraft() {
    const app = getApp();
    let draft = null;

    if (app.globalData.token) {
      try {
        const remote = await api.getDraft(); // request 已解包：草稿对象或 null
        if (remote && remote.style_id === this._styleId) {
          let sel = remote.data;
          if (typeof sel === 'string') {
            try { sel = JSON.parse(sel); } catch (e) { sel = {}; }
          }
          draft = { step: remote.current_step || 1, selections: sel || {} };
        }
      } catch (e) {
        // 草稿拉取失败不阻断向导
      }
    } else {
      let local = null;
      try { local = wx.getStorageSync(DRAFT_STORAGE_KEY); } catch (e) {}
      if (local && local.style_id === this._styleId) {
        draft = { step: local.step || 1, selections: local.selections || {} };
      }
    }

    if (!draft || !Object.keys(draft.selections).length) return null;

    const resume = await new Promise((resolve) => {
      wx.showModal({
        title: '继续上次选材',
        content: `上次选到第${draft.step}步，是否继续？`,
        confirmText: '继续',
        cancelText: '重新开始',
        success: (r) => resolve(!!r.confirm),
        fail: () => resolve(false),
      });
    });
    return resume ? draft : null;
  },

  // ═══════════════════════════════════════════
  // 步骤切换
  // ═══════════════════════════════════════════

  /**
   * 计算某一步的派生数据（品类/类型/自动展开项/完成态），不做 setData
   */
  deriveStep(step, categoriesArg, selectionsArg) {
    const categories = categoriesArg || this.data.categories;
    const selections = selectionsArg || this.data.selections;
    const currentCategory = categories.find((c) => c.page_number === step) || categories[step - 1] || null;
    const stepType = step === 2 ? 'door' : (step === 7 ? 'lighting' : 'generic');

    let expandedSub = null;
    if (stepType === 'generic' && currentCategory) {
      const next = (currentCategory.subcategories || []).find((s) => !selections['sub_' + s.id]);
      expandedSub = next ? next.id : null;
    }

    return {
      step,
      currentCategory,
      stepType,
      stepEnglish: STEP_ENGLISH[step] || '',
      heroImage: currentCategory && currentCategory.cover_image ? util.fullImageUrl(currentCategory.cover_image) : '',
      heroProgress: 0,
      expandedSub,
      // 进入门步骤时，从已确认的选择恢复系列（草稿续选/回退查看时颜色区直接可见）
      chosenSeriesId: stepType === 'door' && selections.door ? selections.door.series_id : null,
      pending: null,
      expandedPackage: null,
      loadingSubId: null,
      errorSubId: null,
      stepComplete: this.isStepComplete(step, selections, categories),
    };
  },

  enterStep(step) {
    const derived = this.deriveStep(step);
    this.setData(derived);
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    this.loadStepBody(derived);
  },

  loadStepBody(derived) {
    if (derived.stepType === 'door') {
      this.ensureDoorSeries();
      if (derived.chosenSeriesId) this.ensureDoorMaterials(derived.chosenSeriesId);
    } else if (derived.stepType === 'lighting') this.ensureLightingPackages();
    else if (derived.expandedSub != null) this.ensureMaterials(derived.expandedSub);
  },

  isStepComplete(step, selectionsArg, categoriesArg) {
    const selections = selectionsArg || this.data.selections;
    if (step === 2) return !!selections.door;
    if (step === 7) return !!selections.lighting;
    const categories = categoriesArg || this.data.categories;
    const cat = categories.find((c) => c.page_number === step) || categories[step - 1];
    if (!cat || !(cat.subcategories || []).length) return true;
    return cat.subcategories.every((s) => !!selections['sub_' + s.id]);
  },

  onPrevStep() {
    if (this.data.step <= 1) return;
    this.enterStep(this.data.step - 1);
    this.persistDraft();
  },

  onNextStep() {
    if (!this.data.stepComplete) {
      wx.showToast({ title: '请先完成本步选择', icon: 'none' });
      return;
    }
    if (this.data.step < 7) {
      this.enterStep(this.data.step + 1);
      this.persistDraft();
      return;
    }
    // 第 7 步完成 → 选材清单（selections 对象过大不走 URL，用 globalData 交接）
    const app = getApp();
    app.globalData.styleWizardHandoff = {
      style_id: this._styleId,
      selections: this.data.selections,
    };
    wx.navigateTo({ url: '/pages/style-summary/index' });
  },

  // ═══════════════════════════════════════════
  // 通用步骤：子品类手风琴 + 材料网格
  // ═══════════════════════════════════════════

  onToggleSub(e) {
    const id = e.currentTarget.dataset.id;
    const sub = this.findSub(id);
    if (this.data.expandedSub === id) {
      this.setData({ expandedSub: null, pending: null });
      return;
    }
    this.setData({ expandedSub: id, pending: null });
    if (this.isBathDoorSub(sub)) {
      this.ensureBathDoorSeries();
      if (this.data.bathDoorChosenSeriesId) this.ensureBathDoorMaterials(this.data.bathDoorChosenSeriesId);
    } else {
      this.ensureMaterials(id);
    }
  },

  async ensureMaterials(subId) {
    if (!this._styleId) return;
    if (this.data.materialsCache['s' + subId]) {
      if (this.data.loadingSubId === subId) this.setData({ loadingSubId: null });
      return;
    }
    this.setData({ loadingSubId: subId, errorSubId: null });
    try {
      const list = (await api.getStyleMaterials(this._styleId, subId)) || [];
      const materials = list.map((m) => {
        // 弹性字段：适用范围（JSON 数组）与属性（JSON 对象）在加载时解析，WXML 直接消费
        let scopes = [];
        try { scopes = JSON.parse(m.applicable_scopes) || []; } catch (e) {}
        if (!Array.isArray(scopes)) scopes = [];
        let attrList = [];
        try {
          const attrs = JSON.parse(m.attributes);
          if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
            attrList = Object.keys(attrs).map((k) => ({ k, v: attrs[k] }));
          }
        } catch (e) {}
        return Object.assign({}, m, {
          image_url: util.fullImageUrl(m.image_url),
          brand_logo: util.fullImageUrl(m.brand_logo),
          brand_model: [m.brand, m.model].filter(Boolean).join(' '),
          scopes,
          attrList,
        });
      });
      const update = {};
      update['materialsCache.s' + subId] = materials;
      if (this.data.loadingSubId === subId) update.loadingSubId = null;
      this.setData(update);
    } catch (e) {
      if (this.data.loadingSubId === subId) this.setData({ loadingSubId: null, errorSubId: subId });
    }
  },

  onRetryMaterials(e) {
    this.ensureMaterials(e.currentTarget.dataset.subId);
  },

  onSelectMaterial(e) {
    const subId = e.currentTarget.dataset.subId;
    const index = e.currentTarget.dataset.index;
    const mat = (this.data.materialsCache['s' + subId] || [])[index];
    if (!mat) return;
    this.pickMaterial(subId, mat);
  },

  /**
   * 材料点选入口（卡片/放大预览共用）：
   * 卫生间门先选锁向、带贵妃位沙发先选贵妃方向，其余直接完成
   */
  pickMaterial(subId, mat) {
    const sub = this.findSub(subId);
    if (sub && sub.isBathDoor) {
      this.setData({
        pending: { subId, materialId: mat.id, type: 'lock', options: ['左锁右内开', '右锁左内开'] },
      });
      return;
    }
    if (mat.has_chaise) {
      this.setData({
        pending: { subId, materialId: mat.id, type: 'chaise', options: ['左贵妃', '右贵妃'] },
      });
      return;
    }
    this.completeMaterial(subId, mat, {});
  },

  onChooseDirection(e) {
    const value = e.currentTarget.dataset.value;
    const pending = this.data.pending;
    if (!pending) return;
    const sub = this.findSub(pending.subId);
    // 卫生间门走门系列完成路径
    if (pending.type === 'lock' && this.isBathDoorSub(sub)) {
      const seriesId = this.data.bathDoorChosenSeriesId;
      const series = this.data.bathDoorSeries.find((s) => s.id === seriesId);
      const dm = (this.data.bathDoorMaterialsCache['s' + seriesId] || []).find((m) => m.id === pending.materialId);
      if (!dm || !series) return;
      this.completeBathDoor(pending.subId, dm, series, value);
      return;
    }
    const mat = (this.data.materialsCache['s' + pending.subId] || []).find((m) => m.id === pending.materialId);
    if (!mat) return;
    const extra = pending.type === 'lock' ? { lock_direction: value } : { chaise_direction: value };
    this.completeMaterial(pending.subId, mat, extra);
  },

  completeMaterial(subId, mat, extra) {
    const entry = Object.assign({
      kind: 'material',
      id: mat.id,
      name: mat.name || mat.brand, // 瓷砖类无名称，回退品牌作标题（选中标签/总结页/快照共用）
      image_url: mat.image_url,
      brand: mat.brand,
      model: mat.model,
      specs: mat.specs,
      original_price: mat.original_price,
      discount_price: mat.discount_price,
      chaise_direction: null,
    }, extra);
    this.applySelection('sub_' + subId, entry);
  },

  onSkipSub(e) {
    this.applySelection('sub_' + e.currentTarget.dataset.subId, { kind: 'skip' });
  },

  findSub(subId) {
    const cat = this.data.currentCategory;
    return cat ? (cat.subcategories || []).find((s) => s.id === subId) : null;
  },

  /**
   * 写入选择 → 收起当前项 → 自动展开下一个未完成子品类 → 存草稿
   */
  applySelection(key, entry) {
    const selections = Object.assign({}, this.data.selections);
    selections[key] = entry;
    const update = {
      selections,
      pending: null,
      stepComplete: this.isStepComplete(this.data.step, selections),
    };
    if (this.data.stepType === 'generic') {
      const cat = this.data.currentCategory;
      const next = cat ? (cat.subcategories || []).find((s) => !selections['sub_' + s.id]) : null;
      update.expandedSub = next ? next.id : null;
      this.setData(update);
      if (next) this.ensureMaterials(next.id);
    } else {
      update.expandedSub = null;
      this.setData(update);
    }
    this.persistDraft();
  },

  // ═══════════════════════════════════════════
  // 第 2 步：木门系列
  // ═══════════════════════════════════════════

  async ensureDoorSeries() {
    if (this.data.doorLoaded || this.data.doorLoading) return;
    this.setData({ doorLoading: true, doorError: false });
    try {
      const list = (await api.getDoorSeries(2)) || [];
      const doorSeries = list.map((s) => Object.assign({}, s, {
        image_url: util.fullImageUrl(s.image_url),
      }));
      this.setData({ doorSeries, doorLoaded: true, doorLoading: false });
    } catch (e) {
      this.setData({ doorLoading: false, doorError: true });
    }
  },

  onRetryDoorSeries() {
    this.ensureDoorSeries();
  },

  onSkipDoor() {
    this.applySelection('door', { kind: 'skip' });
  },

  /**
   * 先选系列（单选）：切换查看不清已确认的选择，选中新颜色时才覆盖
   */
  onSelectSeries(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.chosenSeriesId === id) return;
    this.setData({ chosenSeriesId: id });
    this.ensureDoorMaterials(id);
  },

  async ensureDoorMaterials(seriesId) {
    if (this.data.doorMaterialsCache['s' + seriesId]) {
      if (this.data.loadingSubId === seriesId) this.setData({ loadingSubId: null });
      return;
    }
    this.setData({ loadingSubId: seriesId, errorSubId: null });
    try {
      const list = (await api.getDoorMaterials(seriesId, this._styleId)) || [];
      const materials = list.map((m) => Object.assign({}, m, {
        image_url: util.fullImageUrl(m.image_url),
      }));
      const update = {};
      update['doorMaterialsCache.s' + seriesId] = materials;
      if (this.data.loadingSubId === seriesId) update.loadingSubId = null;
      this.setData(update);
    } catch (e) {
      if (this.data.loadingSubId === seriesId) this.setData({ loadingSubId: null, errorSubId: seriesId });
    }
  },

  onRetryDoorMaterials(e) {
    this.ensureDoorMaterials(e.currentTarget.dataset.seriesId);
  },

  onSelectDoor(e) {
    const seriesId = this.data.chosenSeriesId;
    const id = e.currentTarget.dataset.id;
    const series = this.data.doorSeries.find((s) => s.id === seriesId);
    const dm = (this.data.doorMaterialsCache['s' + seriesId] || []).find((m) => m.id === id);
    if (!series || !dm) return;
    this.applySelection('door', {
      kind: 'door',
      series_id: series.id,
      series_name: series.name,
      color_id: dm.color_id,
      color_name: dm.color_name,
      image_url: dm.image_url,
      original_price: dm.original_price,
      discount_price: dm.discount_price,
    });
  },

  // ═══════════════════════════════════════════
  // 卫生间门系列（step 3 卫生间门子品类）
  // ═══════════════════════════════════════════

  isBathDoorSub(sub) {
    return sub && sub.isBathDoor;
  },

  async ensureBathDoorSeries() {
    if (this.data.bathDoorLoaded || this.data.bathDoorLoading) return;
    this.setData({ bathDoorLoading: true, bathDoorError: false });
    try {
      const list = (await api.getDoorSeries(3)) || [];
      const bathDoorSeries = list.map((s) => Object.assign({}, s, {
        image_url: util.fullImageUrl(s.image_url),
      }));
      this.setData({ bathDoorSeries, bathDoorLoaded: true, bathDoorLoading: false });
    } catch (e) {
      this.setData({ bathDoorLoading: false, bathDoorError: true });
    }
  },

  onRetryBathDoorSeries() {
    this.setData({ bathDoorLoaded: false, bathDoorError: false });
    this.ensureBathDoorSeries();
  },

  onSelectBathDoorSeries(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.bathDoorChosenSeriesId === id) return;
    this.setData({ bathDoorChosenSeriesId: id });
    this.ensureBathDoorMaterials(id);
  },

  async ensureBathDoorMaterials(seriesId) {
    if (this.data.bathDoorMaterialsCache['s' + seriesId]) {
      if (this.data.loadingSubId === seriesId) this.setData({ loadingSubId: null });
      return;
    }
    this.setData({ loadingSubId: seriesId, errorSubId: null });
    try {
      const list = (await api.getDoorMaterials(seriesId, this._styleId)) || [];
      const materials = list.map((m) => Object.assign({}, m, {
        image_url: util.fullImageUrl(m.image_url),
      }));
      const update = {};
      update['bathDoorMaterialsCache.s' + seriesId] = materials;
      if (this.data.loadingSubId === seriesId) update.loadingSubId = null;
      this.setData(update);
    } catch (e) {
      if (this.data.loadingSubId === seriesId) this.setData({ loadingSubId: null, errorSubId: seriesId });
    }
  },

  onRetryBathDoorMaterials(e) {
    this.ensureBathDoorMaterials(e.currentTarget.dataset.seriesId);
  },

  onSelectBathDoorColor(e) {
    const seriesId = this.data.bathDoorChosenSeriesId;
    const subId = this.data.expandedSub;
    const id = e.currentTarget.dataset.id;
    const series = this.data.bathDoorSeries.find((s) => s.id === seriesId);
    const dm = (this.data.bathDoorMaterialsCache['s' + seriesId] || []).find((m) => m.id === id);
    if (!series || !dm) return;
    this.setData({
      pending: { subId, materialId: dm.id, type: 'lock', options: ['左锁右内开', '右锁左内开'] },
    });
  },

  completeBathDoor(subId, dm, series, lockDirection) {
    const entry = {
      kind: 'door',
      series_id: series.id,
      series_name: series.name,
      color_id: dm.color_id,
      color_name: dm.color_name,
      image_url: dm.image_url,
      original_price: dm.original_price,
      discount_price: dm.discount_price,
      lock_direction: lockDirection,
      name: [series.name, dm.color_name].filter(Boolean).join(' · '),
    };
    this.applySelection('sub_' + subId, entry);
  },

  // ═══════════════════════════════════════════
  // 第 7 步：灯具套餐
  // ═══════════════════════════════════════════

  async ensureLightingPackages() {
    if (this.data.lightingLoaded || this.data.lightingLoading) return;
    this.setData({ lightingLoading: true, lightingError: false });
    try {
      const list = (await api.getLightingPackages()) || [];
      const lightingPackages = list.map((p) => {
        const items = (p.items || []).map((it) => Object.assign({}, it, {
          image_url: util.fullImageUrl(it.image_url),
          attrsLine: [it.size, it.wattage, it.material, it.color, it.light_source, it.control_method, it.illumination_area]
            .filter(Boolean)
            .join(' / '),
        }));
        return Object.assign({}, p, {
          image_url: util.fullImageUrl(p.image_url),
          items,
          itemsSummary: buildItemsSummary(items),
        });
      });
      this.setData({ lightingPackages, lightingLoaded: true, lightingLoading: false });
    } catch (e) {
      this.setData({ lightingLoading: false, lightingError: true });
    }
  },

  onRetryLighting() {
    this.ensureLightingPackages();
  },

  onSkipLighting() {
    this.applySelection('lighting', { kind: 'skip' });
  },

  onTogglePackage(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedPackage: this.data.expandedPackage === id ? null : id });
  },

  onSelectLighting(e) {
    const id = e.currentTarget.dataset.id;
    const pkg = this.data.lightingPackages.find((p) => p.id === id);
    if (!pkg) return;
    this.applySelection('lighting', {
      kind: 'lighting',
      package_id: pkg.id,
      name: pkg.name,
      image_url: pkg.image_url,
      original_price: pkg.original_price,
      discount_price: pkg.discount_price,
    });
  },

  // ═══════════════════════════════════════════
  // 图片放大预览
  // ═══════════════════════════════════════════

  onZoomImage(e) {
    const subId = e.currentTarget.dataset.subId;
    const index = e.currentTarget.dataset.index;
    const mats = this.data.materialsCache['s' + subId] || [];
    if (!mats.length) return;
    const sel = this.data.selections['sub_' + subId];
    this._lightboxSubId = subId;
    this.setData({
      lightboxImages: mats.map((m) => ({ id: m.id, url: m.image_url, name: m.name || m.brand, model: m.model, specs: m.specs })),
      lightboxIndex: index,
      lightboxSelectedId: sel && sel.kind === 'material' ? sel.id : null,
      lightboxVisible: true,
    });
  },

  onLightboxClose() {
    this.setData({ lightboxVisible: false });
  },

  onLightboxSelect(e) {
    const subId = this._lightboxSubId;
    const mat = (this.data.materialsCache['s' + subId] || [])[e.detail.index];
    this.setData({ lightboxVisible: false });
    if (subId != null && mat) this.pickMaterial(subId, mat);
  },

  // ═══════════════════════════════════════════
  // 草稿
  // ═══════════════════════════════════════════

  /**
   * 每次选择变化：本地缓存必存；已登录再同步服务端（fire-and-forget）
   */
  persistDraft() {
    const payload = {
      style_id: this._styleId,
      step: this.data.step,
      selections: this.data.selections,
    };
    try { wx.setStorageSync(DRAFT_STORAGE_KEY, payload); } catch (e) {}
    const app = getApp();
    if (app.globalData.token) {
      api.saveDraft({
        style_id: this._styleId,
        current_step: this.data.step,
        data: this.data.selections,
      }).catch(() => {});
    }
  },
});
