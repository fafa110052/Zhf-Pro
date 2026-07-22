import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const PAGE_SIZE = 20;

const STATUS_MAP = {
  pending:   { label: '待联系', cls: 'bg-yellow-100 text-yellow-700' },
  contacted: { label: '已联系', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', cls: 'bg-green-100 text-green-700' },
};

const STATUS_TABS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待联系' },
  { value: 'contacted', label: '已联系' },
  { value: 'completed', label: '已完成' },
];

const fmtMoney = (v) => `¥${Number(v || 0).toLocaleString('zh-CN')}`;

/**
 * 风格选材 — 选材单管理（状态筛选 + 详情 + 改状态）
 */
export default function StyleWizardOrders() {
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: PAGE_SIZE, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [nextStatus, setNextStatus] = useState('pending');
  const [statusSaving, setStatusSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/orders', { params });
      setOrders(res.data.list || []);
      setPagination(res.data.pagination);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList({ status: statusFilter, page: 1, page_size: PAGE_SIZE }); }, [statusFilter, fetchList]);

  const goPage = (p) => {
    if (p < 1 || p > pagination.total_pages) return;
    fetchList({ status: statusFilter, page: p, page_size: PAGE_SIZE });
  };

  const refresh = () => fetchList({ status: statusFilter, page: pagination.page, page_size: PAGE_SIZE });

  const openDetail = async (order) => {
    setDetailOpen(true); setDetailLoading(true); setDetail(null);
    try {
      const res = await client.get(`/admin/orders/${order.id}`);
      setDetail(res.data);
      setNextStatus(res.data.status || 'pending');
    } catch (err) {
      toast.error(err?.message || '详情加载失败');
      setDetailOpen(false);
    } finally { setDetailLoading(false); }
  };

  const closeDetail = () => { setDetailOpen(false); setDetail(null); };

  const handleSaveStatus = async () => {
    if (!detail || nextStatus === detail.status) return;
    setStatusSaving(true);
    try {
      await client.put(`/admin/orders/${detail.id}`, { status: nextStatus });
      toast.success(`状态已更新为「${STATUS_MAP[nextStatus]?.label || nextStatus}」`);
      setDetail((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      refresh();
    } catch (err) { toast.error(err?.message || '状态更新失败'); }
    finally { setStatusSaving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/v1/admin/orders/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || '导出失败');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `风格选材_${now}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (err) {
      toast.error(err?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const items = Array.isArray(detail?.items) ? detail.items : [];

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 标题 + 状态筛选 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">选材单管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">业主在选材向导提交的选材单，联系跟进后更新状态</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport} disabled={exporting}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              {exporting ? (
                <>
                  <svg className="w-3.5 h-3.5 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z" />
                  </svg>
                  导出中...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  导出Excel
                </>
              )}
            </button>
            <div className="flex items-center space-x-1">
              {STATUS_TABS.map((t) => (
                <button key={t.value} onClick={() => setStatusFilter(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === t.value ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => fetchList({ status: statusFilter, page: 1, page_size: PAGE_SIZE })} />
        </div>
      )}

      {/* ─── 数据表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon="📋" title="暂无选材单" description="业主在小程序提交选材单后会显示在这里" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['订单号', '业主', '电话', '小区房号', '风格', '原价合计', '优惠合计', '状态', '提交时间', '操作'].map((h) => (
                      <th key={h} className={`${h === '操作' ? 'text-right' : 'text-left'} px-4 py-3 text-gray-500 font-medium text-xs whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{o.order_no}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{o.owner_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{o.owner_phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{[o.community, o.room_number].filter(Boolean).join(' ') || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{o.style_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 line-through whitespace-nowrap">{fmtMoney(o.original_total)}</td>
                      <td className="px-4 py-3 text-red-600 font-bold whitespace-nowrap">{fmtMoney(o.discount_total)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[o.status]?.cls || 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_MAP[o.status]?.label || o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{o.submitted_at || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openDetail(o)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">详情</button>
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

      {/* ─── 详情弹窗 ─── */}
      {detailOpen && (
        <Modal open={detailOpen} onClose={closeDetail} title={`选材单详情${detail?.order_no ? ` — ${detail.order_no}` : ''}`}
          footer={detail && (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">状态</span>
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {Object.entries(STATUS_MAP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
              </div>
              <button onClick={handleSaveStatus} disabled={statusSaving || nextStatus === detail.status}
                className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {statusSaving ? '保存中...' : '更新状态'}
              </button>
            </div>
          )}>
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {/* 业主信息 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: '业主姓名', value: detail.owner_name },
                  { label: '联系电话', value: detail.owner_phone },
                  { label: '小区房号', value: [detail.community, detail.room_number].filter(Boolean).join(' ') },
                  { label: '选择风格', value: detail.style_name },
                  { label: '当前状态', value: STATUS_MAP[detail.status]?.label || detail.status },
                  { label: '提交时间', value: detail.submitted_at },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-gray-800">{item.value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* 选材明细 */}
              <div>
                <p className="text-xs text-gray-400 mb-2">选材明细（{items.length} 项）</p>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg">无明细数据</p>
                ) : (
                  <div className="border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {items.map((it, i) => (
                      <div key={i} className="flex items-center px-3 py-2.5 space-x-3">
                        {it.image_url && (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                            <img src={it.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{it.name || '—'}</p>
                          {it.subcategory_name && <p className="text-xs text-gray-400">{it.subcategory_name}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400 line-through">{fmtMoney(it.original_price)}</p>
                          <p className="text-sm text-red-600 font-bold">{fmtMoney(it.discount_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 合计 */}
              <div className="flex items-center justify-end space-x-4 bg-gray-50 rounded-lg px-4 py-3">
                <span className="text-xs text-gray-500">合计</span>
                <span className="text-sm text-gray-400 line-through">{fmtMoney(detail.original_total)}</span>
                <span className="text-lg text-red-600 font-bold">{fmtMoney(detail.discount_total)}</span>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
