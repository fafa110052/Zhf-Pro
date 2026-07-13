import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const EMPTY_FORM = { name: '', address: '', property_code: '', cover_image: '', material_enabled: 1 };

export default function Properties() {
  const toast = useToast();

  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/properties', { params });
      setProperties(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList({ keyword, material_enabled: enabledFilter, page: 1, page_size: 20 }); }, [keyword, enabledFilter, fetchList]);

  const handleSearch = (e) => { e.preventDefault(); fetchList({ keyword, material_enabled: enabledFilter, page: 1, page_size: 20 }); };
  const goPage = (p) => { if (p < 1 || p > pagination.total_pages) return; fetchList({ keyword, material_enabled: enabledFilter, page: p, page_size: 20 }); };

  const openModal = (mode, property = null) => {
    setModalMode(mode);
    if (mode === 'edit' && property) {
      setEditingId(property.id);
      setForm({ name: property.name, address: property.address, property_code: property.property_code, cover_image: property.cover_image || '', material_enabled: property.material_enabled });
    } else { setEditingId(null); setForm(EMPTY_FORM); }
    setFormErrors({}); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setSubmitting(false); };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '请输入楼盘名称';
    if (!form.address.trim()) errs.address = '请输入详细地址';
    if (modalMode === 'add' && !/^\d{2}$/.test(form.property_code)) errs.property_code = '小区编号必须为2位数字';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('仅支持 JPG/PNG/GIF/WebP 格式');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/v1/upload?category=properties', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setForm(prev => ({ ...prev, cover_image: data.data.image_url }));
        toast.success('图片上传成功');
      } else {
        toast.error(data.error?.message || '上传失败');
      }
    } catch (err) {
      toast.error('图片上传失败，请检查网络');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = { name: form.name.trim(), address: form.address.trim(), cover_image: form.cover_image || null, material_enabled: form.material_enabled };
      if (modalMode === 'add') {
        payload.property_code = form.property_code;
        await client.post('/admin/properties', payload);
        toast.success('楼盘添加成功');
      } else {
        await client.put(`/admin/properties/${editingId}`, payload);
        toast.success('楼盘信息更新成功');
      }
      closeModal();
      fetchList({ keyword, material_enabled: enabledFilter, page: pagination.page, page_size: 20 });
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (property) => {
    setConfirmAction({
      title: '删除楼盘', message: `确定要删除「${property.name}」吗？${property.material_count > 0 ? `该楼盘下有 ${property.material_count} 条材料将无法删除。` : ''}`, variant: 'danger', confirmText: '确认删除',
      action: async () => {
        try {
          await client.delete(`/admin/properties/${property.id}`);
          toast.success('楼盘已删除');
          setConfirmOpen(false); setConfirmAction(null);
          fetchList({ keyword, material_enabled: enabledFilter, page: pagination.page, page_size: 20 });
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
      },
    });
    setConfirmOpen(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 顶部操作栏 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">楼盘管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">管理楼盘基础信息及选材功能开关</p>
          </div>
          <button onClick={() => openModal('add')} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加楼盘
          </button>
        </div>
        {/* 筛选栏 */}
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 mt-3">
          <input type="text" placeholder="搜索名称/地址..." value={keyword} onChange={(e) => setKeyword(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <select value={enabledFilter} onChange={(e) => setEnabledFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">选材状态：全部</option>
            <option value="1">已开通</option>
            <option value="0">未开通</option>
          </select>
          <button type="submit" className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">搜索</button>
        </form>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => fetchList({ keyword, material_enabled: enabledFilter, page: 1, page_size: 20 })} />
        </div>
      )}

      {/* ─── 数据表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : properties.length === 0 ? (
          <EmptyState icon="🏘️" title="暂无楼盘" description="点击上方按钮添加第一个楼盘" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['编号', '名称', '地址', '材料数', '选材功能', '操作'].map((h) => (
                      <th key={h} className={`${h === '材料数' || h === '选材功能' ? 'text-center' : 'text-left'} ${h === '操作' ? 'text-right' : ''} px-4 py-3 text-gray-500 font-medium text-xs`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.property_code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-48 truncate">{p.address}</td>
                      <td className="px-4 py-3 text-center"><span className="font-medium text-gray-900">{p.material_count ?? 0}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.material_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.material_enabled ? '已开通' : '未开通'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button onClick={() => openModal('edit', p)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                          <button onClick={() => handleDelete(p)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                        </div>
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

      {/* ─── 弹窗 ─── */}
      {modalOpen && (
        <Modal open={modalOpen} title={modalMode === 'add' ? '添加楼盘' : '编辑楼盘'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">楼盘名称 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={64} />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">详细地址 *</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={256} />
              {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>}
            </div>
            {modalMode === 'add' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小区编号 * <span className="text-gray-400 font-normal">(2位数字)</span></label>
                <input value={form.property_code} onChange={(e) => setForm({ ...form, property_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={2} placeholder="如 01" />
                {formErrors.property_code && <p className="text-red-500 text-xs mt-1">{formErrors.property_code}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">封面图</label>
              <div className="flex items-center gap-3">
                <input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="输入图片 URL 或点击上传按钮" />
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="inline-flex items-center px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shrink-0">
                  {uploading ? (
                    <>
                      <svg className="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z" />
                      </svg>
                      上传中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      本地上传
                    </>
                  )}
                </button>
              </div>
              {form.cover_image && (
                <div className="mt-2 relative inline-block">
                  <img src={form.cover_image} alt="封面预览" className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                  <button type="button" onClick={() => setForm({ ...form, cover_image: '' })}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors">×</button>
                </div>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.material_enabled === 1} onChange={(e) => setForm({ ...form, material_enabled: e.target.checked ? 1 : 0 })} className="rounded" />
                开通在线选材功能
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{submitting ? '保存中...' : '保存'}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmOpen && confirmAction && (
        <ConfirmDialog title={confirmAction.title} message={confirmAction.message} variant={confirmAction.variant} confirmText={confirmAction.confirmText}
          onConfirm={confirmAction.action} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} />
      )}
    </div>
  );
}
