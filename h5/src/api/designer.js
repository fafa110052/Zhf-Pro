import client from './client';

// 我的作品列表
export const getMyWorks = (params) =>
  client.get('/designer/works', { params }).then((r) => r.data);

// 我的作品详情
export const getMyWorkDetail = (id) =>
  client.get(`/designer/works/${id}`).then((r) => r.data);

// 创建作品
export const createWork = (data) =>
  client.post('/designer/works', data).then((r) => r.data);

// 更新作品
export const updateWork = (id, data) =>
  client.put(`/designer/works/${id}`, data).then((r) => r.data);

// 删除作品
export const deleteWork = (id) =>
  client.delete(`/designer/works/${id}`).then((r) => r.data);

// 提交审核
export const submitWork = (id) =>
  client.post(`/designer/works/${id}/submit`).then((r) => r.data);

// 上传图片（可选传作品名称用于命名；category 用于业务分类归档）
export const uploadImage = (file, workName, category = 'works') => {
  const formData = new FormData();
  formData.append('file', file);
  if (workName) {
    formData.append('work_name', workName);
  }
  return client.post(`/upload?category=${category}`, formData).then((r) => r.data);
};
