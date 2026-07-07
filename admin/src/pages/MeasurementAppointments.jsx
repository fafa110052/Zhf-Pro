import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const STATUS_MAP = {
  0: { label: '待处理', cls: 'bg-gray-100 text-gray-500' },
  1: { label: '已联系', cls: 'bg-blue-100 text-blue-700' },
  2: { label: '已上门', cls: 'bg-orange-100 text-orange-700' },
  3: { label: '已签约', cls: 'bg-green-100 text-green-700' },
  4: { label: '已放弃', cls: 'bg-red-100 text-red-600' },
};

const SOURCE_MAP = {
  miniprogram: { label: '小程序', cls: 'bg-amber-100 text-amber-700' },
  website: { label: '官网', cls: 'bg-blue-100 text-blue-700' },
};

export default function MeasurementAppointments() {
  const toast = useToast();

  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 筛选
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [keyword, setKeyword] = useState('');

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // 确认对话框
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/measurement-appointments', { params });
      setList(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList({ status: statusFilter, source: sourceFilter, date_from: dateFrom, date_to: dateTo, keyword, page: 1, page_size: 20 }); }, [statusFilter, sourceFilter, fetchList]);

  const handleSearch = (e) => { e.preventDefault(); fetchList({ status: statusFilter, source: sourceFilter, date_from: dateFrom, date_to: dateTo, keyword, page: 1, page_size: 20 }); };
  const goPage = (p) => { if (p < 1 || p > pagination.total_pages) return; fetchList({ status: statusFilter, source: sourceFilter, date_from: dateFrom, date_to: dateTo, keyword, page: p, page_size: 20 }); };

  // 查看详情
  const openDetail = async (id) => {
    try {
      const res = await client.get(`/admin/measurement-appointments/${id}`);
      setDetail(res.data);
      setDetailOpen(true);
    } catch (err) {
      toast.error(err?.message || '加载详情失败');
    }
  };

  const closeDetail = () => { setDetailOpen(false); setDetail(null); };

  // 状态变更
  const handleStatusChange = (id, newStatus, label) => {
    setConfirmAction({
      title: '变更状态',
      message: `确定将状态改为「${label}」吗？`,
      variant: newStatus === 4 ? 'danger' : 'warning',
      confirmText: '确认',
      action: async () => {
        try {
          await client.put(`/admin/measurement-appointments/${id}/status`, { status: newStatus });
          toast.success('状态已更新');
          setConfirmOpen(false); setConfirmAction(null);
          // 刷新列表和详情
          fetchList({ status: statusFilter, source: sourceFilter, date_from: dateFrom, date_to: dateTo, keyword, page: pagination.page, page_size: 20 });
          if (detailOpen) openDetail(id);
        } catch (err) { toast.error(err?.message || '操作失败'); setConfirmOpen(false); }
      },
    });
    setConfirmOpen(true);
  };

  // 手机号脱敏
  const maskPhone = (phone) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(7);
  };

  // 状态流转选项
  const getNextStatuses = (currentStatus) => {
    const transitions = {
      0: [{ value: 1, label: '已联系' }],
      1: [{ value: 2, label: '已上门' }, { value: 4, label: '已放弃' }],
      2: [{ value: 3, label: '已签约' }, { value: 4, label: '已放弃' }],
      3: [],
      4: [{ value: 0, label: '重新打开' }],
    };
    return transitions[currentStatus] || [];
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 标题栏 + 筛选 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">量房预约</h2>
            <p className="text-sm text-gray-500 mt-0.5">管理小程序和官网提交的量房预约信息</p>
          </div>
        </div>
        {/* 筛选栏 */}
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 mt-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部状态</option>
            <option value="0">待处理</option>
            <option value="1">已联系</option>
            <option value="2">已上门</option>
            <option value="3">已签约</option>
            <option value="4">已放弃</option>
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部来源</option>
            <option value="miniprogram">小程序</option>
            <option value="website">官网</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input type="text" placeholder="搜索姓名/手机号..." value={keyword} onChange={(e) => setKeyword(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <button type="submit" className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">搜索</button>
        </form>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => fetchList({ status: statusFilter, source: sourceFilter, date_from: dateFrom, date_to: dateTo, keyword, page: 1, page_size: 20 })} />
        </div>
      )}

      {/* ─── 数据表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon="📋" title="暂无预约" description="用户提交的预约信息将在这里显示" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['姓名', '手机号', '楼盘', '面积', '期望时间', '来源', '状态', '提交时间', '操作'].map((h) => (
                      <th key={h} className={`${h === '面积' || h === '来源' || h === '状态' ? 'text-center' : 'text-left'} ${h === '操作' ? 'text-right' : ''} px-4 py-3 text-gray-500 font-medium text-xs whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{maskPhone(item.phone)}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-40 truncate">{item.property_name}</td>
                      <td className="px-4 py-3 text-center text-gray-500 whitespace-nowrap">{item.area_size ? `${item.area_size}㎡` : '-'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.expected_time || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(SOURCE_MAP[item.source] || SOURCE_MAP.miniprogram).cls}`}>
                          {(SOURCE_MAP[item.source] || SOURCE_MAP.miniprogram).label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(STATUS_MAP[item.status] || STATUS_MAP[0]).cls}`}>
                          {(STATUS_MAP[item.status] || STATUS_MAP[0]).label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openDetail(item.id)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">详情</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 分页 */}
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
      {detailOpen && detail && (
        <Modal open={detailOpen} title="预约详情" onClose={closeDetail} size="md">
          <div className="space-y-4">
            {/* 状态条 */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${(STATUS_MAP[detail.status] || STATUS_MAP[0]).cls}`}>
                {(STATUS_MAP[detail.status] || STATUS_MAP[0]).label}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(SOURCE_MAP[detail.source] || SOURCE_MAP.miniprogram).cls}`}>
                {(SOURCE_MAP[detail.source] || SOURCE_MAP.miniprogram).label}
              </span>
            </div>

            {/* 信息网格 */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">联系人</p>
                <p className="text-sm font-medium text-gray-900">{detail.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">手机号</p>
                <p className="text-sm font-medium text-gray-900">{detail.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">楼盘/小区</p>
                <p className="text-sm font-medium text-gray-900">{detail.property_name}</p>
              </div>
              {detail.room_number && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">房号</p>
                  <p className="text-sm font-medium text-gray-900">{detail.room_number}</p>
                </div>
              )}
              {detail.area_size && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">面积</p>
                  <p className="text-sm font-medium text-gray-900">{detail.area_size}㎡</p>
                </div>
              )}
              {detail.expected_time && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">期望时间</p>
                  <p className="text-sm font-medium text-gray-900">{detail.expected_time}</p>
                </div>
              )}
              {detail.budget && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">预算</p>
                  <p className="text-sm font-medium text-gray-900">{detail.budget}</p>
                </div>
              )}
            </div>

            {detail.source_page && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">来源页面</p>
                <p className="text-sm text-gray-700">{detail.source_page}</p>
              </div>
            )}

            {detail.remark && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">备注</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2">{detail.remark}</p>
              </div>
            )}

            <div className="text-xs text-gray-400">
              提交时间：{detail.created_at ? new Date(detail.created_at).toLocaleString('zh-CN') : '-'}
            </div>

            {/* 状态操作 */}
            {getNextStatuses(detail.status).length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">变更状态：</p>
                <div className="flex flex-wrap gap-2">
                  {getNextStatuses(detail.status).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(detail.id, s.value, s.label)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        s.value === 4
                          ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={closeDetail} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">关闭</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── 确认对话框 ─── */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction?.title}
        message={confirmAction?.message}
        variant={confirmAction?.variant}
        confirmText={confirmAction?.confirmText}
        onConfirm={confirmAction?.action}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
      />
    </div>
  );
}
