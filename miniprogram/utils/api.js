/**
 * API 接口模块
 *
 * 按业务模块组织所有 API 调用，便于管理和复用。
 * 每个函数返回 Promise，调用方可直接 await 获取结果。
 */
const http = require('./request');

// ═══════════════════════════════════════════
// 分类 API（公开）
// ═══════════════════════════════════════════

/**
 * 获取所有启用分类（按 type 分组）
 * @returns {Promise<{house_type:[], area_category:[], style_category:[]}>}
 */
function getCategories() {
  return http.get('/categories');
}

// ═══════════════════════════════════════════
// 作品 API（公开 — 小程序访客端）
// ═══════════════════════════════════════════

/**
 * 作品列表（多维筛选 + 分页）
 * @param {object} params — { house_type_id, area_category_id, style_category_id, keyword, budget_min, budget_max, area_min, area_max, sort_by, page, page_size }
 * @returns {Promise<{list:[], pagination:{}}>}
 */
function getWorks(params = {}) {
  return http.get('/works', params);
}

/**
 * 热门推荐列表
 * @param {number} limit — 数量，默认 6
 * @returns {Promise<Array>}
 */
function getHotWorks(limit = 6) {
  return http.get('/works/hot', { limit });
}

/**
 * 作品详情（浏览量自动 +1）
 * @param {number} id
 * @returns {Promise<object>} — 含 images, designer, house_type/area_category/style_category 名称
 */
function getWorkDetail(id) {
  return http.get(`/works/${id}`);
}

/**
 * 提交作品举报（公开，游客可提交）
 * @param {number} caseId — 作品 ID
 * @param {object} data — { reason_type, reason_detail?, contact? }
 * @returns {Promise<object>}
 */
function submitReport(caseId, data) {
  return http.post(`/works/${caseId}/reports`, data);
}

// ═══════════════════════════════════════════
// 首页配置 API（公开）
// ═══════════════════════════════════════════

/**
 * 获取首页配置（banner 轮播 + 热门推荐位）
 * @returns {Promise<{banner:[], hot_works:[]}>}
 */
function getHomepageConfig() {
  return http.get('/homepage/config');
}

// ═══════════════════════════════════════════
// 认证 API
// ═══════════════════════════════════════════

/**
 * 设计师微信登录（正式环境 — openid + 手机号）
 * @param {string} openid — wx.login 获取的 openid
 * @param {string} phone  — 手机号
 * @returns {Promise<{token:string, designer:object}>}
 */
function designerLogin(openid, phone) {
  return http.post('/auth/designer/login', { openid, phone });
}

/**
 * 微信手机号快捷登录
 * @param {string} wxCode    — wx.login 返回的 code
 * @param {string} phoneCode — getPhoneNumber 按钮返回的 code
 * @returns {Promise<{token:string, user:object}>}
 */
function wechatPhoneLogin(wxCode, phoneCode) {
  return http.post('/auth/designer/wechat-phone', { wxCode, phoneCode });
}

/**
 * 获取当前登录设计师信息
 * @returns {Promise<object>}
 */
function getDesignerProfile(opts = {}) {
  return http.get('/auth/designer/me', {}, Object.assign({ auth: true }, opts));
}

/**
 * 校验登录态是否有效
 * @returns {Promise<boolean>}
 */
async function checkLogin() {
  try {
    // silent: 仅后台校验，不弹 toast，不触发 clearLogin（防止竞态条件清掉刚登录的 token）
    await http.get('/auth/designer/me', {}, { auth: true, silent: true });
    return true;
  } catch (err) {
    // 仅当服务端明确回 401（token 确实失效）才判定无效并登出；
    // 网络/超时/冷启动请求未就绪/服务偶发错误一律保留登录（本地 token 有效期 7 天）。
    // 这样"重新进入小程序"不会因一次校验没连上就被清空登录态。
    return err && err.status === 401 ? false : true;
  }
}

/**
 * 账号注销（仅游客/业主）—— 匿名化个人信息并使账号立即失效
 * @returns {Promise<{cancelled:boolean}>}
 */
