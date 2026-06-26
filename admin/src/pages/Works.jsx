import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

// ═══════════════════════════════════
// 常量
// ═══════════════════════════════════

const STATUS_MAP = {
  draft:    { label: '草稿',   cls: 'bg-gray-100 text-gray-500' },
  pending:  { label: '待审核', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已通过', cls: 'bg-green-100 text-green-700' },
  rejected: { label: '已驳回', cls: 'bg-red-100 text-red-600' },
  offline:  { label: '已下架', cls: 'bg-orange-100 text-orange-700' },
  archived: { label: '已归档', cls: 'bg-slate-100 text-slate-500' },
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'offline', label: '已下架' },
  { value: 'archived', label: '已归档' },
];

const REJECT_REASONS = [
  '图片质量不符合要求',
  '作品信息不完整',
  '分类选择有误',
  '内容涉及违规信息',
  '重复提交',
];

// ═══════════════════════════════════
// 子组件
// ═══════════════════════════════════

function Pagination({ page, totalPages, total, onPage }) {
  if (total === 0) return null;
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>共 {total} 条</span>
      <div className="flex items-center space-x-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">上一页</button>
        {pages.map((p, i) => p === '...'
          ? <span key={`dot-${i}`} className="px-1 text-gray-300">...</span>
          : <button key={p} onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{p}</button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">下一页</button>
      </div>
    </div>
  );
}

/** 审核详情侧边面板 */
function DetailPanel({ work, loading, onClose, onApprove, onReject, onToggleHot, onArchive, onSetCover, onOffline, onOnline, onDelete }) {
  if (!work && !loading) return null;

  const s = STATUS_MAP[work?.review_status] || {};

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      {/* 面板 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : work ? (
          <div className="flex flex-col h-full">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{work.title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 封面 */}
            <div className="shrink-0">
              {work.cover_image ? (
                <img src={work.cover_image} alt="" className="w-full h-56 object-cover" />
              ) : (
                <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-5xl text-gray-300">🏠</div>
              )}
            </div>

            {/* 信息区 */}
            <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
              {/* 状态 */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                  {work.is_hot ? '🔥 ' : ''}{s.label}
                </span>
                <div className="flex items-center space-x-2">
                  {/* 热门切换 */}
                  {work.review_status === 'approved' && (
                    <button onClick={() => onToggleHot(work)} className="text-xs text-orange-500 hover:text-orange-600">
                      {work.is_hot ? '取消热门' : '设为热门'}
                    </button>
                  )}
                  {/* 归档 */}
                  {['approved', 'rejected'].includes(work.review_status) && (
                    <button onClick={() => onArchive(work)} className="text-xs text-gray-500 hover:text-gray-700">
                      归档
                    </button>
                  )}
                </div>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: '设计师', value: work.designer_name },
                  { label: '户型', value: work.house_type_name },
                  { label: '风格', value: work.style_category_name },
                  { label: '面积', value: work.area_sqm ? `${work.area_sqm}㎡` : '—' },
                  { label: '预算', value: work.budget_min ? `${work.budget_min}-${work.budget_max}万` : '—' },
                  { label: '浏览量', value: `${work.view_count || 0} 次` },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-gray-800">{item.value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* 描述 */}
              {work.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">作品描述</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{work.description}</p>
                </div>
              )}

              {/* 驳回原因 */}
              {work.review_status === 'rejected' && work.reject_reason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs text-red-500 font-medium mb-1">驳回原因</p>
                  <p className="text-sm text-red-600">{work.reject_reason}</p>
                </div>
              )}

              {/* 图片列表 */}
              {work.images?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">作品图片 ({work.images.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {work.images.map((img) => {
                      const imgUrl = img.image_url || img.thumb_url;
                      const isCover = work.cover_image === imgUrl;
                      return (
                        <div key={img.id} className="relative aspect-square rounded-lg bg-gray-100 overflow-hidden group">
                          <img src={img.thumb_url || img.image_url} alt="" className="w-full h-full object-cover" />
                          {isCover && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded font-medium">封面</span>
                          )}
                          {!isCover && (
                            <button
                              onClick={() => onSetCover(work, imgUrl)}
                              className="absolute inset-x-0 bottom-0 py-1 bg-black/50 text-white text-[10px] text-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                            >
                              设为封面
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 时间 */}
              <div className="text-xs text-gray-400 space-y-0.5">
                <p>创建时间：{work.created_at}</p>
                {work.reviewed_at && <p>审核时间：{work.reviewed_at}</p>}
              </div>
            </div>

            {/* 底部操作按钮 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 space-y-2">
              {/* 待审核 → 通过/驳回 */}
              {work.review_status === 'pending' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => onReject(work)}
                    className="flex-1 py-2.5 border-2 border-red-300 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
                  >
                    驳 回
                  </button>
                  <button
                    onClick={() => onApprove(work)}
                    className="flex-1 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                  >
                    审核通过
                  </button>
                </div>
              )}

              {/* 已通过 → 下架 */}
              {work.review_status === 'approved' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => onOffline(work)}
                    className="flex-1 py-2.5 border-2 border-orange-300 text-orange-600 text-sm font-medium rounded-xl hover:bg-orange-50 transition-colors"
                  >
                    下 架
                  </button>
                </div>
              )}

              {/* 已驳回 → 删除 */}
              {work.review_status === 'rejected' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => onDelete(work)}
                    className="flex-1 py-2.5 border-2 border-red-300 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
                  >
                    删 除
                  </button>
                </div>
              )}

              {/* 已下架 → 上架 / 删除 */}
              {work.review_status === 'offline' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => onOnline(work)}
                    className="flex-1 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                  >
                    重新上架
                  </button>
                  <button
                    onClick={() => onDelete(work)}
                    className="flex-1 py-2.5 border-2 border-red-300 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
                  >
                    删 除
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** 驳回原因弹窗 */
function RejectModal({ open, work, loading, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => { setReason(''); setCustomReason(''); }, [open]);

  if (!open) return null;

  const finalReason = reason === '__custom__' ? customReason : reason;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!finalReason.trim()) return;
    onConfirm(work, finalReason.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">驳回作品</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            驳回「<span className="font-medium text-gray-900">{work?.title}</span>」，请选择或输入原因：
          </p>
          <div className="space-y-2">
            {REJECT_REASONS.map((r) => (
              <label key={r} className={`flex items-center p-2.5 rounded-lg border cursor-pointer transition-colors ${
                reason === r ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input type="radio" name="reason" value={r} checked={reason === r}
                  onChange={(e) => { setReason(e.target.value); setCustomReason(''); }}
                  className="sr-only" />
                <span className="text-sm text-gray-700">{r}</span>
              </label>
            ))}
            <label className={`flex items-center p-2.5 rounded-lg border cursor-pointer transition-colors ${
              reason === '__custom__' ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input type="radio" name="reason" value="__custom__" checked={reason === '__custom__'}
                onChange={() => setReason('__custom__')} className="sr-only" />
              <span className="text-sm text-gray-500">其他原因...</span>
            </label>
          </div>
          {reason === '__custom__' && (
            <textarea rows={2} value={customReason} onChange={(e) => setCustomReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="请输入驳回原因" autoFocus />
          )}
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
            <button type="submit" disabled={loading || !finalReason.trim()}
              className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              {loading ? '处理中...' : '确认驳回'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// 创建作品弹窗
// ═══════════════════════════════════

function CreateModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [houseTypeId, setHouseTypeId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [styleId, setStyleId] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // 图片
  const [uploadedImages, setUploadedImages] = useState([]); // { id, image_url, thumb_url }
  const [coverImage, setCoverImage] = useState('');
  const [uploading, setUploading] = useState(false);

  // 下拉数据
  const [designers, setDesigners] = useState([]);
  const [categories, setCategories] = useState(null); // { house_type:[], area:[], style:[] }

  // 打开时加载数据
  useEffect(() => {
    if (!open) return;
    setFormError('');
    Promise.all([
      client.get('/admin/designers').then(r => setDesigners(r.data.list || [])).catch(() => {}),
      client.get('/categories').then(r => setCategories(r.data)).catch(() => {}),
    ]);
  }, [open]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < Math.min(files.length, 9); i++) {
        formData.append('files', files[i]);
      }
      const res = await client.post('/upload/multiple', formData);
      const newImages = res.data.uploaded || [];
      setUploadedImages(prev => {
        const all = [...prev, ...newImages];
        // 自动选第一张为封面
        if (!coverImage && all.length > 0) setCoverImage(all[0].image_url);
        return all;
      });
    } catch (err) {
      toast.error(err?.message || '上传失败');
    } finally { setUploading(false); }
  };

  const removeImage = (id) => {
    setUploadedImages(prev => {
      const next = prev.filter(img => img.id !== id);
      if (coverImage && !next.find(img => img.image_url === coverImage)) {
        setCoverImage(next[0]?.image_url || '');
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) { setFormError('请输入作品标题'); return; }
    if (!designerId) { setFormError('请选择设计师'); return; }
    if (!houseTypeId) { setFormError('请选择户型'); return; }
    if (!areaId) { setFormError('请选择部位'); return; }
    if (!styleId) { setFormError('请选择风格'); return; }

    setLoading(true);
    try {
      await client.post('/admin/works', {
        title: title.trim(),
        description: description.trim(),
        designer_id: Number(designerId),
        house_type_id: Number(houseTypeId),
        area_category_id: Number(areaId),
        style_category_id: Number(styleId),
        area_sqm: areaSqm ? Number(areaSqm) : null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        cover_image: coverImage || null,
        images: uploadedImages.map(img => ({ id: img.id })),
      });
      toast.success('作品创建成功');
      onCreated();
    } catch (err) {
      setFormError(err?.message || '创建失败');
    } finally { setLoading(false); }
  };

  // 重置表单
  const resetForm = () => {
    setTitle(''); setDescription(''); setDesignerId('');
    setHouseTypeId(''); setAreaId(''); setStyleId('');
    setAreaSqm(''); setBudgetMin(''); setBudgetMax('');
    setUploadedImages([]); setCoverImage(''); setFormError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  const selectClass = "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent";
  const inputClass = "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-base font-semibold text-gray-900">创建作品</h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
          {/* 错误提示 */}
          {formError && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>
          )}

          {/* 基本信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作品标题 <span className="text-red-400">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className={`w-full ${inputClass}`} placeholder="如：碧桂园翡翠湾 · 现代简约三居" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设计说明</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              className={`w-full ${inputClass} resize-none`} placeholder="描述设计理念、用材、风格特点..." />
          </div>

          {/* 设计师 + 分类 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">设计师 <span className="text-red-400">*</span></label>
              <select value={designerId} onChange={e => setDesignerId(e.target.value)} className={`w-full ${selectClass}`}>
                <option value="">请选择</option>
                {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">面积 (㎡)</label>
              <input type="number" value={areaSqm} onChange={e => setAreaSqm(e.target.value)}
                className={`w-full ${inputClass}`} placeholder="120" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">户型 <span className="text-red-400">*</span></label>
              <select value={houseTypeId} onChange={e => setHouseTypeId(e.target.value)} className={`w-full ${selectClass}`}>
                <option value="">请选择</option>
                {categories?.house_type?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">部位 <span className="text-red-400">*</span></label>
              <select value={areaId} onChange={e => setAreaId(e.target.value)} className={`w-full ${selectClass}`}>
                <option value="">请选择</option>
                {categories?.area?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">风格 <span className="text-red-400">*</span></label>
              <select value={styleId} onChange={e => setStyleId(e.target.value)} className={`w-full ${selectClass}`}>
                <option value="">请选择</option>
                {categories?.style?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* 预算 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预算下限 (元)</label>
              <input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)}
                className={`w-full ${inputClass}`} placeholder="100000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预算上限 (元)</label>
              <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
                className={`w-full ${inputClass}`} placeholder="150000" />
            </div>
          </div>

          {/* 图片上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">作品图片</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {uploadedImages.map(img => (
                <div key={img.id} className={`relative aspect-square rounded-lg bg-gray-100 overflow-hidden border-2 ${
                  coverImage === img.image_url ? 'border-slate-900' : 'border-transparent'
                }`}>
                  <img src={img.thumb_url || img.image_url} alt="" className="w-full h-full object-cover"
                    onClick={() => setCoverImage(img.image_url)} />
                  <button type="button" onClick={() => removeImage(img.id)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
                  {coverImage === img.image_url && (
                    <span className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white text-[10px] text-center py-0.5">封面</span>
                  )}
                </div>
              ))}
              {/* 上传按钮 */}
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] mt-1">{uploading ? '上传中...' : '上传图片'}</span>
                <input type="file" accept="image/jpeg,image/png" multiple onChange={handleUpload}
                  disabled={uploading} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-gray-400">支持 JPG/PNG，最多 9 张。点击图片设为封面。</p>
          </div>

          {/* 按钮 */}
          <div className="flex space-x-3 pt-2 pb-2">
            <button type="button" onClick={handleClose}
              className="flex-1 py-2.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />创建中...</> : '创建作品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// 主组件
// ═══════════════════════════════════

export default function Works() {
  const toast = useToast();

  // 列表
  const [works, setWorks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 12, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 筛选
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 多选
  const [selectedIds, setSelectedIds] = useState(new Set());

  // 详情面板
  const [detailWork, setDetailWork] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 驳回弹窗
  const [rejectModal, setRejectModal] = useState({ open: false, work: null });
  const [rejectLoading, setRejectLoading] = useState(false);

  // 批量驳回
  const [batchRejectModal, setBatchRejectModal] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState('');
  const [batchRejectCustom, setBatchRejectCustom] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  // 创建作品
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // ═══ 加载列表 ═══
  const fetchList = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/works', { params });
      setWorks(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchList({ keyword, review_status: statusFilter, page: 1, page_size: 12 });
  }, [keyword, statusFilter, fetchList]);

  const goPage = (p) => {
    if (p < 1 || p > pagination.total_pages) return;
    fetchList({ keyword, review_status: statusFilter, page: p, page_size: pagination.page_size });
  };

  const refresh = () => fetchList({ keyword, review_status: statusFilter, page: pagination.page, page_size: pagination.page_size });

  // ═══ 选择 ═══
  const toggleSelect = (id) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selectedIds.size === works.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(works.map((w) => w.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  // ═══ 详情 ═══
  const openDetail = async (work) => {
    setDetailWork(work);
    setDetailLoading(true);
    try {
      const res = await client.get(`/admin/works/${work.id}`);
      setDetailWork(res.data);
    } catch { /* keep basic info */ }
    finally { setDetailLoading(false); }
  };

  // ═══ 单条操作 ═══
  const handleApprove = async (work) => {
    try {
      await client.post(`/admin/works/${work.id}/approve`);
      toast.success('审核已通过');
      setDetailWork((prev) => prev ? { ...prev, review_status: 'approved', reject_reason: null } : null);
      refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
  };

  const handleReject = (work) => setRejectModal({ open: true, work });

  const confirmReject = async (work, reason) => {
    setRejectLoading(true);
    try {
      await client.post(`/admin/works/${work.id}/reject`, { reason });
      toast.success('作品已驳回');
      setRejectModal({ open: false, work: null });
      setDetailWork((prev) => prev ? { ...prev, review_status: 'rejected', reject_reason: reason } : null);
      refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setRejectLoading(false); }
  };

  const handleToggleHot = async (work) => {
    try {
      await client.patch(`/admin/works/${work.id}/hot`);
      toast.success(work.is_hot ? '已取消热门' : '已设为热门');
      setDetailWork((prev) => prev ? { ...prev, is_hot: work.is_hot ? 0 : 1 } : null);
      refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
  };

  const handleSetCover = async (work, imageUrl) => {
    try {
      await client.patch(`/admin/works/${work.id}/cover`, { image_url: imageUrl });
      toast.success('封面已更新');
      setDetailWork((prev) => prev ? { ...prev, cover_image: imageUrl } : null);
      refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
  };

  const handleOffline = async (work) => {
    if (!confirm(`确定要下架作品「${work.title}」吗？\n\n作品下架后将不在小程序端展示，但可随时重新上架。`)) return;
    try {
      await client.post(`/admin/works/${work.id}/offline`);
      toast.success('作品已下架');
      setDetailWork((prev) => prev ? { ...prev, review_status: 'offline' } : null);
      refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
  };

  const handleOnline = async (work) => {
    try {
      await client.post(`/admin/works/${work.id}/online`);
      toast.success('作品已重新上架');
      setDetailWork((prev) => prev ? { ...prev, review_status: 'approved' } : null);
      refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
  };

  const handleDelete = async (work) => {
    if (!confirm(`确定要永久删除作品「${work.title}」吗？\n\n⚠️ 删除后数据无法恢复，请谨慎操作。`)) return;
    try {
      await client.delete(`/admin/works/${work.id}`);
      toast.success('作品已删除');
      setDetailWork(null);
      refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
  };

  const handleArchive = async (work) => {
    if (!confirm(`确定要归档作品「${work.title}」吗？\n\n📦 归档说明：\n• 归档后该作品将从默认作品列表中隐藏\n• 不再参与审核流转（通过/驳回）\n• 作品数据会完整保留，可随时查看\n• 目前归档后无法自行恢复\n\n确认归档？`)) return;
    try {
      await client.post(`/admin/works/${work.id}/archive`);
      toast.success('作品已归档');
      setDetailWork(null);
      refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
  };

  // ═══ 批量操作 ═══
  const batchApprove = async () => {
    if (!confirm(`确定批量通过 ${selectedIds.size} 个作品吗？`)) return;
    setBatchLoading(true);
    try {
      const res = await client.post('/admin/works/batch', { ids: [...selectedIds], action: 'approve' });
      toast.success(`已批量通过 ${res.data.success} 个作品`);
      clearSelection(); refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setBatchLoading(false); }
  };

  const openBatchReject = () => {
    setBatchRejectReason(''); setBatchRejectCustom(''); setBatchRejectModal(true);
  };

  const confirmBatchReject = async (e) => {
    e?.preventDefault();
    const reason = (batchRejectReason === '__custom__' ? batchRejectCustom : batchRejectReason).trim();
    if (!reason) return;
    setBatchLoading(true);
    try {
      const res = await client.post('/admin/works/batch', { ids: [...selectedIds], action: 'reject', reason });
      toast.success(`已批量驳回 ${res.data.success} 个作品`);
      setBatchRejectModal(false); clearSelection(); refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setBatchLoading(false); }
  };

  const batchOffline = async () => {
    if (!confirm(`确定批量下架 ${selectedIds.size} 个作品吗？\n\n下架后作品将不在小程序端展示。`)) return;
    setBatchLoading(true);
    try {
      const res = await client.post('/admin/works/batch', { ids: [...selectedIds], action: 'offline' });
      toast.success(`已下架 ${res.data.success} 个作品`);
      clearSelection(); refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setBatchLoading(false); }
  };

  const batchOnline = async () => {
    setBatchLoading(true);
    try {
      const res = await client.post('/admin/works/batch', { ids: [...selectedIds], action: 'online' });
      toast.success(`已上架 ${res.data.success} 个作品`);
      clearSelection(); refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setBatchLoading(false); }
  };

  const batchDelete = async () => {
    if (!confirm(`确定要永久删除 ${selectedIds.size} 个作品吗？\n\n⚠️ 此操作不可恢复！`)) return;
    if (!confirm(`再次确认：永久删除 ${selectedIds.size} 个作品？`)) return;
    setBatchLoading(true);
    try {
      const res = await client.post('/admin/works/batch', { ids: [...selectedIds], action: 'delete' });
      toast.success(`已删除 ${res.data.success} 个作品`);
      clearSelection(); refresh();
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setBatchLoading(false); }
  };

  // ═══ 渲染 ═══
  const hasSelection = selectedIds.size > 0;
  const pendingWorks = works.filter((w) => w.review_status === 'pending');

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 筛选栏 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="搜索作品标题" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            ＋ 创建作品
          </button>
        </div>
      </div>

      {/* ─── 批量操作栏 ─── */}
      {hasSelection && (() => {
        const selectedWorks = works.filter(w => selectedIds.has(w.id));
        const allApproved = selectedWorks.every(w => w.review_status === 'approved');
        const allOffline = selectedWorks.every(w => w.review_status === 'offline');
        const allPending = selectedWorks.every(w => w.review_status === 'pending');
        const allDeletable = selectedWorks.every(w => ['offline', 'rejected'].includes(w.review_status));

        if (!allApproved && !allOffline && !allPending && !allDeletable) {
          return (
            <div className="bg-slate-900 text-white rounded-xl shadow-lg px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
              <span className="text-sm text-slate-400">已选 <b className="text-white">{selectedIds.size}</b> 个作品（仅支持下架/上架/待审核作品批量操作）</span>
              <button onClick={clearSelection}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors">取消选择</button>
            </div>
          );
        }

        return (
          <div className="bg-slate-900 text-white rounded-xl shadow-lg px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="text-sm">已选 <b>{selectedIds.size}</b> 个作品</span>
            <div className="flex items-center space-x-2">
              {allPending && (
                <>
                  <button onClick={batchApprove} disabled={batchLoading}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">批量通过</button>
                  <button onClick={openBatchReject} disabled={batchLoading}
                    className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">批量驳回</button>
                </>
              )}
              {allApproved && (
                <button onClick={batchOffline} disabled={batchLoading}
                  className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">批量下架</button>
              )}
              {allOffline && (
                <>
                  <button onClick={batchOnline} disabled={batchLoading}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">批量上架</button>
                  <button onClick={batchDelete} disabled={batchLoading}
                    className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">批量删除</button>
                </>
              )}
              {allDeletable && !allOffline && (
                <button onClick={batchDelete} disabled={batchLoading}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">批量删除</button>
              )}
              <button onClick={clearSelection}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors">取消选择</button>
            </div>
          </div>
        );
      })()}

      {/* ─── 错误 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => { setError(''); fetchWorks(pagination.page); }} />
        </div>
      )}

      {/* ─── 表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={works.length > 0 && selectedIds.size === works.length}
                    onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-500" />
                </th>
                {['作品', '设计师', '风格', '面积', '预算', '状态', '浏览', '操作'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <div className="w-8 h-8 mx-auto border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" /></td></tr>
              ) : works.length === 0 ? (
                <tr><td colSpan={9}>
                  <EmptyState icon="📋" title="暂无作品数据" size="sm" /></td></tr>
              ) : (
                works.map((w) => (
                  <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(w.id)} onChange={() => toggleSelect(w.id)}
                        className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-500" />
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => openDetail(w)}>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                          {w.cover_image ? <img src={w.cover_image} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">🏠</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[200px] hover:text-blue-600 transition-colors">{w.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{w.house_type_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{w.designer_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{w.style_category_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{w.area_sqm ? `${w.area_sqm}㎡` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {w.budget_min && w.budget_max ? `${w.budget_min}-${w.budget_max}万` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[w.review_status]?.cls}`}>
                        {w.is_hot ? '🔥 ' : ''}{STATUS_MAP[w.review_status]?.label}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{w.view_count || 0} 次</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-0.5">
                        {w.review_status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(w)}
                              className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors">通过</button>
                            <button onClick={() => handleReject(w)}
                              className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">驳回</button>
                          </>
                        )}
                        {w.review_status === 'approved' && (
                          <button onClick={() => handleOffline(w)}
                            className="px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded transition-colors">下架</button>
                        )}
                        {w.review_status === 'rejected' && (
                          <button onClick={() => handleDelete(w)}
                            className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                        )}
                        {w.review_status === 'offline' && (
                          <>
                            <button onClick={() => handleOnline(w)}
                              className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors">上架</button>
                            <button onClick={() => handleDelete(w)}
                              className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                          </>
                        )}
                        <button onClick={() => openDetail(w)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">详情</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} onPage={goPage} />
      </div>

      {/* ═══ 详情侧边面板 ═══ */}
      <DetailPanel
        work={detailWork} loading={detailLoading} onClose={() => setDetailWork(null)}
        onApprove={handleApprove} onReject={handleReject} onToggleHot={handleToggleHot} onArchive={handleArchive}
        onSetCover={handleSetCover} onOffline={handleOffline} onOnline={handleOnline} onDelete={handleDelete}
      />

      {/* ═══ 单个驳回弹窗 ═══ */}
      <RejectModal open={rejectModal.open} work={rejectModal.work}
        loading={rejectLoading} onClose={() => setRejectModal({ open: false, work: null })} onConfirm={confirmReject} />

      {/* ═══ 批量驳回弹窗 ═══ */}
      {batchRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">批量驳回 ({selectedIds.size} 个)</h3>
              <button onClick={() => setBatchRejectModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={confirmBatchReject} className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                {REJECT_REASONS.map((r) => (
                  <label key={r} className={`flex items-center p-2.5 rounded-lg border cursor-pointer ${batchRejectReason === r ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="batchReason" value={r} checked={batchRejectReason === r}
                      onChange={(e) => { setBatchRejectReason(e.target.value); setBatchRejectCustom(''); }} className="sr-only" />
                    <span className="text-sm text-gray-700">{r}</span>
                  </label>
                ))}
                <label className={`flex items-center p-2.5 rounded-lg border cursor-pointer ${batchRejectReason === '__custom__' ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="batchReason" value="__custom__" checked={batchRejectReason === '__custom__'}
                    onChange={() => setBatchRejectReason('__custom__')} className="sr-only" />
                  <span className="text-sm text-gray-500">其他原因...</span>
                </label>
              </div>
              {batchRejectReason === '__custom__' && (
                <textarea rows={2} value={batchRejectCustom} onChange={(e) => setBatchRejectCustom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="请输入驳回原因" autoFocus />
              )}
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setBatchRejectModal(false)}
                  className="flex-1 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
                <button type="submit" disabled={batchLoading || !(batchRejectReason === '__custom__' ? batchRejectCustom.trim() : batchRejectReason)}
                  className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {batchLoading ? '处理中...' : '确认驳回'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ 创建作品弹窗 ═══ */}
      <CreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
