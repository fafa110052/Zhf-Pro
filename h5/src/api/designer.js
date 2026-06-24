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
  client.del(`/designer/works/${id}`).then((r) => r.data);

// 提交审核
export const submitWork = (id) =>
  client.post(`/designer/works/${id}/submit`).then((r) => r.data);

// 上传图片
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