function cancelAccount() {
  return http.post('/auth/designer/cancel', {}, { auth: true });
}

// ═══════════════════════════════════════════
// 设计师端 — 作品管理 API
// ═══════════════════════════════════════════

/**
 * 我的作品列表
 * @param {object} params — { status, keyword, page, page_size }
 */
function getMyWorks(params = {}) {
  return http.get('/designer/works', params, { auth: true });
}

/**
 * 我的作品详情
 * @param {number} id
 */
function getMyWorkDetail(id) {
  return http.get(`/designer/works/${id}`, {}, { auth: true });
}

/**
 * 创建作品（草稿）
 * @param {object} data — { title, description, house_type_id, area_category_id, style_category_id, area, budget, images }
 */
function createWork(data) {
  return http.post('/designer/works', data, { auth: true, loading: true });
}

/**
 * 编辑作品
 * @param {number} id
 * @param {object} data
 */
function updateWork(id, data) {
  return http.put(`/designer/works/${id}`, data, { auth: true, loading: true });
}

/**
 * 删除作品
 * @param {number} id
 */
function deleteWork(id) {
  return http.del(`/designer/works/${id}`, {}, { auth: true });
}

/**
 * 提交审核
 * @param {number} id
 */
/**
 * 设置作品封面图
 * @param {number} workId
 * @param {string} imageUrl — 图片 URL（相对路径）
 */
function setWorkCover(workId, imageUrl) {
  return http.patch(`/designer/works/${workId}/cover`, { image_url: imageUrl }, { auth: true });
}

function submitWork(id) {
  return http.post(`/designer/works/${id}/submit`, {}, { auth: true, loading: true });
}

// ═══════════════════════════════════════════
// 设计师端 — 个人统计
// ═══════════════════════════════════════════

/**
 * 个人数据统计
 * @returns {Promise<{total:int, draft:int, pending:int, approved:int, rejected:int, total_views:int}>}
 */
function getMyStats(opts = {}) {
  return http.get('/designer/stats', {}, Object.assign({ auth: true }, opts));
}

// ═══════════════════════════════════════════
// 文件上传 API
// ═══════════════════════════════════════════

/**
 * 上传单张图片
 * @param {string} filePath — 本地文件路径
 * @returns {Promise<{id:int, url:string, thumbnail_url:string}>}
 */
function uploadImage(filePath, category = '') {
  // 先压缩再上传，减少流量
  return compressAndUpload(filePath, category);
}

/**
 * 压缩图片后上传
 */
function compressAndUpload(filePath, category = '') {
  const { compressImage } = require('./imageCompress');

  return compressImage(filePath).then((compressedPath) => {
    return new Promise((resolve, reject) => {
      const app = getApp();
      const token = app.globalData.token;

      wx.uploadFile({
        url: `${app.globalData.baseUrl}/api/v1/upload${category ? `?category=${category}` : ''}`,
        filePath: compressedPath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (data.success) {
            resolve(data.data);
          } else {
            wx.showToast({ title: data.error?.message || '上传失败', icon: 'none' });
            reject(new Error(data.error?.message || '上传失败'));
          }
        } catch {
          reject(new Error('解析上传结果失败'));
        }
      },
      fail(err) {
        wx.showToast({ title: '上传失败，请检查网络', icon: 'none' });
        reject(err);
      },
    });
  });
});
}

/**
 * 批量上传图片
 * @param {string[]} filePaths
 * @returns {Promise<Array>}
 */
async function uploadImages(filePaths, category = '') {
  const results = [];
  for (const filePath of filePaths) {
    try {
      const res = await uploadImage(filePath, category);
      results.push(res);
    } catch (err) {
      console.error('上传失败:', filePath, err);
      // 继续上传剩余图片
    }
  }
  return results;
}

// ═══════════════════════════════════════════
// V1.1 — 选材 API
// ═══════════════════════════════════════════

/**
 * 已开通选材的楼盘列表（公开）
 * @param {string} keyword — 楼盘名称模糊搜索
 */
