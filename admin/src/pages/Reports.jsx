import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

/**
 * 举报管理 — 小程序作品举报的查看与处理
 */

const REASON_LABELS = {
  fake: '虚假信息/夸大宣传',
  infringe: '侵权/盗用他人作品',
  vulgar: '低俗/不良内容',
  other: '其他',
};

const STATUS_LABELS = { pending: '待处理', resolved: '已处理', rejected: '已驳回' };
const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

function formatTime(t) {
  if (!t) return '—';
  const d = new Date(t.replace(' ', 'T') + (t.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return t;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Reports() {
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [detail, setDetail] = useState(null); // 当前查看/处理的举报
  const [remark, setRemark] = useState('');
  const [handling, setHandling] = useState(false);

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/reports', { params });
      setReports(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const p = { page: 1, page_size: 20 };
    if (filterStatus) p.status = filterStatus;
    fetchList(p);
  }, [filterStatus, fetchList]);

  const goPage = (p) => {
    if (p < 1 || p > pagination.total_pages) return;
    const params = { page: p, page_size: 20 };
    if (filterStatus) params.status = filterStatus;
    fetchList(params);
  };

  const openDetail = (r) => { setDetail(r); setRemark(r.admin_remark || ''); };
  const closeDetail = () => { setDetail(null); setRemark(''); setHandling(false); };

  const handle = async (status) => {
    if (!detail) return;
    setHandling(true);
    try {
      await client.patch(`/admin/reports/${detail.id}`, { status, admin_remark: remark });
      toast.success(status === 'resolved' ? '已标记为处理' : '已驳回');
      closeDetail();
      fetchList({ page: pagination.page, page_size: 20, status: filterStatus || undefined });
    } catch (err) { toast.error(err?.message || '操作失败'); setHandling(false); }
  };

  const STATUS_TABS = [
    { key: '', label: '全部' },
    { key: 'pending', label: '待处理' },
    { key: 'resolved', label: '已处理' },
    { key: 'rejected', label: '已驳回' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 顶部 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">举报管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">处理用户对作品内容的举报</p>
          </div>
        </div>
        {/* 状态筛选 */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {STATUS_TABS.map((t) => (
            <button key={t.key} onClick={() => setFilterStatus(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === t.key ? 'bg-slate-900 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => fetchList({ page: 1, page_size: 20 })} />
        </div>
      )}

      {/* ─── 表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState icon="🚩" title="暂无举报" description="用户举报作品后会出现在这里" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['被举报作品', '举报理由', '状态', '举报时间', '操作'].map((h) => (
                      <th key={h} className={`text-left px-4 py-3 text-gray-500 font-medium text-xs ${h === '操作' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-52 truncate">{r.case_title || `作品#${r.case_id}`}</td>
                      <td className="px-4 py-3 text-gray-600">{REASON_LABELS[r.reason_type] || r.reason_type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatTime(r.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openDetail(r)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          {r.status === 'pending' ? '查看/处理' : '查看'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>共 {pagination.total} 条</span>
                <div className="flex items-center space-x-1">
                  <button onClick={() => goPage(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">上一页</button>
                  <span className="px-3 py-1 text-xs text-gray-600">{pagination.page}/{pagination.total_pages}</span>
                  <button onClick={() => goPage(pagination.page + 1)} disabled={pagination.page >= pagination.total_pages}
                    className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">下一页</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── 详情/处理弹窗 ─── */}
      {detail && (
        <Modal open={!!detail} title="举报详情" onClose={closeDetail}
          footer={
            detail.status === 'pending' ? (
              <>
                <button onClick={() => handle('rejected')} disabled={handling}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">驳回</button>
                <button onClick={() => handle('resolved')} disabled={handling}
                  className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">
                  {handling ? '处理中...' : '标记已处理'}</button>
              </>
            ) : (
              <button onClick={closeDetail} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">关闭</button>
            )
          }
        >
          <div className="space-y-3 text-sm">
            <div className="flex">
              <span className="w-20 shrink-0 text-gray-400">被举报作品</span>
              <span className="text-gray-900 font-medium">{detail.case_title || `作品#${detail.case_id}`}</span>
            </div>
            <div className="flex">
              <span className="w-20 shrink-0 text-gray-400">举报理由</span>
              <span className="text-gray-700">{REASON_LABELS[detail.reason_type] || detail.reason_type}</span>
            </div>
            {detail.reason_detail && (
              <div className="flex">
                <span className="w-20 shrink-0 text-gray-400">补充说明</span>
                <span className="text-gray-700 break-all">{detail.reason_detail}</span>
              </div>
            )}
            <div className="flex">
              <span className="w-20 shrink-0 text-gray-400">联系方式</span>
              <span className="text-gray-700">{detail.contact || '（未填写）'}</span>
            </div>
            <div className="flex">
              <span className="w-20 shrink-0 text-gray-400">举报时间</span>
              <span className="text-gray-700">{formatTime(detail.created_at)}</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 shrink-0 text-gray-400">当前状态</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[detail.status] || 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[detail.status] || detail.status}
              </span>
            </div>
            {detail.handled_at && (
              <div className="flex">
                <span className="w-20 shrink-0 text-gray-400">处理时间</span>
                <span className="text-gray-700">{formatTime(detail.handled_at)}</span>
              </div>
            )}
            <div className="pt-1">
              <label className="block text-gray-400 mb-1">处理备注</label>
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3}
                disabled={detail.status !== 'pending'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="记录处理方式（选填）" maxLength={256} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
