import React, { useState, useEffect, useCallback } from 'react';
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

  // 详情
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  // 图片灯箱
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // 施工管理
  const [activeTab, setActiveTab] = useState('order');
  const [expandedPhases, setExpandedPhases] = useState(new Set());

  // 派单弹窗（指派施工人员）
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPhaseId, setAssignPhaseId] = useState(null);
  const [assignEngineerId, setAssignEngineerId] = useState('');
  const [assignEngDirId, setAssignEngDirId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // 设计/完工审核弹窗
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewPhaseId, setReviewPhaseId] = useState(null);
  const [reviewType, setReviewType] = useState(''); // 'design' | 'construction'
  const [reviewAction, setReviewAction] = useState(''); // 'approve' | 'reject'
  const [reviewReason, setReviewReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

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

  // 查看详情
  const openDetail = async (orderNo) => {
    setDetailOpen(true); setDetailLoading(true); setDetail(null); setActiveTab('order');
    try {
      const res = await client.get(`/admin/material-orders/${orderNo}`);
      setDetail(res.data);
    } catch (err) { toast.error('加载详情失败'); }
    finally { setDetailLoading(false); }
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
      if (detailOpen && detail?.order_no === approveAssignOrderNo) openDetail(approveAssignOrderNo);
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
      if (detailOpen && detail?.order_no === rejectOrderNo) openDetail(rejectOrderNo);
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

  const togglePhase = (phaseOrder) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phaseOrder) ? next.delete(phaseOrder) : next.add(phaseOrder);
      return next;
    });
  };

  // 派单
  const openAssign = (phaseId) => {
    setAssignPhaseId(phaseId);
    setAssignEngineerId(''); setAssignEngDirId('');
    setAssignOpen(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignEngineerId || !assignEngDirId) {
      toast.error('请指定工程师和工程总监'); return;
    }
    if (assignEngineerId === assignEngDirId) { toast.error('工程师和工程总监不能是同一人'); return; }
    setAssignSubmitting(true);
    try {
      await client.put(`/admin/construction-phases/${assignPhaseId}/assign-engineer`, {
        engineer_id: Number(assignEngineerId),
        engineering_director_id: Number(assignEngDirId),
      });
      toast.success('派单成功');
      setAssignOpen(false);
      if (detail?.order_no) {
        const res = await client.get(`/admin/material-orders/${detail.order_no}`);
        setDetail(res.data);
      }
    } catch (err) { toast.error(err?.message || '派单失败'); }
    finally { setAssignSubmitting(false); }
  };

  // 审核设计/完工
  const openReview = (phaseId, type) => {
    setReviewPhaseId(phaseId);
    setReviewType(type);
    setReviewAction('');
    setReviewReason('');
    setReviewOpen(true);
  };

  const submitReview = async (action) => {
    setReviewAction(action);
    if (action === 'reject' && !reviewReason.trim()) {
      toast.error('驳回必须填写原因'); return;
    }
    setReviewSubmitting(true);
    try {
      const prefix = reviewType === 'design' ? 'design' : 'construction';
      const url = `/admin/construction-phases/${reviewPhaseId}/${action === 'approve' ? `approve-${prefix}` : `reject-${prefix}`}`;
      await client.post(url, action === 'reject' ? { reason: reviewReason.trim() } : {});
      toast.success(action === 'approve' ? '审核通过' : '已驳回');
      setReviewOpen(false);
      if (detail?.order_no) {
        const res = await client.get(`/admin/material-orders/${detail.order_no}`);
        setDetail(res.data);
      }
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setReviewSubmitting(false); }
  };

  const PHASE_LABELS = { demolition: '打拆', water_electric: '水电', painting: '油工', material_install: '主材安装', completion: '竣工' };
  const PHASE_STATUS_LABELS = {
    unassigned: '未派单', assigned: '已派单', design_uploaded: '待审设计', design_director_approved: '待二审设计',
    design_director_rejected: '设计已驳回', design_admin_approved: '待业主审设计', design_admin_rejected: '设计二审驳回',
    owner_design_reviewed: '待施工', owner_design_disputed: '业主已驳回设计',
    construction_confirmed: '施工中', construction_uploaded: '待审完工', engineering_director_approved: '待二审完工',
    engineering_director_rejected: '完工已驳回', construction_admin_approved: '待验收', construction_admin_rejected: '完工二审驳回',
    owner_accepted: '已验收', owner_disputed: '业主已驳回', locked: '未解锁',
  };

  const getPhaseStatusCls = (status) => {
    if (status === 'owner_accepted') return 'bg-emerald-100 text-emerald-700';
    if (status === 'locked') return 'bg-gray-100 text-gray-400';
    if (status === 'unassigned') return 'bg-yellow-100 text-yellow-700';
    if (status.includes('rejected') || status === 'owner_disputed') return 'bg-red-100 text-red-700';
    if (status === 'owner_design_reviewed') return 'bg-green-100 text-green-700';
    if (status === 'owner_design_disputed') return 'bg-orange-100 text-orange-700';
    if (status.includes('approved') || status === 'construction_confirmed') return 'bg-green-100 text-green-700';
    if (status.includes('uploaded') || status === 'assigned') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-500';
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
                    <tr key={o.order_no} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => openDetail(o.order_no)}>
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
                         o.construction_status === 'design_phase' ? (<span className="text-purple-600 font-medium">设计阶段</span>) :
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
                          <button onClick={() => openDetail(o.order_no)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">详情</button>
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

      {/* ─── 详情侧边栏 ─── */}
      {detailOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[480px] max-w-[90vw] bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-lg">订单详情</h3>
              <button onClick={() => { setDetailOpen(false); setActiveTab('order'); }} className="p-1 hover:bg-slate-100 rounded">✕</button>
            </div>
            {/* Tab 栏 */}
            {detail && detail.construction_status !== 'not_started' && (
              <div className="sticky top-[57px] bg-white border-b px-6 flex gap-0 z-10">
                <button onClick={() => setActiveTab('order')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'order' ? 'border-slate-900 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  订单信息
                </button>
                <button onClick={() => setActiveTab('design')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'design' ? 'border-slate-900 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  设计管理
                </button>
                <button onClick={() => setActiveTab('construction')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'construction' ? 'border-slate-900 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  施工管理
                </button>
              </div>
            )}
            <div className="p-6 space-y-6">
              {detailLoading ? <div className="text-center py-12 text-slate-400">加载中...</div>
              : detail ? (
                <>
                  {/* ═══ Tab1: 订单信息 ═══ */}
                  <div style={{display: activeTab === 'order' ? 'block' : 'none'}}>
                  <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_MAP[detail.status]?.cls || 'bg-gray-100 text-gray-600'}`}>{STATUS_MAP[detail.status]?.label || detail.status}</span>
                    <span className="font-mono text-slate-500 text-sm">{detail.order_no}</span>
                    <span className="text-slate-400 text-xs ml-auto">{detail.created_at}</span>
                  </div>

                  {detail.status === 'rejected' && detail.reject_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
                      <p className="text-sm font-semibold text-red-700 mb-2">驳回原因</p>
                      <p className="text-sm text-red-600 leading-relaxed">{detail.reject_reason}</p>
                    </div>
                  )}

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase mb-4">材料清单（{detail.items?.length || 0}种）</h4>
                    <div className="space-y-2">
                      {detail.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg p-4 shadow-sm">
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{item.category_name}</span>
                          <span className="text-sm font-medium flex-1">{item.material_name}</span>
                          <span className="text-xs text-slate-400">{item.brand}</span>
                          <span className="text-sm font-semibold text-red-500">¥{item.unit_price}{item.price_unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase mb-4">申请信息</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-slate-400">楼盘：</span>{detail.property_name}</div>
                      <div><span className="text-slate-400">房号：</span>{detail.room_number}</div>
                      <div><span className="text-slate-400">联系人：</span>{detail.applicant_name}</div>
                      <div><span className="text-slate-400">电话：</span>{detail.applicant_phone}</div>
                    </div>
                    {detail.remark && <p className="mt-2 text-sm text-slate-500"><span className="text-slate-400">备注：</span>{detail.remark}</p>}
                  </div>

                  {(detail.designer || detail.supervisor) && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase mb-4">服务人员</h4>
                      <div className="space-y-1 text-sm">
                        {detail.designer && <p><span className="text-slate-400">设计师：</span>{detail.designer.name}  {detail.designer.phone}</p>}
                        {detail.supervisor && <p><span className="text-slate-400">监理：</span>{detail.supervisor.name}  {detail.supervisor.phone}</p>}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase mb-4">操作记录</h4>
                    <div className="space-y-3">
                      {detail.logs && detail.logs.length > 0 ? detail.logs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                            {i < (detail.logs?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-0.5" />}
                          </div>
                          <div className="pb-3">
                            <p className="text-sm text-slate-700">{log.detail}</p>
                            {log.action === 'dispute' && detail.dispute_images && detail.dispute_images.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {detail.dispute_images.map((url, j) => (
                                  <img
                                    key={j}
                                    src={url}
                                    alt={`异议图${j + 1}`}
                                    className="w-16 h-16 object-cover rounded border border-orange-200 hover:border-orange-400 hover:scale-105 transition-all cursor-pointer"
                                    onClick={() => setLightboxUrl(url)}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-slate-400 mt-0.5">{log.created_at}</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-300 text-center py-4">暂无操作记录</p>
                      )}
                    </div>
                  </div>

                  {/* 详情页操作按钮 */}
                  <div className="flex gap-2 pt-2">
                    {detail.status === 'pending' && (
                      <>
                        <button onClick={() => { setDetailOpen(false); openApproveAssign(detail.order_no); }} className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">审核派单</button>
                        <button onClick={() => { setDetailOpen(false); openReject(detail.order_no); }} className="flex-1 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">驳回</button>
                      </>
                    )}
                  </div>
                </div>
                {/* ═══ Tab2: 设计管理 ═══ */}
                <div style={{display: activeTab === 'design' ? 'block' : 'none'}}>
                  {detail.construction?.phases?.length > 0 ? (() => {
                    const dp = detail.construction.phases[0];
                    const afterConstruction = ['construction_confirmed','construction_uploaded','engineering_director_approved','engineering_director_rejected','construction_admin_approved','construction_admin_rejected','owner_accepted','owner_disputed'];
                    const designDone = dp.status === 'owner_design_reviewed' || afterConstruction.includes(dp.status);

                    // 状态 → 下一步待处理步骤（1-5 = 哪个步骤在等待操作，5 = 全部完成）
                    const STATUS_NEXT_STEP = {
                      assigned: 2,                    // 已派单 → 下一步：提交设计
                      design_uploaded: 3,             // 已提交 → 下一步：总监审核
                      design_director_approved: 4,    // 总监已审 → 下一步：管理员审核
                      design_director_rejected: 3,    // 总监驳回 → 重做总监审核
                      design_admin_approved: 5,       // 管理员已审 → 下一步：业主确认
                      design_admin_rejected: 4,       // 管理员驳回 → 重做管理员审核
                      owner_design_reviewed: 5,       // 业主已确认 → 全部完成
                      owner_design_disputed: 3,       // 业主驳回 → 回退到总监审核
                    };
                    const currentStepIdx = STATUS_NEXT_STEP[dp.status] || (afterConstruction.includes(dp.status) ? 5 : 0);

                    const steps = [
                      { label: '派单',     done: currentStepIdx > 1 },
                      { label: '提交设计', done: dp.design_images?.length > 0 && currentStepIdx > 2 },
                      { label: '总监审核', done: currentStepIdx > 3 },
                      { label: '管理员',   done: currentStepIdx > 4 },
                      { label: '业主确认', done: designDone },
                    ];

                    return (<>
                      {/* 设计状态卡片 */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-3 mb-5">
                          <span className={designDone ? 'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700' :
                            dp.status === 'owner_design_disputed' ? 'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700' :
                            dp.status?.includes('rejected') ? 'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700' :
                            'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700'}>
                            {designDone ? '设计已完成' : PHASE_STATUS_LABELS[dp.status] || dp.status || '未开始'}
                          </span>
                          {designDone && <span className="text-xs text-emerald-600 font-medium">✓ 设计已审核通过，施工进行中</span>}
                        </div>

                        {/* 审核进度条 */}
                        <div className="mb-5">
                          <p className="text-xs text-gray-400 font-medium mb-3">审核进度</p>
                          <div className="flex items-center">
                            {steps.map((step, i) => (
                              <React.Fragment key={i}>
                                <div className="flex flex-col items-center shrink-0" style={{width: '32px'}}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    step.done ? 'bg-green-500 text-white' :
                                    i + 1 === currentStepIdx && currentStepIdx > 0 ? 'bg-blue-500 text-white' :
                                    'bg-gray-200 text-gray-400'
                                  }`}>
                                    {step.done ? '✓' : i + 1}
                                  </div>
                                </div>
                                {i < 4 && <div className={`flex-1 h-1 mx-1 rounded ${step.done ? 'bg-green-400' : 'bg-gray-200'}`} />}
                              </React.Fragment>
                            ))}
                          </div>
                          <div className="flex mt-2">
                            {steps.map((step, i) => (
                              <React.Fragment key={i}>
                                <span className={`text-xs text-center shrink-0 ${step.done || i + 1 === currentStepIdx ? 'text-gray-700 font-medium' : 'text-gray-400'}`} style={{width: '32px'}}>{step.label}</span>
                                {i < 4 && <div className="flex-1 mx-1" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* 设计人员 */}
                        {(dp.designer_id || dp.design_director_id) ? (
                          <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-100">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-gray-400 text-xs">设计师</span>
                              <p className="text-gray-900 font-medium mt-0.5">{dp.designer?.name || '—'}</p>
                              {dp.designer?.phone && <p className="text-gray-400 text-xs mt-0.5">{dp.designer.phone}</p>}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-gray-400 text-xs">设计总监</span>
                              <p className="text-gray-900 font-medium mt-0.5">{dp.design_director?.name || '—'}</p>
                              {dp.design_director?.phone && <p className="text-gray-400 text-xs mt-0.5">{dp.design_director.phone}</p>}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-300 text-center py-3 border-t border-gray-100">尚未指派设计人员</p>
                        )}
                      </div>

                      {/* 设计图 */}
                      {dp.design_images?.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                          <p className="text-xs text-gray-400 font-medium mb-3">设计图（{dp.design_images.length}张）</p>
                          <div className="flex flex-wrap gap-2">
                            {dp.design_images.map((url, j) => (
                              <img key={j} src={url} className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 shadow-sm"
                                onClick={() => setLightboxUrl(url)} onError={(e) => { e.target.style.display = 'none'; }} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 业主驳回设计 */}
                      {dp.owner_design_dispute_reason && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-orange-600 mb-1">业主驳回设计</p>
                          <p className="text-sm text-orange-700">{dp.owner_design_dispute_reason}</p>
                          {dp.owner_design_dispute_images?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {dp.owner_design_dispute_images.map((url, j) => (
                                <img key={j} src={url} className="w-20 h-20 object-cover rounded-lg border border-orange-200 cursor-pointer"
                                  onClick={() => setLightboxUrl(url)} onError={(e) => { e.target.style.display = 'none'; }} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      {(dp.status === 'design_director_approved' || dp.status === 'owner_design_disputed') && (
                        <div className="flex gap-2">
                          {dp.status === 'design_director_approved' && (
                            <button onClick={() => openReview(dp.id, 'design')} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              二审设计图
                            </button>
                          )}
                          {dp.status === 'owner_design_disputed' && (
                            <button onClick={() => openReview(dp.id, 'design')} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              重新审核设计
                            </button>
                          )}
                        </div>
                      )}

                      {/* 操作日志 */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <p className="text-xs text-gray-400 font-medium mb-3">操作记录</p>
                        {dp.logs && dp.logs.length > 0 ? (
                          <div className="space-y-2.5">
                            {dp.logs.map((log, k) => (
                              <div key={k} className="flex gap-3 text-xs">
                                <span className="text-gray-400 w-32 shrink-0 pt-0.5">{(log.created_at || '').slice(0, 16)}</span>
                                <span className="text-gray-600 leading-relaxed">{log.detail}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-300 text-center py-3">暂无操作记录</p>
                        )}
                      </div>
                    </>);
                  })() : (<div className="text-center py-12 text-slate-400">暂无施工数据</div>)}
                </div>
                {/* ═══ Tab3: 施工管理 ═══ */}
                <div style={{display: activeTab === 'construction' ? 'block' : 'none'}}>
                  {detail.construction?.phases?.length > 0 ? (() => {
                    const cp = detail.construction.phases[detail.current_phase_order - 1] || detail.construction.phases[0];
                    const dp = detail.construction?.phases?.[0];
                    const isDesignPhase = detail.construction_status === 'design_phase' && dp?.status !== 'owner_design_reviewed';
                    const isReadyForDispatch = detail.construction_status === 'design_phase' && dp?.status === 'owner_design_reviewed' && !dp?.engineer_id;
                    const isCompleted = detail.construction_status === 'completed';
                    return (<>
                      {/* 施工状态卡片 */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-3 mb-5">
                          <span className={isCompleted ? 'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700' :
                            isDesignPhase ? 'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700' :
                            isReadyForDispatch ? 'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700' :
                            'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700'}>
                            {isCompleted ? '已竣工' : isDesignPhase ? '设计阶段' : isReadyForDispatch ? '待派单' : '进行中'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {isCompleted ? '全部阶段已完成' :
                             isDesignPhase ? '设计审核中，施工尚未开始' :
                             isReadyForDispatch ? '设计已完成，等待指派施工人员' :
                             `当前阶段 ${detail.current_phase_order}/5 · ${PHASE_LABELS[cp.phase_type]}`}
                          </span>
                        </div>

                        {/* 5 阶段进度条 */}
                        <div className="mb-5">
                          <p className="text-xs text-gray-400 font-medium mb-3">阶段进度</p>
                          <div className="flex items-center">
                            {detail.construction.phases.map((p, i) => {
                              const noConstruction = isDesignPhase || isReadyForDispatch;
                              return (
                              <React.Fragment key={i}>
                                <div className="flex flex-col items-center shrink-0" style={{width: '32px'}}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    noConstruction ? 'bg-gray-200 text-gray-400' :
                                    p.status === 'owner_accepted' ? 'bg-green-500 text-white' :
                                    p.status === 'locked' ? 'bg-gray-200 text-gray-400' :
                                    'bg-blue-500 text-white'}`}>{noConstruction ? i + 1 : p.status === 'owner_accepted' ? '✓' : i + 1}</div>
                                </div>
                                {i < 4 && <div className={`flex-1 h-1 mx-1 rounded ${noConstruction ? 'bg-gray-200' : p.status === 'owner_accepted' ? 'bg-green-400' : 'bg-gray-200'}`} />}
                              </React.Fragment>
                            )})}
                          </div>
                          <div className="flex mt-2">
                            {detail.construction.phases.map((p, i) => (
                              <React.Fragment key={i}>
                                <span className="text-xs text-gray-400 text-center shrink-0" style={{width: '32px'}}>{['打拆','水电','油工','主材','竣工'][i]}</span>
                                {i < 4 && <div className="flex-1 mx-1" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* 施工人员（当前阶段） */}
                        {isDesignPhase ? (
                          <p className="text-sm text-gray-300 text-center py-3 border-t border-gray-100">设计审核中，尚未指派施工人员</p>
                        ) : isReadyForDispatch ? (
                          <p className="text-sm text-yellow-600 text-center py-3 border-t border-gray-100 bg-yellow-50 -mx-5 -mb-5 rounded-b-xl">设计已完成，请指派施工人员开始施工</p>
                        ) : (cp.engineer_id || cp.engineering_director_id) ? (
                          <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-100">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-gray-400 text-xs">工程师</span>
                              <p className="text-gray-900 font-medium mt-0.5">{cp.engineer?.name || '—'}</p>
                              {cp.engineer?.phone && <p className="text-gray-400 text-xs mt-0.5">{cp.engineer.phone}</p>}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <span className="text-gray-400 text-xs">工程总监</span>
                              <p className="text-gray-900 font-medium mt-0.5">{cp.engineering_director?.name || '—'}</p>
                              {cp.engineering_director?.phone && <p className="text-gray-400 text-xs mt-0.5">{cp.engineering_director.phone}</p>}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-300 text-center py-3 border-t border-gray-100">尚未指派施工人员</p>
                        )}
                      </div>
                      {/* 阶段卡片 — 仅显示施工相关内容 */}
                      <div className="space-y-3 mt-4">
                  {detail.construction.phases.map((p) => (
                    <div key={p.phase_order} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => togglePhase(p.phase_order)}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{expandedPhases.has(p.phase_order) ? '▼' : '▶'}</span>
                          <span className="text-sm font-medium text-gray-900">阶段{p.phase_order}：{PHASE_LABELS[p.phase_type]}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPhaseStatusCls(p.status)}`}>
                            {PHASE_STATUS_LABELS[p.status] || p.status}
                          </span>
                        </div>
                      </div>
                      {expandedPhases.has(p.phase_order) && (
                        <div className="px-4 pb-5 space-y-4 border-t border-gray-100 pt-4">
                          {/* 完工图 */}
                          {p.construction_images?.length > 0 && (
                            <div><p className="text-xs text-gray-400 font-medium mb-2">完工图</p>
                            <div className="flex flex-wrap gap-2">
                              {p.construction_images.map((url, j) => (
                                <img key={j} src={url} className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 shadow-sm"
                                  onClick={() => setLightboxUrl(url)} onError={(e) => { e.target.style.display = 'none'; }} />
                              ))}
                            </div></div>
                          )}
                          {/* 操作日志 */}
                          {p.logs && p.logs.length > 0 ? (
                            <div><p className="text-xs text-gray-400 font-medium mb-2">操作记录</p>
                            <div className="space-y-2.5">
                              {p.logs.map((log, k) => (
                                <div key={k} className="flex gap-3 text-xs">
                                  <span className="text-gray-400 w-28 shrink-0 pt-0.5">{(log.created_at || '').slice(0, 16)}</span>
                                  <span className="text-gray-600 leading-relaxed">{log.detail}</span>
                                </div>
                              ))}
                            </div></div>
                          ) : (
                            <p className="text-xs text-gray-300 text-center py-3">暂无操作记录</p>
                          )}
                          {/* 施工操作按钮 */}
                          <div className="flex gap-2 pt-1">
                            {(p.status === 'unassigned' || (p.status === 'owner_design_reviewed' && !p.engineer)) && (
                              <button onClick={() => openAssign(p.id)} className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800">派单</button>
                            )}
                            {p.status === 'engineering_director_approved' && (
                              <button onClick={() => openReview(p.id, 'construction')} className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800">二审完工图</button>
                            )}
                            {p.status === 'owner_disputed' && (
                              <button onClick={() => openReview(p.id, 'construction')} className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800">重新处理</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  </div>
                </>);
              })() : (<div className="text-center py-12 text-slate-400">暂无施工数据</div>)}
                </div>
                </>
              )
              : <div className="text-center py-12 text-slate-400">加载失败</div>}
            </div>
          </div>
        </div>
      )}

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

      {/* ─── 图片灯箱 ─── */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center cursor-pointer" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="预览大图" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full text-xl flex items-center justify-center transition-colors"
            onClick={() => setLightboxUrl(null)}>✕</button>
        </div>
      )}

      {/* ─── 派单弹窗（指派施工人员） ─── */}
      {assignOpen && (
        <Modal open={assignOpen} title="指派施工人员" onClose={() => setAssignOpen(false)}>
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工程师 *</label>
              <select value={assignEngineerId} onChange={(e) => setAssignEngineerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择工程师</option>
                {allEngineers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工程总监 *</label>
              <select value={assignEngDirId} onChange={(e) => setAssignEngDirId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择工程总监</option>
                {allEngDirectors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setAssignOpen(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={assignSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{assignSubmitting ? '提交中...' : '确认派单'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── 设计/完工审核弹窗 ─── */}
      {reviewOpen && (
        <Modal open={reviewOpen} title={`审核${reviewType === 'design' ? '设计图' : '完工图'}`} onClose={() => setReviewOpen(false)}>
          <div className="space-y-4">
            {/* 显示审核的图片 */}
            {detail?.construction?.phases?.find(p => p.id === reviewPhaseId) && (() => {
              const ph = detail.construction.phases.find(p => p.id === reviewPhaseId);
              const imgs = reviewType === 'design' ? ph.design_images : ph.construction_images;
              return imgs?.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">共 {imgs.length} 张</p>
                  <div className="flex flex-wrap gap-2">
                    {imgs.map((url, j) => (
                      <img key={j} src={url} className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                        onClick={() => setLightboxUrl(url)} onError={(e) => { e.target.style.display = 'none'; }} />
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-gray-400">暂无图片</p>;
            })()}
            {reviewAction === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">驳回原因 *</label>
                <textarea value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  maxLength={500} placeholder="请填写驳回原因" />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              {reviewAction === '' ? (
                <>
                  <button onClick={() => setReviewAction('reject')}
                    className="px-4 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors">驳回</button>
                  <button onClick={() => submitReview('approve')} disabled={reviewSubmitting}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">{reviewSubmitting ? '提交中...' : '通过'}</button>
                </>
              ) : (
                <>
                  <button onClick={() => setReviewAction('')}
                    className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">返回</button>
                  <button onClick={() => submitReview('reject')} disabled={reviewSubmitting || !reviewReason.trim()}
                    className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">{reviewSubmitting ? '提交中...' : '确认驳回'}</button>
                </>
              )}
            </div>
          </div>
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