function getProperties(keyword) {
  return http.get('/properties', keyword ? { keyword } : {});
}

/**
 * 某楼盘的材料列表（按分类分组，公开）
 * @param {number} propertyId
 * @param {string} keyword — 材料名称模糊搜索
 */
function getPropertyMaterials(propertyId, keyword) {
  return http.get(`/properties/${propertyId}/materials`, keyword ? { keyword } : {});
}

/**
 * 提交选材申请
 * @param {object} data — { property_id, room_number, applicant_name, applicant_phone, remark?, items }
 */
function submitMaterialOrder(data) {
  return http.post('/material-orders', data, { auth: true, loading: true });
}

/**
 * 我的选材申请列表
 * @param {object} params — { page, page_size }
 */
function getMyMaterialOrders(params = {}) {
  return http.get('/material-orders/my', params, { auth: true });
}

/**
 * 我的选材申请详情
 * @param {string} orderNo
 */
function getMyMaterialOrderDetail(orderNo) {
  return http.get(`/material-orders/detail/${orderNo}`, {}, { auth: true });
}

/**
 * 检查当前用户是否是指定楼盘的业主
 * @param {number} propertyId
 * @returns {Promise<{is_owner: boolean, building: string|null, room: string|null}>}
 */
function getOwnerCheck(propertyId) {
  return http.get(`/properties/${propertyId}/owner-check`, {}, { auth: true });
}

// ═══════════════════════════════════════════
// V1.3 — 施工阶段 API
// ═══════════════════════════════════════════

/** 获取订单全部阶段 */
function getOrderPhases(orderNo) {
  return http.get(`/material-orders/${orderNo}/phases`, {}, { auth: true });
}

/** 获取阶段详情 */
function getPhaseDetail(phaseId) {
  return http.get(`/construction-phases/${phaseId}`, {}, { auth: true });
}

// 设计师
function getDesignerPhases(opts = {}) {
  return http.get('/designer/construction-phases', {}, Object.assign({ auth: true }, opts));
}
function uploadDesignImages(phaseId, images) {
  return http.put(`/construction-phases/${phaseId}/upload-design`, { images }, { auth: true });
}

// 设计总监
function getDesignDirectorPhases(opts = {}) {
  return http.get('/director/design/phases', {}, Object.assign({ auth: true }, opts));
}
function approveDesignDirector(phaseId) {
  return http.post(`/construction-phases/${phaseId}/approve-design-director`, {}, { auth: true });
}
function rejectDesignDirector(phaseId, reason) {
  return http.post(`/construction-phases/${phaseId}/reject-design-director`, { reason }, { auth: true });
}

// 工程师
function getEngineerPhases(opts = {}) {
  return http.get('/engineer/construction-phases', {}, Object.assign({ auth: true }, opts));
}
function confirmDesign(phaseId) {
  return http.post(`/construction-phases/${phaseId}/confirm-design`, {}, { auth: true });
}
function uploadConstructionImages(phaseId, images, description) {
  return http.put(`/construction-phases/${phaseId}/upload-construction`, { images, description: description || '' }, { auth: true });
}

// 工程总监
function getEngineeringDirectorPhases(opts = {}) {
  return http.get('/director/engineering/phases', {}, Object.assign({ auth: true }, opts));
}
function approveEngineeringDirector(phaseId, remark) {
  return http.post(`/construction-phases/${phaseId}/approve-engineering-director`, { remark: remark || '' }, { auth: true });
}
function rejectEngineeringDirector(phaseId, reason) {
  return http.post(`/construction-phases/${phaseId}/reject-engineering-director`, { reason }, { auth: true });
}
function directorConfirmDesign(phaseId) {
  return http.post(`/construction-phases/${phaseId}/director-confirm-design`, {}, { auth: true });
}

// 业主审核设计图
function approveOwnerDesign(phaseId) {
  return http.post(`/construction-phases/${phaseId}/owner-approve-design`, {}, { auth: true });
}
function disputeOwnerDesign(phaseId, data) {
  return http.post(`/construction-phases/${phaseId}/owner-dispute-design`, data, { auth: true });
}

