import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  // 不设 Content-Type：Axios 对普通对象自动设 application/json，对 FormData 保持空白让浏览器设 boundary
});

// ─── 请求拦截器：自动带 token ───
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('h5_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 响应拦截器：解包 + 统一错误处理 ───
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      // 401 清登录态
      if (status === 401) {
        localStorage.removeItem('h5_token');
        localStorage.removeItem('h5_user');
      }
      return Promise.reject(data?.error || { message: '请求失败', status });
    }
    return Promise.reject({ message: '网络错误，请检查连接', status: 0 });
  }
);

export default client;
