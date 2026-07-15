/**
 * 作品上传 / 编辑页（设计师端）
 *
 * 功能：
 *   1. 作品基本信息表单（标题/描述/分类/面积/预算）
 *   2. 分类选择（户型/空间/风格 — 从后端动态获取）
 *   3. 多图上传（拍照/相册）→ 批量上传到服务器
 *   4. 保存草稿 / 提交审核
 *   5. 编辑模式（传入 id 则进入编辑）
 *
 * API 字段对照：
 *   前端 form.area_sqm        → 后端 area_sqm
 *   前端 form.budget_min      → 后端 budget_min
 *   前端 form.budget_max      → 后端 budget_max
 *   分类 categories.house_type / categories.area / categories.style
 */
const { getCategories, getMyWorkDetail, createWork, updateWork, submitWork, uploadImage } = require('../../utils/api');
const { fullImageUrl, showConfirm, debounce } = require('../../utils/util');
const { WORK_UPLOAD_MAX_COUNT } = require('../../utils/constants');

// 草稿存储 key
const DRAFT_KEY = 'work_upload_draft';
// 自动保存间隔（毫秒）
const AUTO_SAVE_DELAY = 1500;

Page({
  data: {
    isEdit: false,
    editId: '',
    maxCount: WORK_UPLOAD_MAX_COUNT,  // 作品图片上限（wxml 用）

    // 表单
    form: {
      title: '',
      description: '',
      house_type_id: '',
      area_category_id: '',
      style_category_id: '',
      area_sqm: '',
      budget_min: '',
      budget_max: '',
      vr_url: '',
    },

    // 图片
    images: [],          // 已上传的图片 [{id, url}]
    localImages: [],     // 本地待上传图片路径
    coverImageIndex: 0,  // 当前设为封面的图片索引（0 = 第一张）

    // 分类选项
    categories: {
      house_type: [],    // 户型
      area: [],          // 装修空间（API 返回 area 而非 area_category）
      style: [],         // 装修风格（API 返回 style 而非 style_category）
    },

    // 分类选择器索引（picker 用）
    houseTypeIndex: -1,
    areaCategoryIndex: -1,
    styleCategoryIndex: -1,

    loading: false,
    saving: false,
    submitting: false,
    draftRestored: false,   // 是否已提醒恢复草稿
    hasDraft: false,        // 是否有可恢复的草稿
  },

  // 延迟保存草稿（在 onLoad 中初始化）
  _saveDraftDebounced: null,

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ isEdit: true, editId: id });
      wx.setNavigationBarTitle({ title: '编辑作品' });
    }

    // 初始化防抖保存
    this._saveDraftDebounced = debounce(this._doSaveDraft.bind(this), AUTO_SAVE_DELAY);

    this.loadCategories();

    if (id) {
      this.loadWorkDetail(id);
    } else {
      // 新建模式：尝试恢复草稿
      this._checkDraft();
    }
  },

  /**
   * 页面隐藏时保存一次草稿
   */
  onHide() {
    if (!this.data.isEdit && this._hasFormContent()) {
      this._doSaveDraft();
    }
  },

  /**
   * 检查是否有可恢复的草稿
   */
  _checkDraft() {
    try {
      const draft = wx.getStorageSync(DRAFT_KEY);
      if (draft && (draft.form || (draft.images && draft.images.length > 0))) {
        this.setData({ hasDraft: true });
        wx.showModal({
          title: '恢复草稿',
          content: '检测到上次未完成的编辑，是否恢复？',
          confirmText: '恢复',
          cancelText: '放弃',
          success: (res) => {
            if (res.confirm) {
              this._restoreDraft(draft);
            } else {
              this._clearDraft();
              this.setData({ hasDraft: false });
            }
            this.setData({ draftRestored: true });
          },
        });
      }
    } catch (e) {
      // ignore
    }
    this.setData({ draftRestored: true });
  },

  /**
   * 恢复草稿数据
   */
  _restoreDraft(draft) {
    const updates = { hasDraft: false };

    if (draft.form) {
      updates.form = draft.form;
    }
    if (draft.images && draft.images.length > 0) {
      updates.images = draft.images;
    }
    if (draft.houseTypeIndex !== undefined) updates.houseTypeIndex = draft.houseTypeIndex;
    if (draft.areaCategoryIndex !== undefined) updates.areaCategoryIndex = draft.areaCategoryIndex;
    if (draft.styleCategoryIndex !== undefined) updates.styleCategoryIndex = draft.styleCategoryIndex;
    if (draft.coverImageIndex !== undefined) updates.coverImageIndex = draft.coverImageIndex;

    this.setData(updates, () => {
      this._doSaveDraft(); // 更新草稿时间戳
    });

    wx.showToast({ title: '草稿已恢复', icon: 'success' });
  },

  /**
   * 是否有表单内容（决定是否保存草稿）
   */
  _hasFormContent() {
    const { form, images } = this.data;
    return !!(
      form.title ||
      form.description ||
      form.house_type_id ||
      form.area_category_id ||
      form.style_category_id ||
      form.area_sqm ||
      form.budget_min ||
      form.budget_max ||
      form.vr_url ||
      images.length > 0
    );
  },

  /**
   * 保存草稿到本地存储
   */
  _doSaveDraft() {
    if (this.data.isEdit) return; // 编辑模式不保存草稿
    if (!this._hasFormContent()) {
      // 内容为空时清除草稿
      this._clearDraft();
      return;
    }

    const draft = {
      form: this.data.form,
      images: this.data.images,
      houseTypeIndex: this.data.houseTypeIndex,
      areaCategoryIndex: this.data.areaCategoryIndex,
      styleCategoryIndex: this.data.styleCategoryIndex,
      coverImageIndex: this.data.coverImageIndex,
      _savedAt: Date.now(),
    };

    try {
      wx.setStorageSync(DRAFT_KEY, draft);
    } catch (e) {
      console.warn('草稿保存失败:', e);
    }
  },

  /**
   * 请求保存草稿（防抖）
   */
  _requestSaveDraft() {
    if (this._saveDraftDebounced) {
      this._saveDraftDebounced();
    }
  },

  /**
   * 清除本地草稿
   */
  _clearDraft() {
    try {
      wx.removeStorageSync(DRAFT_KEY);
    } catch (e) {
      // ignore
    }
  },

  /**
   * 加载分类选项
   */
  async loadCategories() {
    try {
      const cats = await getCategories();
      // API 返回 { house_type:[], area:[], style:[] }
      this.setData({
        categories: {
          house_type: cats.house_type || [],
          area: cats.area || [],
          style: cats.style || [],
        },
      });
    } catch (err) {
      console.error('分类加载失败:', err);
      wx.showToast({ title: '分类加载失败', icon: 'none' });
    }
  },

  /**
   * 加载已有作品详情（编辑模式）
   */
  async loadWorkDetail(id) {
    this.setData({ loading: true });
    try {
      const work = await getMyWorkDetail(id);
      this.setData({
        form: {
          title: work.title || '',
          description: work.description || '',
          house_type_id: work.house_type_id || '',
          area_category_id: work.area_category_id || '',
          style_category_id: work.style_category_id || '',
          area_sqm: work.area_sqm != null ? String(work.area_sqm) : '',
          budget_min: work.budget_min != null ? String(work.budget_min) : '',
          budget_max: work.budget_max != null ? String(work.budget_max) : '',
          vr_url: work.vr_url || '',
        },
        images: (work.images || []).map((img) => ({
          id: img.id,
          url: fullImageUrl(img.image_url),
        })),
      });
      // 根据现有封面图找到其索引
      var coverIdx = 0;
      if (work.cover_image && work.images) {
        var found = work.images.findIndex(function (img) {
          return fullImageUrl(img.image_url) === fullImageUrl(work.cover_image);
        });
        if (found >= 0) coverIdx = found;
      }
      this.setData({ coverImageIndex: coverIdx });
      // 设置 picker 默认索引
      this.updatePickerIndex();
    } catch (err) {
      wx.showToast({ title: '加载作品信息失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 更新分类选择器默认索引
   */
  updatePickerIndex() {
    const { form, categories } = this.data;
    this.setData({
      houseTypeIndex: (categories.house_type || []).findIndex((c) => c.id === form.house_type_id),
      areaCategoryIndex: (categories.area || []).findIndex((c) => c.id === form.area_category_id),
      styleCategoryIndex: (categories.style || []).findIndex((c) => c.id === form.style_category_id),
    });
  },

  /**
   * 表单字段输入
   */
  onFieldInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
    this._requestSaveDraft();
  },

  /**
   * 分类选择（picker）
   */
  onCategoryChange(e) {
    const { type } = e.currentTarget.dataset;
    const index = parseInt(e.detail.value);
    const items = this.data.categories[type] || [];
    const selected = items[index];

    const updates = {};
    if (type === 'house_type') {
      updates.houseTypeIndex = index;
      updates['form.house_type_id'] = selected ? selected.id : '';
    } else if (type === 'area') {
      updates.areaCategoryIndex = index;
      updates['form.area_category_id'] = selected ? selected.id : '';
    } else if (type === 'style') {
      updates.styleCategoryIndex = index;
      updates['form.style_category_id'] = selected ? selected.id : '';
    }

    this.setData(updates);
    this._requestSaveDraft();
  },

  /**
   * 选择图片（拍照或相册）
   */
  onChooseImage() {
    const remain = WORK_UPLOAD_MAX_COUNT - this.data.images.length - this.data.localImages.length;
    if (remain <= 0) {
      wx.showToast({ title: `最多上传 ${WORK_UPLOAD_MAX_COUNT} 张图片`, icon: 'none' });
      return;
    }

    // chooseMedia 单次最多 20 张（chooseImage 只能 9 张）；只返回临时文件路径，不占内存
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath);
        this.setData({
          localImages: [...this.data.localImages, ...paths],
        });
      },
    });
  },

  /**
   * 设置封面图（点击图片）
   */
  onSetCover(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({ coverImageIndex: index });
    this._requestSaveDraft();
  },

  /**
   * 删除图片
   */
  onRemoveImage(e) {
    const { index, type } = e.currentTarget.dataset;
    if (type === 'server') {
      const images = [...this.data.images];
      images.splice(index, 1);
      this.setData({ images });
    } else {
      const localImages = [...this.data.localImages];
      localImages.splice(index, 1);
      this.setData({ localImages });
    }
    this._requestSaveDraft();
  },

  /**
   * 构建提交数据（通用）
   */
  buildFormData(uploadedImages) {
    const { form, images, coverImageIndex } = this.data;
    const app = getApp();

    // 归一化图片 URL：去除 baseUrl 前缀，确保发给后端的是相对路径
    const normalizeUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const base = app.globalData.baseUrl || '';
        if (base && url.startsWith(base)) {
          return url.slice(base.length); // 去掉 baseUrl 前缀
        }
        // 外部 URL（如 picsum）保持原样
        return url;
      }
      return url; // 已经是相对路径
    };

    // 合并所有图片 ID
    const serverImageIds = images.map((img) => ({ id: img.id }));
    const newImageIds = uploadedImages.map((img) => ({ id: img.id }));
    const allImages = [...serverImageIds, ...newImageIds];

    // 根据 coverImageIndex 找到封面图
    // serverImages 在前，newImages 在后，统一索引
    const allImageUrls = [
      ...images.map((img) => normalizeUrl(img.url)),
      ...uploadedImages.map((img) => img.image_url || img.url),
    ];
    const coverUrl = normalizeUrl(allImageUrls[coverImageIndex] || allImageUrls[0]);

    return {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      house_type_id: form.house_type_id,
      area_category_id: form.area_category_id,
      style_category_id: form.style_category_id,
      area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : undefined,
      budget_min: form.budget_min ? parseFloat(form.budget_min) : undefined,
      budget_max: form.budget_max ? parseFloat(form.budget_max) : undefined,
      vr_url: form.vr_url.trim(),
      cover_image: coverUrl || undefined,
      images: allImages,
    };
  },

  /**
   * 保存草稿
   */
  async onSaveDraft() {
    if (!this.validateForm()) return;

    this.setData({ saving: true });

    try {
      // 先上传本地图片
      const uploadedImages = await this.uploadLocalImages();
      const formData = this.buildFormData(uploadedImages);

      if (this.data.isEdit) {
        await updateWork(this.data.editId, formData);
      } else {
        await createWork(formData);
      }

      this._clearDraft(); // 已保存到服务器，清除本地草稿
      wx.showToast({ title: '草稿已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  /**
   * 保存并提交审核
   */
  async onSubmit() {
    if (!this.validateForm()) return;

    // 二次确认
    const confirmed = await showConfirm('提交后作品将进入审核流程，审核前仍可编辑。确认提交？', '提交审核');
    if (!confirmed) return;

    this.setData({ submitting: true });

    try {
      const uploadedImages = await this.uploadLocalImages();
      const formData = this.buildFormData(uploadedImages);

      let workId = this.data.editId;

      if (this.data.isEdit) {
        await updateWork(workId, formData);
      } else {
        const created = await createWork(formData);
        workId = created.id;
      }

      // 提交审核
      await submitWork(workId);

      this._clearDraft(); // 提交后清除本地草稿
      wx.showToast({ title: '已提交审核', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 批量上传本地图片到服务器
   * 逐张压缩+上传（串行，避免多图同时读入内存），loading 显示进度
   */
  async uploadLocalImages() {
    const { localImages } = this.data;
    if (localImages.length === 0) return [];

    const results = [];
    try {
      for (let i = 0; i < localImages.length; i++) {
        wx.showLoading({ title: `上传图片 ${i + 1}/${localImages.length}` });
        try {
          results.push(await uploadImage(localImages[i], 'works'));
        } catch (err) {
          console.error('上传失败:', localImages[i], err);
          // 继续上传剩余图片
        }
      }
      return results;
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 表单校验
   */
  validateForm() {
    const { form, images, localImages } = this.data;

    if (!form.title || !form.title.trim()) {
      wx.showToast({ title: '请输入作品标题', icon: 'none' });
      return false;
    }
    if (!form.house_type_id) {
      wx.showToast({ title: '请选择户型', icon: 'none' });
      return false;
    }
    if (!form.area_category_id) {
      wx.showToast({ title: '请选择装修空间', icon: 'none' });
      return false;
    }
    if (!form.style_category_id) {
      wx.showToast({ title: '请选择装修风格', icon: 'none' });
      return false;
    }
    if (images.length + localImages.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none' });
      return false;
    }
    const vr = form.vr_url && form.vr_url.trim();
    if (vr && !/^https:\/\/([a-z0-9-]+\.)*kujiale\.com(\/|\?|$)/i.test(vr)) {
      wx.showToast({ title: '请填写酷家乐链接', icon: 'none' });
      return false;
    }
    return true;
  },
});
