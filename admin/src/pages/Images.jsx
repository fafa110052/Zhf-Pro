import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

/**
 * 图片库管理页 — 网格/列表双视图 + 上传 + 批量删除
 *
 * API:
 * - GET    /api/v1/admin/images         列表（分页+筛选）
 * - DELETE /api/v1/admin/images/:id     删除（引用保护）
 * - POST   /api/v1/admin/images/batch   批量删除
 * - POST   /api/v1/upload               单文件上传（支持指定设计师）
 * - POST   /api/v1/upload/multiple      多文件上传（最多9张）
 */

const PAGE_SIZE = 20;

// 业务分类元数据（与后端 imageCategories.js 对应）；角标 6 色互不相同
const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'works', label: '作品' },
  { key: 'avatars', label: '头像' },
  { key: 'properties', label: '楼盘' },
  { key: 'materials', label: '材料' },
  { key: 'construction', label: '施工图' },
  { key: 'banners', label: '运营' },
  { key: 'misc', label: '未分类' },
];
const BADGE_CLASS = {
  works: 'bg-indigo-100 text-indigo-700',
  avatars: 'bg-sky-100 text-sky-700',
  properties: 'bg-emerald-100 text-emerald-700',
  materials: 'bg-amber-100 text-amber-700',
  construction: 'bg-violet-100 text-violet-700',
  banners: 'bg-rose-100 text-rose-700',
  misc: 'bg-slate-100 text-slate-600',
};
const CAT_LABEL = { works: '作品', avatars: '头像', properties: '楼盘', materials: '材料', construction: '施工图', banners: '运营', misc: '未分类' };
// 上传弹窗可选分类（不含"全部"）
const UPLOAD_CATEGORIES = CATEGORIES.filter((c) => c.key);

