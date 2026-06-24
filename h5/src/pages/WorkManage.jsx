import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyWorks, deleteWork, submitWork } from '../api/designer';

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'pending', label: '审核中' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
];

const STATUS_MAP = {
  draft: { label: '草稿', cls: 'bg-gray-100 text-gray-500' },
  pending: { label: '审核中', cls: 'bg-yellow-50 text-yellow-700' },
  approved: { label: '已通过', cls: 'bg-green-50 text-green-700' },
  rejected: { label: '已驳回', cls: 'bg-red-50 text-red-600' },
};

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getImageUrl(work) {
  const url = work.cover_thumb || work.cover_image;
  if (!url) return '';
  // 如果是完整 URL 直接返回，否则走当前域名的相对路径
  if (url.startsWith('http')) return url;
  return url;
}

export default function WorkManage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadWorks = useCallback(async (tab) => {
    setLoading(true);
    setError(false);
    try {
      const params = { page: 1, page_size: 20 };
      if (tab) params.status = tab;
      const result = await getMyWorks(params);
      setWorks(result.list || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorks(activeTab);
  }, [activeTab, loadWorks]);

  const handleTabChange = (key) => {
    if (key === activeTab) return;
    setActiveTab(key);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('删除后不可恢复，确定删除？')) return;
    try {
      await deleteWork(id);
      setWorks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      alert(err?.message || '删除失败');
    }
  };

  const handleSubmit = async (id) => {
    if (!window.confirm('提交后管理员将进行审核，确定提交？')) return;
    try {
      await submitWork(id);
      // 刷新列表
      loadWorks(activeTab);
    } catch (err) {
      alert(err?.message || '提交失败');
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* 顶部标题 */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">作品管理</h2>
      </div>

      {/* 状态 Tab */}
      <div className="bg-white px-2 py-2 border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="w-5 h-5 border-2 border-gray-300 border-t-slate-900 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-3">加载失败</p>
            <button
              onClick={() => loadWorks(activeTab)}
              className="px-4 py-2 bg-slate-900 text-white text-xs rounded-lg"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && works.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">
              {activeTab ? `暂无${STATUS_MAP[activeTab]?.label || ''}作品` : '暂无作品'}
            </p>
            <button
              onClick={() => navigate('/work-upload')}
              className="mt-3 px-4 py-2 bg-slate-900 text-white text-xs rounded-lg"
            >
              上传作品
            </button>
          </div>
        )}

        {!loading && !error && works.length > 0 && (
          <div className="space-y-3">
            {works.map((work) => {
              const status = STATUS_MAP[work.review_status] || { label: work.review_status, cls: 'bg-gray-100 text-gray-500' };
              const canEdit = work.review_status === 'draft' || work.review_status === 'rejected';
              const imgUrl = getImageUrl(work);

              return (
                <div key={work.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {/* 缩略图 */}
                    <div className="w-20 h-20 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">无图</div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate flex-1">{work.title}</h3>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>
                      {work.reject_reason && (
                        <p className="text-xs text-red-400 mt-1 line-clamp-2">{work.reject_reason}</p>
                      )}
                      <p className="text-xs text-gray-300 mt-1.5">{formatDate(work.created_at)}</p>
                    </div>
                  </div>

                  {/* 操作栏 */}
                  <div className="flex border-t border-gray-50">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => navigate(`/work-upload/${work.id}`)}
                          className="flex-1 py-2.5 text-xs text-gray-500 active:bg-gray-50"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleSubmit(work.id)}
                          className="flex-1 py-2.5 text-xs text-slate-900 font-medium active:bg-gray-50"
                        >
                          提交审核
                        </button>
                        <button
                          onClick={() => handleDelete(work.id)}
                          className="flex-1 py-2.5 text-xs text-red-400 active:bg-gray-50"
                        >
                          删除
                        </button>
                      </>
                    )}
                    {!canEdit && (
                      <button
                        onClick={() => navigate(`/work/${work.id}`)}
                        className="flex-1 py-2.5 text-xs text-gray-400 active:bg-gray-50"
                      >
                        查看详情
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
