import client from './client';

// 首页配置（banner）
export const getHomepageConfig = () =>
  client.get('/homepage/config').then((r) => r.data);

// 热门作品
export const getHotWorks = (limit = 6) =>
  client.get('/works/hot', { params: { limit } }).then((r) => r.data);

// 作品列表（分页+筛选）
export const getWorks = (params) =>
  client.get('/works', { params }).then((r) => r.data);

// 作品详情
export const getWorkDetail = (id) =>
  client.get(`/works/${id}`).then((r) => r.data);

// 分类字典
export const getCategories = () =>
  client.get('/categories').then((r) => r.data);
