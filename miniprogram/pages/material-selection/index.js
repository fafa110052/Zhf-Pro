/**
 * 楼盘专属选材页
 *
 * 参照 work-detail 的 onReady + ready 模式：
 *   - 页面切换动画完成前仅显示 loading（填满全屏含 tabBar 区）
 *   - onReady 回调后再渲染内容，消除 TabBar 消失产生的视觉跳变
 */
const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    propertyId: null,
    propertyName: '',
    propertyCover: '',
    categories: [],
    selectedMap: {},
    selectedCount: 0,
    keyword: '',
    loading: true,
    error: false,
    ready: false,   // 页面过渡完成后才显示内容
  },

  onLoad(options) {
    const { propertyId, propertyName } = options;
    this.setData({
      propertyId: Number(propertyId),
      propertyName: decodeURIComponent(propertyName || ''),
    });
    wx.setNavigationBarTitle({ title: decodeURIComponent(propertyName || '选材') });
    this.loadMaterials();
  },

  /** 页面首次渲染完成 → 过渡动画结束 → 显示内容 */
  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  onPullDownRefresh() {
    this.loadMaterials().then(() => wx.stopPullDownRefresh());
  },

  async loadMaterials() {
    this.setData({ loading: true, error: false, ready: false });

    try {
      const result = await api.getPropertyMaterials(this.data.propertyId, this.data.keyword || undefined);
      const categories = (result.categories || []).map((cat) => ({
        category_id: cat.category_id,
        category_name: cat.category_name,
        expanded: true,
        materials: cat.materials.map((m) => ({ ...m, image_url: util.fullImageUrl(m.image_url), selected: false, in_stock: m.in_stock !== undefined ? m.in_stock : true, quantity: m.quantity ?? 0 })),
      }));
      this.restoreSelection(categories);

      const pageData = {
        categories,
        propertyCover: util.fullImageUrl(result.property_cover),
        loading: false,
      };

      // 如果页面 onReady 已触发 → 直接 setData；否则暂存
      if (this._readyFired) {
        this.setData(Object.assign({ ready: true }, pageData));
      } else {
        this._pageData = pageData;
      }
    } catch (err) {
      console.error('加载材料失败:', err);
      this.setData({ loading: false, error: true, ready: true });
    }
  },

  onSearchInput(e)  { this.setData({ keyword: e.detail.value }); },
  onSearchConfirm() { this.loadMaterials(); },
  onClearSearch()   { this.setData({ keyword: '' }); this.loadMaterials(); },

  onCategoryToggle(e) {
    const { index } = e.currentTarget.dataset;
    const categories = this.data.categories;
    categories[index].expanded = !categories[index].expanded;
    this.setData({ categories });
  },

  onMaterialSelect(e) {
    const { catIndex, matIndex } = e.currentTarget.dataset;
    const categories = this.data.categories;
    const category = categories[catIndex];
    const material = category.materials[matIndex];

    // 库存不足 — 不可选中
    if (!material.in_stock) {
      wx.showToast({ title: '该材料库存不足', icon: 'none', duration: 2000 });
      return;
    }

    if (material.selected) {
      material.selected = false;
      delete this.data.selectedMap[category.category_id];
    } else {
      category.materials.forEach((m, i) => { if (i !== matIndex) m.selected = false; });
      material.selected = true;
      this.data.selectedMap[category.category_id] = {
        material_id: material.id,
        category_id: category.category_id,
        material_name: material.name,
        brand: material.brand,
        unit_price: material.unit_price,
        price_unit: material.price_unit,
      };
    }

    this.setData({ categories, selectedCount: Object.keys(this.data.selectedMap).length });
  },

  restoreSelection(categories) {
    const sel = this.data.selectedMap;
    categories.forEach((cat) => {
      if (sel[cat.category_id]) {
        cat.materials.forEach((m) => {
          if (m.id === sel[cat.category_id].material_id) m.selected = true;
        });
      }
    });
  },

  onSubmit() {
    if (this.data.selectedCount === 0) {
      wx.showToast({ title: '请至少选择一种材料', icon: 'none' });
      return;
    }

    const items = [];
    const sel = this.data.selectedMap;
    for (const catId of Object.keys(sel)) {
      items.push({ material_id: sel[catId].material_id, category_id: sel[catId].category_id });
    }

    const app = getApp();
    app.globalData.materialSelection = {
      propertyId: this.data.propertyId,
      propertyName: this.data.propertyName,
      items,
      summary: Object.values(sel).map((s) => ({
        material_name: s.material_name,
        brand: s.brand,
        unit_price: s.unit_price,
        price_unit: s.price_unit,
      })),
    };

    wx.navigateTo({ url: '/pages/material-submit/index' });
  },

  onRetry() { this.loadMaterials(); },
});
