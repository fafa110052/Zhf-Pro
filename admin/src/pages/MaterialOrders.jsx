import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const STATUS_MAP = {
  pending: { label: '待审核', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已通过', cls: 'bg-green-100 text-green-700' },
  rejected: { label: '已驳回', cls: 'bg-red-100 text-red-700' },
  completed: { label: '已完成', cls: 'bg-emerald-100 text-emerald-700' },
  accepted: { label: '已接受', cls: 'bg-blue-100 text-blue-700' },
};

export default function MaterialOrders() {
  const toast = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 筛选
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [filterOrderNo, setFilterOrderNo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterConstructionStatus, setFilterConstructionStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  // 下拉
  const [properties, setProperties] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [allDesigners, setAllDesigners] = useState([]);       // personnel_type=designer（施工用）
  const [allDirectors, setAllDirectors] = useState([]);       // personnel_type=design_director
  const [allEngineers, setAllEngineers] = useState([]);       // personnel_type=engineer
  const [allEngDirectors, setAllEngDirectors] = useState([]); // personnel_type=engineering_director

  // 审核派单弹窗（指派设计人员）
  const [approveAssignOpen, setApproveAssignOpen] = useState(false);
  const [approveAssignOrderNo, setApproveAssignOrderNo] = useState('');
  const [approveAssignDesignerId, setApproveAssignDesignerId] = useState('');
  const [approveAssignDesignDirId, setApproveAssignDesignDirId] = useState('');
  const [approveAssignSubmitting, setApproveAssignSubmitting] = useState(false);

  // 驳回弹窗
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectOrderNo, setRejectOrderNo] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // 勾选删除
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const enterSelectMode = () => { setSelectedIds(new Set()); setSelectMode(true); };
  const exitSelectMode = () => { setSelectedIds(new Set()); setSelectMode(false); };

  // 确认框
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // 加载下拉选项
  useEffect(() => {
    client.get('/admin/properties').then(r => setProperties(r.data.list || [])).catch(() => {});
    client.get('/admin/designers', { params: { personnel_type: 'designer' } }).then(r => setDesigners(r.data.list || [])).catch(() => {});
    client.get('/admin/designers', { params: { personnel_type: 'supervisor' } }).then(r => setSupervisors(r.data.list || [])).catch(() => {});
    client.get('/admin/users', { params: { role: 'designer', personnel_type: 'designer' } }).then(r => setAllDesigners(r.data.list || [])).catch(() => {});
    client.get('/admin/users', { params: { role: 'designer', personnel_type: 'design_director' } }).then(r => setAllDirectors(r.data.list || [])).catch(() => {});
    client.get('/admin/users', { params: { role: 'designer', personnel_type: 'engineer' } }).then(r => setAllEngineers(r.data.list || [])).catch(() => {});
    client.get('/admin/users', { params: { role: 'designer', personnel_type: 'engineering_director' } }).then(r => setAllEngDirectors(r.data.list || [])).catch(() => {});
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page: pagination.page, page_size: 20 };
      if (filterPropertyId) params.property_id = filterPropertyId;
      if (filterOrderNo) params.order_no = filterOrderNo;
      if (filterStatus) params.status = filterStatus;
      if (filterConstructionStatus) params.construction_status = filterConstructionStatus;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      params.sort = sortOrder;
      const res = await client.get('/admin/material-orders', { params });
      setOrders(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, [filterPropertyId, filterOrderNo, filterStatus, filterConstructionStatus, filterDateFrom, filterDateTo, sortOrder, pagination.page]);

  useEffect(() => { setPagination(p => ({ ...p, page: 1 })); }, [filterPropertyId, filterOrderNo, filterStatus, filterConstructionStatus, filterDateFrom, filterDateTo, sortOrder]);
  useEffect(() => { fetchList(); }, [fetchList, pagination.page]);

  const goPage = (p) => { if (p < 1 || p > pagination.total_pages) return; setPagination(prev => ({ ...prev, page: p })); };

  // 勾选
  const toggleSelect = (orderNo) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(orderNo) ? next.delete(orderNo) : next.add(orderNo);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.order_no)));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const orderNos = Array.from(selectedIds);
      const res = await client.post('/admin/material-orders/batch-delete', { order_nos: orderNos });
      const { deleted, errors } = res.data;
      if (errors && errors.length > 0) {
        toast.error(`${errors.length} 个删除失败：${errors.map(e => e.order_no).join('、')}`);
      } else {
        toast.success(`已删除 ${deleted} 条记录`);
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      setDeleteConfirmOpen(false);
      fetchList();
    } catch (err) {
      toast.error(err?.message || '删除失败');
    }
    finally { setDeleting(false); }
  };

  // 审核派单（合并：审核通过 + 开启施工 + 派单）
  const openApproveAssign = (orderNo) => {
    setApproveAssignOrderNo(orderNo);
    setApproveAssignDesignerId('');
    setApproveAssignDesignDirId('');
    setApproveAssignOpen(true);
  };

  const handleApproveAssign = async (e) => {
    e.preventDefault();
    if (!approveAssignDesignerId || !approveAssignDesignDirId) {
      toast.error('请指定设计师和设计总监'); return;
    }
    if (approveAssignDesignerId === approveAssignDesignDirId) {
      toast.error('设计师和设计总监不能是同一人'); return;
    }
    setApproveAssignSubmitting(true);
    try {
      await client.post(`/admin/material-orders/${approveAssignOrderNo}/approve-and-assign`, {
        designer_id: Number(approveAssignDesignerId),
        design_director_id: Number(approveAssignDesignDirId),
      });
      toast.success('审核派单完成，施工已开启');
      setApproveAssignOpen(false);
      fetchList();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setApproveAssignSubmitting(false); }
  };

  // 驳回
  const openReject = (orderNo) => {
    setRejectOrderNo(orderNo);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) { toast.error('请填写驳回原因'); return; }
    setRejectSubmitting(true);
    try {
      await client.post(`/admin/material-orders/${rejectOrderNo}/reject`, { reason: rejectReason.trim() });
      toast.success('已驳回');
      setRejectOpen(false);
      fetchList();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setRejectSubmitting(false); }
  };

  // 开启施工
  const handleStartConstruction = async (orderNo) => {
    try {
      await client.post(`/admin/material-orders/${orderNo}/start-construction`);
      toast.success('施工已开启，5个阶段已创建');
      fetchList();
    } catch (err) { toast.error(err?.message || '开启施工失败'); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 顶部操作栏 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">工程管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">管理施工项目全流程：派单、审核、进度跟踪</p>
        </div>
        {/* 批量操作栏 */}
        {selectMode ? (
          <div className="flex items-center gap-3 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm text-red-700 font-medium">已选 {selectedIds.size} 项</span>
            <button onClick={() => setDeleteConfirmOpen(true)} disabled={selectedIds.size === 0}
              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              删除选中
            </button>
            <button onClick={exitSelectMode}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消删除</button>
          </div>
        ) : (
          <div className="mt-3">
            <button onClick={enterSelectMode}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              删除
            </button>
          </div>
        )}
        {/* 筛选栏 */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <select value={filterPropertyId} onChange={(e) => setFilterPropertyId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部楼盘</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已驳回</option>
          </select>
          <select value={filterConstructionStatus} onChange={(e) => setFilterConstructionStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">施工：全部</option>
            <option value="not_started">未开始</option>
            <option value="design_phase">设计阶段</option>
            <option value="in_progress">施工中</option>
            <option value="completed">已完成</option>
          </select>
          <input type="text" placeholder="订单号" value={filterOrderNo} onChange={(e) => setFilterOrderNo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-36 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-400 text-sm">至</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="desc">最新优先</option>
            <option value="asc">最早优先</option>
          </select>
          <button onClick={() => { setFilterPropertyId(''); setFilterOrderNo(''); setFilterStatus(''); setFilterConstructionStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setSortOrder('desc'); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">清除筛选</button>
        </div>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={fetchList} />
        </div>
      )}

      {/* ─── 数据表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon="📋" title="暂无选材申请" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {selectMode && (
                      <th className="w-10 px-3 py-3 text-gray-500 font-medium text-xs">
                        <input type="checkbox" checked={selectedIds.size === orders.length && orders.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-500" />
                      </th>
                    )}
                    {['订单号', '楼盘', '房号', '联系人', '电话', '状态', '施工进度', '时间', '操作'].map((h) => (
                      <th key={h} className={`${h === '状态' || h === '施工进度' ? 'text-center' : 'text-left'} ${h === '操作' ? 'text-right' : ''} px-4 py-3 text-gray-500 font-medium text-xs`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.order_no} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/material-orders/${o.order_no}`)}>
                      {selectMode && (
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(o.order_no)}
                            onChange={() => toggleSelect(o.order_no)}
                            className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-500" />
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono text-blue-600 text-xs">{o.order_no}</td>
                      <td className="px-4 py-3 text-gray-900">{o.property_name}</td>
                      <td className="px-4 py-3 text-gray-500">{o.room_number}</td>
                      <td className="px-4 py-3 text-gray-600">{o.applicant_name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{o.applicant_phone}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[o.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_MAP[o.status]?.label || o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {o.construction_status === 'completed' ? (<span className="text-emerald-600 font-medium">已竣工</span>) :
                         o.construction_status === 'in_progress' ? (<span className="text-blue-600 font-medium">{o.current_phase_order}/5 施工中</span>) :
                         o.construction_status === 'design_phase' ? (
                           o.phase1_status === 'owner_design_reviewed'
                             ? (<span className="text-emerald-600 font-medium">待施工</span>)
                             : (<span className="text-purple-600 font-medium">设计阶段</span>)
                         ) :
                         (<span className="text-gray-400">—</span>)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{o.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-0.5">
                          {o.status === 'approved' && o.construction_status === 'not_started' && (
                            <button onClick={() => handleStartConstruction(o.order_no)} className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition-colors">开启施工</button>
                          )}
                          {o.status === 'pending' && (
                            <>
                              <button onClick={() => openApproveAssign(o.order_no)} className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors">审核派单</button>
                              <button onClick={() => openReject(o.order_no)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">驳回</button>
                            </>
                          )}
                          <button onClick={() => navigate(`/material-orders/${o.order_no}`)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">详情</button>
                        </div>
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

      {/* ─── 审核派单弹窗（审核通过 + 开启施工 + 指派设计人员） ─── */}
      {approveAssignOpen && (
        <Modal open={approveAssignOpen} title="审核派单" onClose={() => setApproveAssignOpen(false)} size="md">
          <form onSubmit={handleApproveAssign} className="space-y-4">
            <p className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
              💡 审核通过后将自动开启施工并创建5个阶段，同时指派设计人员。工程师/工程总监在施工管理模块另行指派。
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">设计师 *</label>
              <select value={approveAssignDesignerId} onChange={(e) => setApproveAssignDesignerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择设计师</option>
                {allDesigners.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">设计总监 *</label>
              <select value={approveAssignDesignDirId} onChange={(e) => setApproveAssignDesignDirId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择设计总监</option>
                {allDirectors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setApproveAssignOpen(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={approveAssignSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{approveAssignSubmitting ? '提交中...' : '确认审核派单'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── 驳回弹窗 ─── */}
      {rejectOpen && (
        <Modal open={rejectOpen} title="驳回申请" onClose={() => setRejectOpen(false)}>
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">驳回原因 *</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={500} placeholder="请填写驳回原因" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setRejectOpen(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={rejectSubmitting} className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">{rejectSubmitting ? '提交中...' : '确认驳回'}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmOpen && confirmAction && (
        <ConfirmDialog title={confirmAction.title} message={confirmAction.message} variant={confirmAction.variant} confirmText={confirmAction.confirmText}
          onConfirm={confirmAction.action} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} />
      )}

      <ConfirmDialog open={deleteConfirmOpen}
        title="删除工程记录"
        message={`确认删除选中的 ${selectedIds.size} 条工程记录？此操作将同时删除关联的施工阶段、设计图、操作日志等数据，且不可恢复。`}
        variant="danger"
        confirmText={deleting ? '删除中...' : '确认删除'}
        loading={deleting}
        onConfirm={handleBatchDelete}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
