import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── 响应拦截器：解包 + 统一错误处理 ───
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      return Promise.reject(data?.error || { message: '请求失败', status });
    }
    return Promise.reject({ message: '网络错误，请检查连接', status: 0 });
  }
);

export default client;