// 业主验收
function acceptPhase(phaseId) {
  return http.post(`/construction-phases/${phaseId}/accept`, {}, { auth: true });
}
function disputePhase(phaseId, data) {
  return http.post(`/construction-phases/${phaseId}/dispute`, data, { auth: true });
}

// ═══════════════════════════════════════════
// 设计团队 API（公开）
// ═══════════════════════════════════════════

/**
 * 获取设计团队列表（公开）
 * @returns {Promise<Array>}
 */
function getDesignTeam() {
  return http.get('/design-team');
}

// ═══════════════════════════════════════════
// 量房预约 API
// ═══════════════════════════════════════════

/**
 * 提交量房预约（无需登录）
 * @param {object} data — { name, phone, property_name, room_number, area_size, expected_time, budget, remark, source, source_page }
 */
function submitMeasureAppointment(data) {
  return http.post('/measurement-appointments', data);
}

// ═══════════════════════════════════════════
// 风格选材向导 API（V2.0）
// ═══════════════════════════════════════════

function getStyles() {
  return http.get('/styles', {}, { auth: false, silent: true });
}
function getStyleCategories() {
  return http.get('/style-categories', {}, { auth: false, silent: true });
}
function getStyleMaterials(styleId, subcategoryId) {
  return http.get(`/styles/${styleId}/materials`, { subcategory_id: subcategoryId }, { auth: false });
}
function getDoorSeries() {
  return http.get('/door-series', {}, { auth: false, silent: true });
}
function getDoorMaterials(seriesId, styleId) {
  return http.get('/door-materials', { series_id: seriesId, style_id: styleId }, { auth: false });
}
function getLightingPackages() {
  return http.get('/lighting-packages', {}, { auth: false, silent: true });
}
function getLightingPackageDetail(id) {
  return http.get(`/lighting-packages/${id}`, {}, { auth: false });
}
function saveDraft(data) {
  return http.post('/drafts', data, { auth: true, silent: true });
}
function getDraft() {
  return http.get('/drafts', {}, { auth: true, silent: true });
}
function submitStyleOrder(data) {
  return http.post('/orders', data, { auth: true });
}
function getMyStyleOrders(page = 1) {
  return http.get('/orders', { page }, { auth: true });
}

module.exports = {
  // 分类
  getCategories,
  // 作品（公开）
  getWorks,
  getHotWorks,
  getWorkDetail,
  submitReport,
  // 首页配置
  getHomepageConfig,
  // 认证
  designerLogin,
  wechatPhoneLogin,
  getDesignerProfile,
  checkLogin,
  cancelAccount,
  // 设计师作品
  getMyWorks,
  getMyWorkDetail,
  createWork,
  updateWork,
  deleteWork,
  setWorkCover,
  submitWork,
  // 统计
  getMyStats,
  // 上传
  uploadImage,
  uploadImages,
  // V1.1 选材
  getProperties,
  getPropertyMaterials,
  submitMaterialOrder,
  getMyMaterialOrders,
  getMyMaterialOrderDetail,
  // 业主
  getOwnerCheck,
  // V1.3 施工阶段
  getOrderPhases,
  getPhaseDetail,
  getDesignerPhases,
  uploadDesignImages,
  getDesignDirectorPhases,
  approveDesignDirector,
  rejectDesignDirector,
  getEngineerPhases,
  confirmDesign,
  uploadConstructionImages,
  getEngineeringDirectorPhases,
  approveEngineeringDirector,
  rejectEngineeringDirector,
  directorConfirmDesign,
  approveOwnerDesign,
  disputeOwnerDesign,
  acceptPhase,
  disputePhase,
  // 设计团队
  getDesignTeam,
  // 量房预约
  submitMeasureAppointment,
  // 风格选材向导（V2.0）
  getStyles,
  getStyleCategories,
  getStyleMaterials,
  getDoorSeries,
  getDoorMaterials,
  getLightingPackages,
  getLightingPackageDetail,
  saveDraft,
  getDraft,
  submitStyleOrder,
  getMyStyleOrders,
};
