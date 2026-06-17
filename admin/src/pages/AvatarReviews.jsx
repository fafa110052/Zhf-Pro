import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import ErrorState from '../components/ErrorState';

const BASE_URL = window.location.origin;

/**
 * 头像审核管理页
 * 功能：查看待审核头像、预览大图、通过/驳回
 */
export default function AvatarReviews() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 12, total: 0, total_pages: 1 });
  const [previewImg, setPreviewImg] = useState(null);

  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get(`/admin/avatar-reviews?page=${page}&page_size=12`);
      setList(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id, name) => {
    if (!window.confirm(`确定通过「${name}」的头像审核吗？`)) return;
    try {
      await client.post(`/admin/avatar-reviews/${id}/approve`);
      setList((prev) => prev.filter((item) => item.id !== id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    } catch (err) {
      alert(err?.message || '操作失败');
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`确定驳回「${name}」的头像吗？\n\n驳回后设计师原来的头像不受影响。`)) return;
    try {
      await client.post(`/admin/avatar-reviews/${id}/reject`);
      setList((prev) => prev.filter((item) => item.id !== id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    } catch (err) {
      alert(err?.message || '操作失败');
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => loadData(1)} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">头像审核</h2>
          <p className="text-sm text-gray-500 mt-1">
            待审核：{pagination.total} 个
          </p>
        </div>
      </div>

      {/* 空态 */}
      {list.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <span className="text-5xl">✅</span>
          <p className="mt-3 text-gray-500">暂无待审核的头像</p>
          <p className="text-sm text-gray-400 mt-1">设计师更换头像后将出现在这里</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 font-medium">设计师</th>
                <th className="text-left py-3 px-4 font-medium">当前头像</th>
                <th className="text-left py-3 px-4 font-medium">新头像预览</th>
                <th className="text-left py-3 px-4 font-medium">提交时间</th>
                <th className="text-right py-3 px-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">ID: {item.id}</p>
                  </td>
                  <td className="py-3 px-4">
                    {item.avatar_url ? (
                      <img
                        src={item.avatar_url.startsWith('http') ? item.avatar_url : BASE_URL + item.avatar_url}
                        alt="当前头像"
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewImg(item.avatar_url.startsWith('http') ? item.avatar_url : BASE_URL + item.avatar_url)}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">无</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <img
                      src={item.pending_avatar_url.startsWith('http') ? item.pending_avatar_url : BASE_URL + item.pending_avatar_url}
                      alt="待审核头像"
                      className="w-16 h-16 rounded-lg object-cover border-2 border-yellow-300 cursor-pointer hover:opacity-80"
                      onClick={() => setPreviewImg(item.pending_avatar_url.startsWith('http') ? item.pending_avatar_url : BASE_URL + item.pending_avatar_url)}
                    />
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                      待审核
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-xs">
                    {item.updated_at?.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleApprove(item.id, item.name)}
                        className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => handleReject(item.id, item.name)}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                      >
                        驳回
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8"
          onClick={() => setPreviewImg(null)}
        >
          <img
            src={previewImg}
            alt="头像预览"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