// 通用复制到剪贴板（兼容 HTTP 环境）
// Clipboard API 仅 HTTPS/localhost 可用，HTTP 需 execCommand 回退
function copyToClipboard(text) {
  // 优先尝试 Clipboard API（HTTPS / localhost）
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallback());
  }
  return fallback();

  function fallback() {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function Images() {
  const toast = useToast();

  // ─── 列表状态 ───
  const [images, setImages] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── 视图 & 筛选 ───
  const [viewMode, setViewMode] = useState('grid');
  const [filterUploader, setFilterUploader] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [counts, setCounts] = useState({});
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // ─── 选中 ───
  const [selected, setSelected] = useState(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  // ─── 弹窗 ───
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadDesignerId, setUploadDesignerId] = useState('');
  const [uploadWorkName, setUploadWorkName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('works');
  const fileInputRef = useRef(null);

  const [previewImage, setPreviewImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteRefInfo, setDeleteRefInfo] = useState(null);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // 当选中要删除的图片且存在引用时，查询引用详情
  useEffect(() => {
    if (!deleteTarget || !deleteTarget.reference_count || deleteTarget.reference_count <= 0) {
      setDeleteRefInfo(null);
      return;
    }
    setLoadingRefs(true);
    setDeleteRefInfo(null);
    client.get(`/admin/images/${deleteTarget.id}/references`)
      .then((res) => setDeleteRefInfo(res.data))
      .catch(() => setDeleteRefInfo(null))
      .finally(() => setLoadingRefs(false));
  }, [deleteTarget]);

  // ─── 设计师列表（用于上传时选择）───
  const [designers, setDesigners] = useState([]);

  // ─── 加载列表 ───
  const fetchImages = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (filterCategory) params.category = filterCategory;
      if (filterUploader) params.keyword = filterUploader;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;

      const res = await client.get('/admin/images', { params });
      setImages(res.data.list);
      setPagination(res.data.pagination);
      setCounts(res.data.counts || {});
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 首屏加载 + 切换分类刷新（filterCategory 初值 '' 已覆盖首屏，无需单独的 mount effect）
  useEffect(() => { fetchImages(1); }, [filterCategory]);

  // 打开上传弹窗时加载设计师列表
  useEffect(() => {
    if (uploadOpen) {
      client.get('/admin/designers', { params: { page_size: 100 } })
        .then((res) => setDesigners(res.data.list || []))
        .catch(() => {});
    }
  }, [uploadOpen]);

  // ─── 筛选 ───
  const handleSearch = () => fetchImages(1);

  // ─── 多选 ───
  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === images.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(images.map((i) => i.id)));
    }
  };

  // ─── 上传 ───
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 预览
    const previews = files.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      preview: URL.createObjectURL(f),
    }));
    setUploadFiles((prev) => [...prev, ...previews].slice(0, 9));
    setUploadResult(null);
    // 清空 input 以便重复选同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeUploadFile = (idx) => {
    const updated = [...uploadFiles];
    URL.revokeObjectURL(updated[idx].preview);
    updated.splice(idx, 1);
    setUploadFiles(updated);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      const token = localStorage.getItem('admin_token');

      // 如果选择了设计师，添加到表单
      if (uploadDesignerId) {
        formData.append('uploaded_by', uploadDesignerId);
      }
      // 作品名称
      if (uploadWorkName.trim()) {
        formData.append('work_name', uploadWorkName.trim());
      }

      if (uploadFiles.length === 1) {
        formData.append('file', uploadFiles[0].file);
        const res = await fetch(`/api/v1/upload?category=${uploadCategory}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || '上传失败');
        setUploadResult({ success: 1, failed: 0, message: '上传成功' });
      } else {
        uploadFiles.forEach((f) => formData.append('files', f.file));
        const res = await fetch(`/api/v1/upload/multiple?category=${uploadCategory}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || '上传失败');
        setUploadResult({
          success: data.data.uploaded?.length || 0,
          failed: data.data.failed?.length || 0,
          message: `成功 ${data.data.uploaded?.length || 0} 张，失败 ${data.data.failed?.length || 0} 张`,
        });
      }

      // 清理预览
      uploadFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setUploadFiles([]);
      setUploadDesignerId('');
      setUploadWorkName('');
      setUploadCategory('works');
      fetchImages(1);
      const count = uploadFiles.length;
      toast.success(count === 1 ? '图片上传成功' : `${count} 张图片上传成功`);
    } catch (err) {
      toast.error(err.message || '上传失败');
      setUploadResult({ success: 0, failed: uploadFiles.length, message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const closeUpload = () => {
    if (uploading) return;
    uploadFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setUploadFiles([]);
    setUploadResult(null);
    setUploadDesignerId('');
    setUploadWorkName('');
    setUploadCategory('works');
    setUploadOpen(false);
  };

  // ─── 删除 ───
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const force = deleteTarget.reference_count > 0;
      await client.delete(`/admin/images/${deleteTarget.id}${force ? '?force=true' : ''}`);
      toast.success(force ? '图片及引用已清理' : '图片已删除');
      setDeleteTarget(null);
      setDeleteRefInfo(null);
      setSelected((prev) => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      fetchImages(pagination.page);
    } catch (err) {
      setDeleteError(err.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // ─── 批量删除 ───
  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(`确定要删除选中的 ${selected.size} 张图片吗？\n\n已引用的图片将被跳过。`);
    if (!confirmed) return;

    setBatchDeleting(true);
    try {
      const res = await client.post('/admin/images/batch', {
        ids: [...selected],
        action: 'delete',
      });
      const result = res.data;
      if (result.failed > 0) {
        toast.warning(`成功删除 ${result.deleted} 张，${result.failed} 张被跳过（已被引用）`);
      } else {
        toast.success(`成功删除 ${result.deleted} 张图片`);
      }
      setSelected(new Set());
      fetchImages(1);
    } catch (err) {
      toast.error(err.message || '批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  // ─── 分页 ───
  const goPage = (p) => {
    if (p < 1 || p > pagination.total_pages || p === pagination.page) return;
    fetchImages(p);
  };

  // ─── 格式化文件大小 ───
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── 分页按钮 ───
  const renderPages = () => {
    const { page, total_pages } = pagination;
    if (total_pages <= 1) return null;
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(total_pages, page + 2);

    if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total_pages) { if (end < total_pages - 1) pages.push('...'); pages.push(total_pages); }

    return (
      <div className="flex items-center space-x-1">
        <button onClick={() => goPage(page - 1)} disabled={page <= 1}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
        {pages.map((p, i) =>
          p === '...' ? <span key={`e${i}`} className="px-1 text-gray-400">…</span> :
            <button key={p} onClick={() => goPage(p)}
              className={`w-8 h-8 text-sm rounded ${p === page ? 'bg-slate-900 text-white' : 'hover:bg-gray-100'}`}>{p}</button>
        )}
        <button onClick={() => goPage(page + 1)} disabled={page >= total_pages}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
      </div>
    );
  };

  // ─── 渲染 ───
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 操作栏 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        {/* 分类 Tab */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = filterCategory === c.key;
            const n = c.key ? (counts[c.key] || 0) : Object.values(counts).reduce((a, b) => a + b, 0);
            return (
              <button key={c.key || 'all'} onClick={() => setFilterCategory(c.key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${active ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                {c.label}<span className={`ml-1 text-xs ${active ? 'text-white/70' : 'text-gray-400'}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 视图切换 */}
          <div className="flex p-0.5 bg-gray-100 rounded-lg">
            <button onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              网格
            </button>
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              列表
            </button>
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <span className="text-sm text-gray-500">已选 {selected.size} 张</span>
                <button onClick={handleBatchDelete} disabled={batchDeleting}
                  className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {batchDeleting ? '删除中...' : `删除选中`}
                </button>
              </>
            )}
            <button onClick={() => setUploadOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              上传图片
            </button>
          </div>
        </div>

        {/* 筛选行 */}
        <div className="flex flex-wrap items-center gap-3">
          <input type="text" placeholder="原名/上传者搜索..." value={filterUploader}
            onChange={(e) => setFilterUploader(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input type="date" value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <span className="text-sm text-gray-400">至</span>
          <input type="date" value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <button onClick={handleSearch}
            className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            搜索
          </button>
          {(filterUploader || filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterUploader(''); setFilterDateFrom(''); setFilterDateTo(''); fetchImages(1); }}
              className="text-sm text-blue-600 hover:text-blue-700">
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* ─── 内容区 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchImages(1)} />
        ) : images.length === 0 ? (
          <EmptyState icon="🖼️" title="暂无图片"
            action={<button onClick={() => setUploadOpen(true)} className="text-sm text-blue-600 hover:underline">上传第一张图片</button>} />
        ) : viewMode === 'grid' ? (
          /* ═══════════ 网格视图 ═══════════ */
          <div>
            {selected.size > 0 && (
              <div className="flex items-center px-4 py-2 border-b border-blue-100 bg-blue-50 text-sm">
                <input type="checkbox" checked={selected.size === images.length} onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 mr-2" />
                <span className="text-blue-700">已选 {selected.size} 张</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
              {images.map((img) => (
                <div key={img.id}
                  className={`group relative bg-gray-50 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selected.has(img.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-200 hover:shadow-md'}`}
                  onClick={() => setPreviewImage(img)}>
                  {/* 复选框 */}
                  <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(img.id)}
                      onChange={() => toggleSelect(img.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 bg-white" />
                  </div>
                  {/* 删除按钮 */}
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(img); setDeleteError(''); }}
                    className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    title="删除">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  {/* 缩略图 */}
                  <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
                    <img src={img.thumb_url || img.image_url} alt={img.original_name || ''}
                      className="w-full h-full object-cover" loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                    <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${BADGE_CLASS[img.category] || BADGE_CLASS.misc}`}>
                      {CAT_LABEL[img.category] || '未分类'}
                    </span>
                  </div>
                  {/* 底部信息 */}
                  <div className="p-2 text-xs">
                    <p className="text-gray-700 truncate" title={img.original_name}>{img.original_name || '未命名'}</p>
                    <p className="text-gray-400 mt-0.5">{formatSize(img.file_size || 0)}</p>
                    {img.reference_count > 0 && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">
                        已引用 {img.reference_count} 次
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ═══════════ 列表视图 ═══════════ */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.size === images.length && images.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">缩略图</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">文件名</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">分类</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">大小</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">尺寸</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">上传者</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">引用</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">日期</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {images.map((img) => (
                  <tr key={img.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selected.has(img.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(img.id)}
                        onChange={() => toggleSelect(img.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                    </td>
                    <td className="px-4 py-3">
                      <img src={img.thumb_url || img.image_url} alt=""
                        className="w-12 h-12 rounded-lg object-cover cursor-pointer border border-gray-100"
                        onClick={() => setPreviewImage(img)}
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setPreviewImage(img)}
                        className="text-blue-600 hover:underline truncate max-w-[200px] block text-left">
                        {img.original_name || '未命名'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_CLASS[img.category] || BADGE_CLASS.misc}`}>
                        {CAT_LABEL[img.category] || '未分类'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatSize(img.file_size || 0)}</td>
                    <td className="px-4 py-3 text-gray-500">{img.width && img.height ? `${img.width}×${img.height}` : '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{img.uploader_name || '-'}</td>
                    <td className="px-4 py-3">
                      {img.reference_count > 0
                        ? <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">{img.reference_count}</span>
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{img.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPreviewImage(img)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">预览</button>
                        <button onClick={() => { setDeleteTarget(img); setDeleteError(''); }}
                          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 底部分页 ─── */}
      {!loading && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between text-sm text-gray-500 px-1">
          <span>共 {pagination.total} 张图片</span>
          {renderPages()}
        </div>
      )}

      {/* ═══════════ 上传弹窗 ═══════════ */}
      <Modal open={uploadOpen} onClose={closeUpload} title="上传图片" size="md"
        footer={
          uploadFiles.length > 0 && (
            <>
              <button onClick={closeUpload} disabled={uploading}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={handleUpload} disabled={uploading}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {uploading ? '上传中...' : `上传 ${uploadFiles.length} 张图片`}
              </button>
            </>
          )
        }>
        <div className="space-y-4">
          {/* 设计师选择 */}
          {designers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">归属设计师（可选）</label>
              <select value={uploadDesignerId}
                onChange={(e) => setUploadDesignerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">不指定（由当前管理员上传）</option>
                {designers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">选择设计师后，图片将归属到该设计师名下</p>
            </div>
          )}

          {/* 业务分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">图片分类</label>
            <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {UPLOAD_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">决定图片存入哪个分类目录</p>
          </div>

          {/* 作品名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作品名称（用于图片命名）</label>
            <input type="text" value={uploadWorkName}
              onChange={(e) => setUploadWorkName(e.target.value)}
              placeholder="如：客厅装修方案"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <p className="text-xs text-gray-400 mt-1">命名格式：设计师-作品名称-日期</p>
          </div>

          {/* 选择区 */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}>
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">点击选择图片（支持 JPG/PNG/WebP，单张 ≤ 10MB）</p>
            <p className="text-xs text-gray-400 mt-1">最多 9 张</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
              onChange={handleFileSelect} className="hidden" />
          </div>

          {/* 已选文件预览 */}
          {uploadFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {uploadFiles.map((f, idx) => (
                <div key={idx} className="relative group bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <img src={f.preview} alt={f.name} className="w-full aspect-square object-cover" />
                  <button onClick={() => removeUploadFile(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="p-1.5 text-[10px]">
                    <p className="truncate text-gray-700">{f.name}</p>
                    <p className="text-gray-400">{formatSize(f.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 上传结果 */}
          {uploadResult && (
            <div className={`p-3 rounded-lg text-sm ${uploadResult.failed > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
              {uploadResult.message}
            </div>
          )}
        </div>
      </Modal>

      {/* ═══════════ 预览弹窗 ═══════════ */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={previewImage.image_url} alt={previewImage.original_name || ''}
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()} />
          {/* 信息栏 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-xl px-5 py-3 text-white text-sm flex items-center gap-4"
            onClick={(e) => e.stopPropagation()}>
            <span>{previewImage.original_name || '未命名'}</span>
            {previewImage.width && previewImage.height && <span className="text-white/50">{previewImage.width}×{previewImage.height}</span>}
            <span className="text-white/50">{formatSize(previewImage.file_size || 0)}</span>
            <button onClick={async () => {
              const fullUrl = window.location.origin + previewImage.image_url;
              const ok = await copyToClipboard(fullUrl);
              if (ok) {
                toast.success('链接已复制到剪贴板');
              } else {
                toast.error('复制失败，请手动复制链接：' + fullUrl);
              }
            }}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-xs">
              复制链接
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ 删除确认 ═══════════ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(''); setDeleteRefInfo(null); }}
        onConfirm={handleDelete}
        title="删除图片"
        message={(() => {
          if (deleteError) return deleteError;
          const base = `确定要删除「${deleteTarget?.original_name || '未命名'}」吗？此操作不可撤销。`;
          if (!deleteTarget?.reference_count || deleteTarget.reference_count <= 0) return base;

          if (loadingRefs) return base + '\n\n⏳ 正在检查作品引用...';
          if (!deleteRefInfo) return base + `\n\n⚠ 该图片被 ${deleteTarget.reference_count} 个作品引用。`;

          const { works } = deleteRefInfo;
          const willLose = works.filter(w => !w.will_be_deleted);
          const willDelete = works.filter(w => w.will_be_deleted);
          let detail = `\n\n该图片被 ${works.length} 个作品引用。`;
          if (willLose.length > 0) {
            detail += `\n\n📌 将从以下作品中移除（自动顺延封面）：`;
            willLose.forEach(w => { detail += `\n  · ${w.title}`; });
          }
          if (willDelete.length > 0) {
            detail += `\n\n⚠️ 以下作品仅剩此图，将一并删除：`;
            willDelete.forEach(w => { detail += `\n  · ${w.title}`; });
          }
          return base + detail;
        })()}
        confirmText={(() => {
          if (deleteTarget?.reference_count > 0 && deleteRefInfo) return '确认删除（含关联作品）';
          if (deleteTarget?.reference_count > 0 && loadingRefs) return '检查中...';
          if (deleteTarget?.reference_count > 0) return '确认删除';
          return '确认删除';
        })()}
        variant={deleteError ? 'warning' : 'danger'}
        loading={deleting}
      />
    </div>
  );
}
