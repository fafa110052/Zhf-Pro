/**
 * 全局常量
 *
 * ⚠️ 环境切换：修改 ../env.js 中的 BASE_URL
 *    本地开发时 start.sh 会生成 ../env.local.js（gitignored），优先级更高
 */

// ─── 环境配置读取（必须在 miniprogram 目录内，否则小程序编译器报错）───
let envConfig;
try {
  // 优先使用本地覆盖（start.sh 自动生成，gitignored）
  envConfig = require('../env.local');
} catch (e) {
  // 未覆盖时使用正式配置
  envConfig = require('../env');
}

// 后端 API 基础地址
const BASE_URL = envConfig.BASE_URL;

// API 版本前缀
const API_PREFIX = '/api/v1';

// 请求超时（毫秒）
const REQUEST_TIMEOUT = 15000;

// 分页默认配置
const PAGE_SIZE_DEFAULT = 12;
const PAGE_SIZE_MAX = 50;

// 图片上传限制
const UPLOAD_MAX_COUNT = 9;       // 单次最多上传 9 张
const UPLOAD_MAX_SIZE = 10 * 1024 * 1024;  // 单张最大 10MB

// 作品状态映射
const WORK_STATUS_MAP = {
  draft: { label: '草稿', colorClass: 'tag-gray' },
  pending: { label: '审核中', colorClass: 'tag-yellow' },
  approved: { label: '已通过', colorClass: 'tag-green' },
  rejected: { label: '已驳回', colorClass: 'tag-red' },
  offline: { label: '已下架', colorClass: 'tag-orange' },
  archived: { label: '已归档', colorClass: 'tag-gray' },
};

// 设计师状态映射
const DESIGNER_STATUS_MAP = {
  active: { label: '已启用', colorClass: 'tag-green' },
  inactive: { label: '已禁用', colorClass: 'tag-red' },
};

// V1.1 — 选材申请状态映射
const ORDER_STATUS_MAP = {
  pending:   { label: '待审核',  colorClass: 'tag-yellow', icon: '⏳' },
  approved:  { label: '已通过',  colorClass: 'tag-green',  icon: '✅' },
  rejected:  { label: '已驳回',  colorClass: 'tag-red',    icon: '❌' },
  completed: { label: '待验收',  colorClass: 'tag-blue',   icon: '🎉' },
  accepted:  { label: '已验收',  colorClass: 'tag-green',  icon: '🏆' },
  disputed:  { label: '异议中',  colorClass: 'tag-orange', icon: '🔄' },
};

// V1.3 — 施工阶段类型
const PHASE_TYPE_MAP = {
  demolition:       { label: '打拆', icon: '🔨' },
  water_electric:   { label: '水电', icon: '💧' },
  painting:         { label: '油工', icon: '🎨' },
  material_install: { label: '主材安装', icon: '🏗️' },
  completion:       { label: '竣工', icon: '🏠' },
};

// V1.3 — 施工阶段状态
const PHASE_STATUS_MAP = {
  unassigned:                  { label: '未派单', colorClass: 'tag-yellow' },
  assigned:                    { label: '已派单', colorClass: 'tag-blue' },
  design_uploaded:             { label: '待审设计', colorClass: 'tag-blue' },
  design_director_approved:    { label: '待二审设计', colorClass: 'tag-blue' },
  design_director_rejected:    { label: '设计已驳回', colorClass: 'tag-red' },
  design_admin_approved:       { label: '待业主审设计', colorClass: 'tag-green' },
  design_admin_rejected:       { label: '设计二审驳回', colorClass: 'tag-red' },
  owner_design_reviewed:       { label: '等待管理员分配', colorClass: 'tag-orange' },
  engineer_design_confirmed:  { label: '待总监确认设计', colorClass: 'tag-blue' },
  owner_design_disputed:       { label: '业主驳回设计', colorClass: 'tag-orange' },
  construction_confirmed:      { label: '施工中', colorClass: 'tag-blue' },
  construction_uploaded:       { label: '待审完工', colorClass: 'tag-blue' },
  engineering_director_approved:  { label: '待二审完工', colorClass: 'tag-blue' },
  engineering_director_rejected:  { label: '完工已驳回', colorClass: 'tag-red' },
  construction_admin_approved:    { label: '待验收', colorClass: 'tag-green' },
  construction_admin_rejected:    { label: '完工二审驳回', colorClass: 'tag-red' },
  owner_accepted:              { label: '已验收', colorClass: 'tag-green' },
  owner_disputed:              { label: '业主已驳回', colorClass: 'tag-orange' },
  locked:                      { label: '未解锁', colorClass: 'tag-gray' },
};

// V1.3 — 订阅消息模板 ID
const TEMPLATE_IDS = {
  todoNotify: 'FcVV6DAzlPBsOaVFn55z4OfLTIGtjlaJFWtROh5e5TE',   // 装修任务变化通知
  reviewResult: 'hNKcPc3yuyJL0kj3ZhUjPODIJXxGx_gtKcqUnPfPKtY', // 审核结果通知
  acceptNotify: 'o2KzHcZuwDZIy6AHc9nz0jW5bpzjeOE8YGLhlchBkmw', // 装修验收提醒
  acceptResult: 'hNKcPc3yuyJL0kj3ZhUjPODIJXxGx_gtKcqUnPfPKtY', // 审核结果通知（复用）
  phasePass: 'o2KzHcZuwDZIy6AHc9nz0jW5bpzjeOE8YGLhlchBkmw',    // 装修验收提醒（复用）
};

module.exports = {
  BASE_URL,
  API_PREFIX,
  REQUEST_TIMEOUT,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  UPLOAD_MAX_COUNT,
  UPLOAD_MAX_SIZE,
  WORK_STATUS_MAP,
  DESIGNER_STATUS_MAP,
  ORDER_STATUS_MAP,
  PHASE_TYPE_MAP,
  PHASE_STATUS_MAP,
  TEMPLATE_IDS,
};
