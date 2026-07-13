// server/src/config/imageCategories.js
// 图片业务分类白名单 —— 后端唯一真相源（middleware / service 共用）
const IMAGE_CATEGORIES = ['works', 'avatars', 'properties', 'materials', 'construction', 'banners'];
const DEFAULT_CATEGORY = 'misc';
const ALL_DIRS = [...IMAGE_CATEGORIES, DEFAULT_CATEGORY];

const CATEGORY_LABELS = {
  works: '作品',
  avatars: '头像',
  properties: '楼盘',
  materials: '材料',
  construction: '施工图',
  banners: '运营',
  misc: '未分类',
};

// 归一化：仅接受白名单值，其余（含空/undefined）归 misc
function normalizeCategory(input) {
  return IMAGE_CATEGORIES.includes(input) ? input : DEFAULT_CATEGORY;
}

module.exports = { IMAGE_CATEGORIES, DEFAULT_CATEGORY, ALL_DIRS, CATEGORY_LABELS, normalizeCategory };
