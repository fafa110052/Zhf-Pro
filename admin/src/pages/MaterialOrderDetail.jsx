import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Modal from '../components/Modal';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const STATUS_MAP = {
  pending: { label: '待审核', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已通过', cls: 'bg-green-100 text-green-700' },
  rejected: { label: '已驳回', cls: 'bg-red-100 text-red-700' },
  completed: { label: '已完成', cls: 'bg-emerald-100 text-emerald-700' },
  accepted: { label: '已接受', cls: 'bg-blue-100 text-blue-700' },
};

const BANNER_STYLE = {
  pending: 'bg-amber-600 border-b-[3px] border-black/10',
  approved: 'bg-blue-700 border-b-[3px] border-black/10',
  rejected: 'bg-red-600 border-b-[3px] border-black/10',
  completed: 'bg-emerald-700 border-b-[3px] border-black/10',
  accepted: 'bg-slate-800 border-b-[3px] border-black/10',
};

const BANNER_STATUS_LABEL = {
  pending: '待审核',
  approved: '设计阶段',
  rejected: '已驳回',
  completed: '已竣工',
};

const PHASE_LABELS = { demolition: '打拆', water_electric: '水电', painting: '油工', material_install: '主材安装', completion: '竣工' };

/** 5阶段色系 — 每个阶段独立识别色，用于进度条圆点、连接线、卡片左边框 */
const PHASE_COLORS = {
  demolition:       { fill: 'bg-orange-500',       ring: 'border-orange-500',       line: 'bg-orange-500',       light: 'bg-orange-50',       accent: 'border-l-orange-400' },
  water_electric:   { fill: 'bg-cyan-500',         ring: 'border-cyan-500',         line: 'bg-cyan-500',         light: 'bg-cyan-50',         accent: 'border-l-cyan-400' },
  painting:         { fill: 'bg-violet-500',       ring: 'border-violet-500',       line: 'bg-violet-500',       light: 'bg-violet-50',       accent: 'border-l-violet-400' },
  material_install: { fill: 'bg-amber-500',        ring: 'border-amber-500',        line: 'bg-amber-500',        light: 'bg-amber-50',        accent: 'border-l-amber-400' },
  completion:       { fill: 'bg-emerald-500',      ring: 'border-emerald-500',      line: 'bg-emerald-500',      light: 'bg-emerald-50',      accent: 'border-l-emerald-400' },
};

/** 设计阶段 5 步色系 — 每步独立识别色（派单→提交设计→总监审核→管理员→业主确认） */
const DESIGN_STEP_COLORS = [
  {}, // 占位，步骤从 1 开始
  { fill: 'bg-amber-500',  ring: 'border-amber-500',  text: 'text-amber-600'  },  // 1. 派单
  { fill: 'bg-sky-500',    ring: 'border-sky-500',    text: 'text-sky-600'    },  // 2. 提交设计
  { fill: 'bg-indigo-500', ring: 'border-indigo-500', text: 'text-indigo-600' },  // 3. 总监审核
  { fill: 'bg-violet-500', ring: 'border-violet-500', text: 'text-violet-600' },  // 4. 管理员
  { fill: 'bg-emerald-500',ring: 'border-emerald-500',text: 'text-emerald-600'},  // 5. 业主确认
];

const PHASE_STATUS_LABELS = {
  unassigned: '未派单', assigned: '已派单',
  // 设计阶段 — 标注审核角色
  design_uploaded: '待设计总监审核', design_director_approved: '待管理员审核',
  design_director_rejected: '设计总监已驳回', design_admin_approved: '待业主确认设计',
  design_admin_rejected: '管理员已驳回', owner_design_reviewed: '等待管理员分配',
  owner_design_disputed: '业主已驳回', engineer_design_confirmed: '待工程总监确认',
  // 施工阶段 — 标注审核角色
  construction_confirmed: '施工中', construction_uploaded: '待工程总监审核',
  engineering_director_approved: '待管理员审核', engineering_director_rejected: '工程总监已驳回',
  construction_admin_approved: '待业主验收', construction_admin_rejected: '管理员已驳回',
  owner_accepted: '业主已验收', owner_disputed: '业主已驳回', locked: '未解锁',
};

function getPhaseStatusCls(status) {
  // 业主已验收（阶段完工）— 深翠绿，最醒目的终态
  if (status === 'owner_accepted') return 'bg-emerald-500 text-white';
  // 未激活 / 未派单 — 灰色
  if (status === 'locked' || status === 'unassigned') return 'bg-slate-100 text-slate-500';
  // 驳回 / 异议 — 红色（任何角色的驳回统一红色告警）
  if (status.includes('rejected') || status === 'owner_disputed' || status === 'owner_design_disputed') return 'bg-red-100 text-red-700';
  // 设计师 / 设计总监 / 管理员 设计阶段
  if (status === 'owner_design_reviewed') return 'bg-amber-100 text-amber-700';
  if (status === 'design_uploaded' || status === 'design_director_approved' || status === 'design_admin_approved' || status === 'engineer_design_confirmed') return 'bg-purple-100 text-purple-700';
  // 工程师 施工中 / 已上传完工 — 蓝色
  if (status === 'construction_confirmed' || status === 'construction_uploaded' || status === 'assigned') return 'bg-blue-100 text-blue-700';
  // 工程总监 待审完工 — 靛青色
  if (status === 'engineering_director_approved') return 'bg-indigo-100 text-indigo-700';
  // 管理员 待二审完工 — 灰蓝色
  if (status === 'construction_admin_approved') return 'bg-slate-200 text-slate-700';
  // 待派单
  if (status === 'assigned') return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-100 text-slate-600';
}

const SECTION_HEADER = "px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2";

/** 根据订单状态决定横幅背景色 */
function getBannerBg(status, constructionStatus, detail) {
  // 已驳回
  if (status === 'rejected') return 'bg-red-600';
  // 已竣工
  if (constructionStatus === 'completed') return 'bg-emerald-700';
  // 施工中
  if (constructionStatus === 'in_progress') return 'bg-slate-800';
  // 设计阶段
  if (constructionStatus === 'design_phase' || status === 'approved') return 'bg-blue-700';
  // 待审核
  if (status === 'pending') return 'bg-amber-600';
  // 默认
  return 'bg-slate-800';
}

/** 获取横幅中的状态文字 */
function getBannerStatusText(status, constructionStatus, detail) {
  if (status === 'rejected') return '已驳回';
  if (constructionStatus === 'completed') return '已竣工';
  if (constructionStatus === 'in_progress') return '施工中';
  if (constructionStatus === 'design_phase') {
    const dp = detail?.construction?.phases?.[0];
    if (dp?.status === 'owner_design_reviewed') return '待派单';
    return '设计阶段';
  }
  if (status === 'approved') return '已通过';
  if (status === 'pending') return '待审核';
  return status || '—';
}

function getBannerSubText(status, constructionStatus, detail) {
  var parts = [];
  if (status === 'rejected' && detail?.reject_reason) {
    parts.push('驳回原因：' + detail.reject_reason);
  } else if (constructionStatus === 'completed') {
    parts.push('全部阶段已完成');
  } else if (constructionStatus === 'in_progress') {
    var cur = detail?.current_phase_order || 0;
    var phases = detail?.construction?.phases || [];
    var cp = phases[cur - 1];
    parts.push('当前阶段：' + (cp ? PHASE_LABELS[cp.phase_type] || '阶段' + cur : '阶段' + cur));
  } else if (constructionStatus === 'design_phase') {
    const dp = detail?.construction?.phases?.[0];
    if (dp?.status === 'owner_design_reviewed') {
      parts.push('设计已完成，等待指派施工人员');
    } else {
      parts.push('设计审核进行中');
    }
  } else if (status === 'pending') {
    parts.push('等待管理员审核');
  }
  if (detail?.applicant_name) parts.push('申请人：' + detail.applicant_name);
  if (detail?.created_at) parts.push(detail.created_at.slice(0, 10));
  return parts;
}

export default function MaterialOrderDetail() {
  const { orderNo } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 人员下拉
  const [allDesigners, setAllDesigners] = useState([]);
  const [allDirectors, setAllDirectors] = useState([]);
  const [allEngineers, setAllEngineers] = useState([]);
  const [allEngDirectors, setAllEngDirectors] = useState([]);

  // 审核派单弹窗
  const [approveAssignOpen, setApproveAssignOpen] = useState(false);
  const [approveAssignDesignerId, setApproveAssignDesignerId] = useState('');
  const [approveAssignDesignDirId, setApproveAssignDesignDirId] = useState('');
  const [approveAssignSubmitting, setApproveAssignSubmitting] = useState(false);

  // 驳回弹窗
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // 派单弹窗（指派施工人员）
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPhaseId, setAssignPhaseId] = useState(null);
  const [assignEngineerId, setAssignEngineerId] = useState('');
  const [assignEngDirId, setAssignEngDirId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // 设计/完工审核弹窗
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewPhaseId, setReviewPhaseId] = useState(null);
  const [reviewType, setReviewType] = useState('');
  const [reviewAction, setReviewAction] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // 图片灯箱
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // 阶段展开
  const [expandedPhases, setExpandedPhases] = useState(new Set());

  // 开启施工
  const [startingConstruction, setStartingConstruction] = useState(false);

  // 加载人员列表
  useEffect(() => {
    client.get('/admin/users', { params: { role: 'designer', personnel_type: 'designer' } }).then(r => setAllDesigners(r.data.list || [])).catch(() => {});
    client.get('/admin/users', { params: { role: 'designer', personnel_type: 'design_director' } }).then(r => setAllDirectors(r.data.list || [])).catch(() => {});
    client.get('/admin/users', { params: { role: 'designer', personnel_type: 'engineer' } }).then(r => setAllEngineers(r.data.list || [])).catch(() => {});
    client.get('/admin/users', { params: { role: 'designer', personnel_type: 'engineering_director' } }).then(r => setAllEngDirectors(r.data.list || [])).catch(() => {});
  }, []);

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await client.get(`/admin/material-orders/${orderNo}`);
      setDetail(res.data);
    } catch (err) { setError(err?.message || '加载详情失败'); }
    finally { setLoading(false); }
  }, [orderNo]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const refreshDetail = async () => {
    try {
      const res = await client.get(`/admin/material-orders/${orderNo}`);
      setDetail(res.data);
    } catch (err) { toast.error('刷新详情失败'); }
  };

  const togglePhase = (phaseOrder) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phaseOrder) ? next.delete(phaseOrder) : next.add(phaseOrder);
      return next;
    });
  };

  // 审核派单
  const handleApproveAssign = async (e) => {
    e.preventDefault();
    if (!approveAssignDesignerId || !approveAssignDesignDirId) { toast.error('请指定设计师和设计总监'); return; }
    if (approveAssignDesignerId === approveAssignDesignDirId) { toast.error('设计师和设计总监不能是同一人'); return; }
    setApproveAssignSubmitting(true);
    try {
      await client.post(`/admin/material-orders/${orderNo}/approve-and-assign`, {
        designer_id: Number(approveAssignDesignerId),
        design_director_id: Number(approveAssignDesignDirId),
      });
      toast.success('审核派单完成，施工已开启');
      setApproveAssignOpen(false);
      refreshDetail();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setApproveAssignSubmitting(false); }
  };

  // 驳回
  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) { toast.error('请填写驳回原因'); return; }
    setRejectSubmitting(true);
    try {
      await client.post(`/admin/material-orders/${orderNo}/reject`, { reason: rejectReason.trim() });
      toast.success('已驳回');
      setRejectOpen(false);
      refreshDetail();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setRejectSubmitting(false); }
  };

  // 开启施工
  const handleStartConstruction = async () => {
    setStartingConstruction(true);
    try {
      await client.post(`/admin/material-orders/${orderNo}/start-construction`);
      toast.success('施工已开启，5个阶段已创建');
      refreshDetail();
    } catch (err) { toast.error(err?.message || '开启施工失败'); }
    finally { setStartingConstruction(false); }
  };

  // 派单
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignEngineerId || !assignEngDirId) { toast.error('请指定工程师和工程总监'); return; }
    if (assignEngineerId === assignEngDirId) { toast.error('工程师和工程总监不能是同一人'); return; }
    setAssignSubmitting(true);
    try {
      await client.put(`/admin/construction-phases/${assignPhaseId}/assign-engineer`, {
        engineer_id: Number(assignEngineerId),
        engineering_director_id: Number(assignEngDirId),
      });
      toast.success('派单成功');
      setAssignOpen(false);
      refreshDetail();
    } catch (err) { toast.error(err?.message || '派单失败'); }
    finally { setAssignSubmitting(false); }
  };

  // 审核设计/完工
  const submitReview = async (action) => {
    setReviewAction(action);
    if (action === 'reject' && !reviewReason.trim()) { toast.error('驳回必须填写原因'); return; }
    setReviewSubmitting(true);
    try {
      const prefix = reviewType === 'design' ? 'design' : 'construction';
      const url = `/admin/construction-phases/${reviewPhaseId}/${action === 'approve' ? `approve-${prefix}` : `reject-${prefix}`}`;
      await client.post(url, action === 'reject' ? { reason: reviewReason.trim() } : {});
      toast.success(action === 'approve' ? '审核通过' : '已驳回');
      setReviewOpen(false);
      refreshDetail();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setReviewSubmitting(false); }
  };

  // 加载中
  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="h-32 bg-slate-200 animate-pulse rounded-xl" />
        <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
        <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
        <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  // 错误
  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <ErrorState message={error} onRetry={fetchDetail} />
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const status = detail.status;
  const constructionStatus = detail.construction_status;
  const bannerBg = getBannerBg(status, constructionStatus, detail);
  const bannerStatusText = getBannerStatusText(status, constructionStatus, detail);
  const bannerSubTexts = getBannerSubText(status, constructionStatus, detail);
  const dp = detail.construction?.phases?.[0]; // 设计阶段 phase
  const cp = detail.construction?.phases?.[(detail.current_phase_order || 1) - 1]; // 当前施工阶段

  // 是否有进度（施工已开始）
  const hasProgress = constructionStatus && constructionStatus !== 'not_started';

  // 操作按钮逻辑
  const showApproveAssign = status === 'pending';
  const showStartConstruction = status === 'approved' && constructionStatus === 'not_started';
  const showReviewDesign = dp && (dp.status === 'design_director_approved' || dp.status === 'owner_design_disputed');
  const hasActions = showApproveAssign || showStartConstruction || showReviewDesign;

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24">
      {/* ═══════════════════════════════════════════════ */}
      {/* 状态横幅 */}
      {/* ═══════════════════════════════════════════════ */}
      <div className={`${bannerBg} text-white rounded-xl overflow-hidden`}>
        <div className="px-6 py-6">
          {/* 状态标签 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-white/80" />
            <span className="text-sm font-medium opacity-90">{bannerStatusText}</span>
          </div>
          {/* 关键信息 */}
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold tracking-tight">
              {detail.property_name}{detail.room_number ? ' · ' + detail.room_number : ''}
            </h1>
            <span className="text-sm opacity-60 font-mono shrink-0 ml-4 mt-1">{detail.order_no}</span>
          </div>
          {/* 次要信息条 */}
          {bannerSubTexts.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm opacity-75">
              {bannerSubTexts.map((t, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="opacity-30">|</span>}
                  <span>{t}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* 订单信息 */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className={SECTION_HEADER}>
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-semibold text-slate-800">订单信息</span>
        </div>
        <div className="p-5 space-y-4">
          {/* 驳回原因 */}
          {status === 'rejected' && detail.reject_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">驳回原因</p>
              <p className="text-sm text-red-600">{detail.reject_reason}</p>
            </div>
          )}

          {/* 状态 + 订单号 + 时间 */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${STATUS_MAP[status]?.cls || 'bg-slate-100 text-slate-700'}`}>
              {STATUS_MAP[status]?.label || status}
            </span>
            <span className="font-mono text-slate-500 text-sm">{detail.order_no}</span>
            <span className="text-slate-500 text-xs ml-auto">{detail.created_at}</span>
          </div>

          {/* 信息网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 申请信息 */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">申请信息</h5>
              <div className="space-y-2 text-sm">
                <div className="flex"><span className="text-slate-500 w-16 shrink-0">楼盘</span><span className="text-slate-900 font-medium">{detail.property_name}</span></div>
                <div className="flex"><span className="text-slate-500 w-16 shrink-0">房号</span><span className="text-slate-900 font-medium">{detail.room_number}</span></div>
                <div className="flex"><span className="text-slate-500 w-16 shrink-0">联系人</span><span className="text-slate-900 font-medium">{detail.applicant_name}</span></div>
                <div className="flex"><span className="text-slate-500 w-16 shrink-0">电话</span><span className="text-slate-900 font-medium font-mono text-xs">{detail.applicant_phone}</span></div>
              </div>
            </div>

            {/* 服务人员 */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">服务人员</h5>
              {(detail.designer || detail.supervisor) ? (
                <div className="space-y-2 text-sm">
                  {detail.designer && <div className="flex"><span className="text-slate-500 w-16 shrink-0">设计师</span><span className="text-slate-900 font-medium">{detail.designer.name}</span><span className="text-slate-500 text-xs ml-2">{detail.designer.phone}</span></div>}
                  {detail.supervisor && <div className="flex"><span className="text-slate-500 w-16 shrink-0">监理</span><span className="text-slate-900 font-medium">{detail.supervisor.name}</span><span className="text-slate-500 text-xs ml-2">{detail.supervisor.phone}</span></div>}
                </div>
              ) : (
                <p className="text-sm text-slate-400">尚未指派</p>
              )}
            </div>
          </div>

          {/* 备注 */}
          {detail.remark && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">备注</h5>
              <p className="text-sm text-slate-700">{detail.remark}</p>
            </div>
          )}

          {/* 材料清单 */}
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">选材清单（{detail.items?.length || 0}种）</h5>
            {detail.items?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      <th className="py-2 pr-4 text-xs text-slate-500 font-medium">品类</th>
                      <th className="py-2 pr-4 text-xs text-slate-500 font-medium">材料</th>
                      <th className="py-2 pr-4 text-xs text-slate-500 font-medium">品牌</th>
                      <th className="py-2 text-xs text-slate-500 font-medium text-right">单价</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2.5 pr-4"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{item.category_name}</span></td>
                        <td className="py-2.5 pr-4 text-slate-900">{item.material_name}</td>
                        <td className="py-2.5 pr-4 text-slate-500">{item.brand}</td>
                        <td className="py-2.5 text-right text-slate-900 font-medium">¥{item.unit_price}{item.price_unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">暂无选材</p>
            )}
          </div>

          {/* 操作日志 */}
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">操作记录</h5>
            {detail.logs && detail.logs.length > 0 ? (
              <div className="space-y-0">
                {detail.logs.slice(0, 5).map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center pt-1.5">
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-slate-400'}`} />
                      {i < Math.min(detail.logs.length, 5) - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-0.5 min-h-[16px]" />}
                    </div>
                    <div className="pb-2.5 flex-1">
                      <p className="text-sm text-slate-800">{log.detail}</p>
                      {log.action === 'dispute' && detail.dispute_images?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {detail.dispute_images.map((url, j) => (
                            <img key={j} src={url} alt={`异议图${j + 1}`}
                              className="w-16 h-16 object-cover rounded border border-orange-200 hover:border-orange-400 hover:scale-105 transition-all cursor-pointer"
                              onClick={() => setLightboxUrl(url)}
                              onError={(e) => { e.target.style.display = 'none'; }} />
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">{log.created_at}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">暂无操作记录</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* 设计进度（仅施工已开始时显示） */}
      {/* ═══════════════════════════════════════════════ */}
      {hasProgress && dp && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className={SECTION_HEADER}>
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="text-sm font-semibold text-slate-800">设计进度</span>
          </div>
          <div className="p-5 space-y-5">
            {(() => {
              const afterConstruction = ['engineer_design_confirmed','construction_confirmed','construction_uploaded','engineering_director_approved','engineering_director_rejected','construction_admin_approved','construction_admin_rejected','owner_accepted','owner_disputed'];
              const designDone = dp.status === 'owner_design_reviewed' || afterConstruction.includes(dp.status);

              const STATUS_NEXT_STEP = {
                assigned: 2, design_uploaded: 3,
                design_director_approved: 4, design_director_rejected: 3,
                design_admin_approved: 5, design_admin_rejected: 4,
                owner_design_reviewed: 5, owner_design_disputed: 3,
              };
              const currentStepIdx = STATUS_NEXT_STEP[dp.status] || (afterConstruction.includes(dp.status) ? 5 : 0);

              const steps = [
                { label: '派单', done: currentStepIdx > 1 },
                { label: '提交设计', done: dp.design_images?.length > 0 && currentStepIdx > 2 },
                { label: '总监审核', done: currentStepIdx > 3 },
                { label: '管理员', done: currentStepIdx > 4 },
                { label: '业主确认', done: designDone },
              ];

              return (<>
                {/* 状态标签 */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    designDone ? 'bg-emerald-100 text-emerald-700' :
                    dp.status === 'owner_design_disputed' ? 'bg-orange-100 text-orange-700' :
                    dp.status?.includes('rejected') ? 'bg-red-100 text-red-700' :
                    'bg-indigo-100 text-indigo-700'
                  }`}>
                    {designDone ? '设计已完成' : PHASE_STATUS_LABELS[dp.status] || dp.status || '未开始'}
                  </span>
                  {designDone && dp.status === 'owner_design_reviewed' && <span className="text-xs text-amber-600 font-medium">设计已通过，等待指派施工人员</span>}
                  {designDone && dp.status !== 'owner_design_reviewed' && <span className="text-xs text-emerald-600 font-medium">设计已通过，施工进行中</span>}
                  {dp.status?.includes('rejected') && <span className="text-xs text-red-500 font-medium">需重新提交设计</span>}
                </div>

                {/* 5步进度条 */}
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-3">审核进度</p>
                  <div className="flex items-center">
                    {steps.map((step, i) => {
                      const stepIdx = i + 1;
                      const sc = DESIGN_STEP_COLORS[stepIdx] || DESIGN_STEP_COLORS[1];
                      // 判断该步是否被驳回
                      const isRejectedStep =
                        (stepIdx === 3 && dp.status === 'design_director_rejected') ||
                        (stepIdx === 4 && dp.status === 'design_admin_rejected') ||
                        (stepIdx === 5 && dp.status === 'owner_design_disputed');
                      const isCurrentStep = !isRejectedStep && stepIdx === currentStepIdx && currentStepIdx > 0;
                      return (
                        <React.Fragment key={i}>
                          <div className="flex flex-col items-center shrink-0" style={{width: '32px'}}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              isRejectedStep ? 'bg-red-500 text-white' :
                              step.done ? `${sc.fill} text-white` :
                              isCurrentStep ? `border-2 ${sc.ring} bg-white text-slate-700` :
                              'border-2 border-slate-200 bg-white text-slate-500'
                            }`}>
                              {isRejectedStep ? '✕' : step.done ? '✓' : stepIdx}
                            </div>
                          </div>
                          {i < 4 && (
                            <div className={`flex-1 h-1 mx-1 rounded ${
                              step.done && !isRejectedStep ? (DESIGN_STEP_COLORS[stepIdx] || DESIGN_STEP_COLORS[1]).fill : 'bg-slate-200'
                            }`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <div className="flex mt-2">
                    {steps.map((step, i) => {
                      const stepIdx = i + 1;
                      const sc = DESIGN_STEP_COLORS[stepIdx] || DESIGN_STEP_COLORS[1];
                      const isRejectedStep =
                        (stepIdx === 3 && dp.status === 'design_director_rejected') ||
                        (stepIdx === 4 && dp.status === 'design_admin_rejected') ||
                        (stepIdx === 5 && dp.status === 'owner_design_disputed');
                      const isCurrentStep = !isRejectedStep && stepIdx === currentStepIdx && currentStepIdx > 0;
                      return (
                        <React.Fragment key={i}>
                          <span className={`text-xs text-center shrink-0 ${
                            isRejectedStep ? 'text-red-600 font-medium' :
                            step.done || isCurrentStep ? `${sc.text} font-medium` :
                            'text-slate-500'
                          }`} style={{width: '32px'}}>
                            {step.label}{isRejectedStep ? ' 驳' : ''}
                          </span>
                          {i < 4 && <div className="flex-1 mx-1" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* 设计人员卡片 */}
                {(dp.designer_id || dp.design_director_id) ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 border-l-[3px] border-l-sky-400">
                      <span className="text-sky-600 text-xs font-medium">设计师</span>
                      <p className="text-slate-900 font-medium text-sm mt-0.5">{dp.designer?.name || '—'}</p>
                      {dp.designer?.phone && <p className="text-slate-500 text-xs mt-0.5 font-mono">{dp.designer.phone}</p>}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border-l-[3px] border-l-indigo-400">
                      <span className="text-indigo-600 text-xs font-medium">设计总监</span>
                      <p className="text-slate-900 font-medium text-sm mt-0.5">{dp.design_director?.name || '—'}</p>
                      {dp.design_director?.phone && <p className="text-slate-500 text-xs mt-0.5 font-mono">{dp.design_director.phone}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-3">尚未指派设计人员</p>
                )}

                {/* 设计图 */}
                {dp.design_images?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">设计图（{dp.design_images.length}张）</p>
                    <div className="grid grid-cols-4 gap-2">
                      {dp.design_images.map((url, j) => (
                        <img key={j} src={url} className="aspect-square object-cover rounded-lg border border-slate-100 cursor-pointer hover:opacity-80 shadow-sm"
                          onClick={() => setLightboxUrl(url)} onError={(e) => { e.target.style.display = 'none'; }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 业主驳回设计 */}
                {dp.owner_design_dispute_reason && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
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

                {/* 设计审核操作按钮 */}
                {showReviewDesign && (
                  <div className="flex gap-2">
                    <button onClick={() => { setReviewPhaseId(dp.id); setReviewType('design'); setReviewAction(''); setReviewReason(''); setReviewOpen(true); }}
                      className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                      {dp.status === 'owner_design_disputed' ? '重新审核设计' : '二审设计图'}
                    </button>
                  </div>
                )}

                {/* 设计操作日志 */}
                {dp.logs && dp.logs.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">操作记录</p>
                    <div className="space-y-2">
                      {dp.logs.map((log, k) => (
                        <div key={k} className="flex gap-3 text-xs">
                          <span className="text-slate-500 w-32 shrink-0">{(log.created_at || '').slice(0, 16)}</span>
                          <span className="text-slate-700">{log.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>);
            })()}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* 施工进度（仅施工已开始时显示） */}
      {/* ═══════════════════════════════════════════════ */}
      {hasProgress && detail.construction?.phases?.length > 0 && (() => {
        const isDesignPhase = constructionStatus === 'design_phase' && dp?.status !== 'owner_design_reviewed';
        const isReadyForDispatch = constructionStatus === 'design_phase' && dp?.status === 'owner_design_reviewed';
        const isCompleted = constructionStatus === 'completed';
        const phases = detail.construction.phases;

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className={SECTION_HEADER}>
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
              <span className="text-sm font-semibold text-slate-800">施工进度</span>
              <span className={`ml-auto inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isCompleted ? 'bg-emerald-100 text-emerald-700' :
                isDesignPhase ? 'bg-purple-100 text-purple-700' :
                isReadyForDispatch ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {isCompleted ? '已竣工' : isDesignPhase ? '设计阶段' : isReadyForDispatch ? '待派单' : '施工中'}
              </span>
            </div>
            <div className="p-5 space-y-4">
              {/* 5阶段进度条 */}
              <div>
                <p className="text-xs text-slate-500 font-medium mb-3">阶段进度</p>
                <div className="flex items-center">
                  {phases.map((p, i) => {
                    const noConstruction = isDesignPhase || isReadyForDispatch;
                    const isCompletedPhase = !noConstruction && p.status === 'owner_accepted';
                    const isRejectedPhase = !noConstruction && !isCompletedPhase && (p.status?.includes('rejected') || p.status === 'owner_disputed');
                    const isActivePhase = !noConstruction && !isCompletedPhase && !isRejectedPhase && !p.locked && p.phase_order === detail.current_phase_order;
                    const pc = PHASE_COLORS[p.phase_type] || PHASE_COLORS.demolition;
                    return (
                      <React.Fragment key={i}>
                        <div className="flex flex-col items-center shrink-0" style={{width: '32px'}}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            noConstruction ? 'border-2 border-slate-200 bg-white text-slate-500' :
                            isRejectedPhase ? 'bg-red-500 text-white' :
                            isCompletedPhase ? `${pc.fill} text-white` :
                            isActivePhase ? `border-2 ${pc.ring} bg-white text-slate-700` :
                            'border-2 border-slate-200 bg-white text-slate-500'
                          }`}>
                            {noConstruction ? i + 1 : isRejectedPhase ? '✕' : isCompletedPhase ? '✓' : i + 1}
                          </div>
                        </div>
                        {i < 4 && (
                          <div className={`flex-1 h-1 mx-1 rounded ${
                            !noConstruction && (isCompletedPhase || (!isRejectedPhase && p.phase_order < detail.current_phase_order))
                              ? (PHASE_COLORS[p.phase_type] || PHASE_COLORS.demolition).line
                              : 'bg-slate-200'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex mt-2">
                  {phases.map((p, i) => {
                    const noConstruction = isDesignPhase || isReadyForDispatch;
                    const isCompletedPhase = !noConstruction && p.status === 'owner_accepted';
                    const isRejectedPhase = !noConstruction && !isCompletedPhase && (p.status?.includes('rejected') || p.status === 'owner_disputed');
                    const isActivePhase = !noConstruction && !isCompletedPhase && !isRejectedPhase && !p.locked && p.phase_order === detail.current_phase_order;
                    const pc = PHASE_COLORS[p.phase_type] || PHASE_COLORS.demolition;
                    return (
                      <React.Fragment key={i}>
                        <span className={`text-xs text-center shrink-0 ${
                          isRejectedPhase ? 'text-red-600 font-medium' :
                          isCompletedPhase ? `${pc.text} font-medium` :
                          isActivePhase ? `${pc.text} font-medium` :
                          'text-slate-500'
                        }`} style={{width: '32px'}}>
                          {['打拆','水电','油工','主材','竣工'][i]}
                          {isRejectedPhase ? ' 驳' : ''}
                        </span>
                        {i < 4 && <div className="flex-1 mx-1" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* 施工状态说明 */}
              {isDesignPhase ? (
                <p className="text-sm text-slate-400 text-center py-3">设计审核中，施工尚未开始</p>
              ) : isReadyForDispatch ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 text-center">
                  设计已完成，请指派施工人员开始施工
                </div>
              ) : cp && (cp.engineer_id || cp.engineering_director_id) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="text-slate-500 text-xs">当前工程师</span>
                    <p className="text-slate-900 font-medium text-sm mt-0.5">{cp.engineer?.name || '—'}</p>
                    {cp.engineer?.phone && <p className="text-slate-500 text-xs mt-0.5 font-mono">{cp.engineer.phone}</p>}
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="text-slate-500 text-xs">工程总监</span>
                    <p className="text-slate-900 font-medium text-sm mt-0.5">{cp.engineering_director?.name || '—'}</p>
                    {cp.engineering_director?.phone && <p className="text-slate-500 text-xs mt-0.5 font-mono">{cp.engineering_director.phone}</p>}
                  </div>
                </div>
              ) : !isDesignPhase && !isReadyForDispatch ? (
                <p className="text-sm text-slate-400 text-center py-3">尚未指派施工人员</p>
              ) : null}

              {/* 可展开阶段卡片 */}
              {!isDesignPhase && (
                <div className="space-y-2 mt-4">
                  {phases.map((p) => {
                    const pc = PHASE_COLORS[p.phase_type] || PHASE_COLORS.demolition;
                    const isRejected = p.status?.includes('rejected') || p.status === 'owner_disputed';
                    const accentBorder = isRejected ? 'border-l-4 border-l-red-400' : `border-l-4 ${pc.accent}`;
                    return (
                    <div key={p.phase_order} className={`border border-slate-100 rounded-lg overflow-hidden ${accentBorder}`}>
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => togglePhase(p.phase_order)}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 transition-transform duration-200" style={{transform: expandedPhases.has(p.phase_order) ? 'rotate(90deg)' : ''}}>▶</span>
                          <span className="text-sm font-medium text-slate-800">阶段{p.phase_order}：{PHASE_LABELS[p.phase_type]}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPhaseStatusCls(p.status)}`}>
                            {PHASE_STATUS_LABELS[p.status] || p.status}
                          </span>
                        </div>
                      </div>
                      {expandedPhases.has(p.phase_order) && (
                        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                          {/* 施工人员 */}
                          {(p.engineer_id || p.engineering_director_id) && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-50 rounded-lg p-3">
                                <span className="text-slate-500 text-xs">工程师</span>
                                <p className="text-slate-900 font-medium text-sm mt-0.5">{p.engineer?.name || '—'}</p>
                                {p.engineer?.phone && <p className="text-slate-500 text-xs mt-0.5 font-mono">{p.engineer.phone}</p>}
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3">
                                <span className="text-slate-500 text-xs">工程总监</span>
                                <p className="text-slate-900 font-medium text-sm mt-0.5">{p.engineering_director?.name || '—'}</p>
                                {p.engineering_director?.phone && <p className="text-slate-500 text-xs mt-0.5 font-mono">{p.engineering_director.phone}</p>}
                              </div>
                            </div>
                          )}

                          {/* 施工描述 */}
                          {p.construction_description && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                              <p className="text-xs text-blue-500 font-medium mb-1">施工描述</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{p.construction_description}</p>
                            </div>
                          )}

                          {/* 完工图 */}
                          {p.construction_images?.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 font-medium mb-2">完工照片（{p.construction_images.length}张）</p>
                              <div className="grid grid-cols-3 gap-2">
                                {p.construction_images.map((url, j) => (
                                  <img key={j} src={url} className="aspect-square object-cover rounded-lg border border-slate-100 cursor-pointer hover:opacity-80 shadow-sm"
                                    onClick={() => setLightboxUrl(url)} onError={(e) => { e.target.style.display = 'none'; }} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 操作日志 */}
                          {p.logs && p.logs.length > 0 ? (
                            <div>
                              <p className="text-xs text-slate-500 font-medium mb-2">操作记录</p>
                              <div className="space-y-2">
                                {p.logs.map((log, k) => (
                                  <div key={k} className="flex gap-3 text-xs">
                                    <span className="text-slate-500 w-28 shrink-0">{(log.created_at || '').slice(0, 16)}</span>
                                    <span className="text-slate-700">{log.detail}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-2">暂无操作记录</p>
                          )}

                          {/* 阶段操作按钮 */}
                          <div className="flex gap-2 pt-1">
                            {(p.status === 'unassigned' || (p.status === 'owner_design_reviewed' && !p.engineer_id)) && (
                              <button onClick={() => { setAssignPhaseId(p.id); setAssignEngineerId(''); setAssignEngDirId(''); setAssignOpen(true); }}
                                className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">派单</button>
                            )}
                            {p.status === 'engineering_director_approved' && (
                              <button onClick={() => { setReviewPhaseId(p.id); setReviewType('construction'); setReviewAction(''); setReviewReason(''); setReviewOpen(true); }}
                                className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">二审完工图</button>
                            )}
                            {p.status === 'owner_disputed' && (
                              <button onClick={() => { setReviewPhaseId(p.id); setReviewType('construction'); setReviewAction(''); setReviewReason(''); setReviewOpen(true); }}
                                className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">重新处理</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════ */}
      {/* 固定操作底栏 */}
      {/* ═══════════════════════════════════════════════ */}
      {hasActions && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div>
            {showApproveAssign && (
              <button onClick={() => { setRejectReason(''); setRejectOpen(true); }}
                className="px-4 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors">驳回申请</button>
            )}
          </div>
          <div className="flex gap-2">
            {showApproveAssign && (
              <button onClick={() => { setApproveAssignOpen(true); setApproveAssignDesignerId(''); setApproveAssignDesignDirId(''); }}
                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">审核通过并派单</button>
            )}
            {showStartConstruction && (
              <button onClick={handleStartConstruction} disabled={startingConstruction}
                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">
                {startingConstruction ? '开启中...' : '开启施工'}
              </button>
            )}
            {showReviewDesign && (
              <button onClick={() => { setReviewPhaseId(dp.id); setReviewType('design'); setReviewAction(''); setReviewReason(''); setReviewOpen(true); }}
                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                {dp.status === 'owner_design_disputed' ? '重新审核设计' : '审核设计图'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* 审核派单弹窗 */}
      {/* ═══════════════════════════════════════════════ */}
      {approveAssignOpen && (
        <Modal open={approveAssignOpen} title="审核派单" onClose={() => setApproveAssignOpen(false)} size="md">
          <form onSubmit={handleApproveAssign} className="space-y-4">
            <p className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
              审核通过后将自动开启施工并创建5个阶段，同时指派设计人员。工程师/工程总监在施工进度中另行指派。
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">设计师 *</label>
              <select value={approveAssignDesignerId} onChange={(e) => setApproveAssignDesignerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择设计师</option>
                {allDesigners.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">设计总监 *</label>
              <select value={approveAssignDesignDirId} onChange={(e) => setApproveAssignDesignDirId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择设计总监</option>
                {allDirectors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setApproveAssignOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">取消</button>
              <button type="submit" disabled={approveAssignSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{approveAssignSubmitting ? '提交中...' : '确认审核派单'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* 驳回弹窗 */}
      {/* ═══════════════════════════════════════════════ */}
      {rejectOpen && (
        <Modal open={rejectOpen} title="驳回申请" onClose={() => setRejectOpen(false)}>
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">驳回原因 *</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={500} placeholder="请填写驳回原因" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setRejectOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">取消</button>
              <button type="submit" disabled={rejectSubmitting} className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">{rejectSubmitting ? '提交中...' : '确认驳回'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* 指派施工人员弹窗 */}
      {/* ═══════════════════════════════════════════════ */}
      {assignOpen && (
        <Modal open={assignOpen} title="指派施工人员" onClose={() => setAssignOpen(false)}>
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">工程师 *</label>
              <select value={assignEngineerId} onChange={(e) => setAssignEngineerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择工程师</option>
                {allEngineers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">工程总监 *</label>
              <select value={assignEngDirId} onChange={(e) => setAssignEngDirId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择工程总监</option>
                {allEngDirectors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setAssignOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">取消</button>
              <button type="submit" disabled={assignSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{assignSubmitting ? '提交中...' : '确认派单'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* 设计/完工审核弹窗 */}
      {/* ═══════════════════════════════════════════════ */}
      {reviewOpen && (
        <Modal open={reviewOpen} title={`审核${reviewType === 'design' ? '设计图' : '完工图'}`} onClose={() => setReviewOpen(false)}>
          <div className="space-y-4">
            {detail?.construction?.phases?.find(p => p.id === reviewPhaseId) && (() => {
              const ph = detail.construction.phases.find(p => p.id === reviewPhaseId);
              const imgs = reviewType === 'design' ? ph.design_images : ph.construction_images;
              return imgs?.length > 0 ? (
                <div>
                  <p className="text-sm text-slate-600 mb-2">共 {imgs.length} 张</p>
                  <div className="flex flex-wrap gap-2">
                    {imgs.map((url, j) => (
                      <img key={j} src={url} className="w-24 h-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80"
                        onClick={() => setLightboxUrl(url)} onError={(e) => { e.target.style.display = 'none'; }} />
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-slate-500">暂无图片</p>;
            })()}
            {reviewAction === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">驳回原因 *</label>
                <textarea value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                    className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">返回</button>
                  <button onClick={() => submitReview('reject')} disabled={reviewSubmitting || !reviewReason.trim()}
                    className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">{reviewSubmitting ? '提交中...' : '确认驳回'}</button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* 图片灯箱 */}
      {/* ═══════════════════════════════════════════════ */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center cursor-pointer" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="预览大图" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full text-xl flex items-center justify-center transition-colors"
            onClick={() => setLightboxUrl(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
