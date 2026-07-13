import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const EMPTY_FORM = { category_id: '', property_id: '', name: '', brand: '', image_url: '', unit_price: '', price_unit: '/㎡', description: '', quantity: '0' };

export default function Materials() {
  const toast = useToast();

  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterPropertyId, setFilterPropertyId] = useState('');

  // 下拉选项
  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState([]);

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

  // 加载下拉选项
  useEffect(() => {
    client.get('/admin/material-categories', { params: { page_size: 50 } }).then(r => setCategories(r.data.list || [])).catch(() => {});
    client.get('/admin/properties').then(r => setProperties(r.data.list || [])).catch(() => {});
  }, []);

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/materials', { params });
      setMaterials(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const p = { page: 1, page_size: 20 };
    if (keyword) p.keyword = keyword;
    if (filterCategoryId) p.category_id = filterCategoryId;
    if (filterPropertyId) p.property_id = filterPropertyId;
    fetchList(p);
  }, [keyword, filterCategoryId, filterPropertyId, fetchList]);

  const goPage = (p) => {
    if (p < 1 || p > pagination.total_pages) return;
    const params = { page: p, page_size: 20 };
    if (keyword) params.keyword = keyword;
    if (filterCategoryId) params.category_id = filterCategoryId;
    if (filterPropertyId) params.property_id = filterPropertyId;
    fetchList(params);
  };

  const openModal = (mode, m = null) => {
    setModalMode(mode);
    if (mode === 'edit' && m) {
      setEditingId(m.id);
      setForm({ category_id: m.category_id, property_id: m.property_id, name: m.name, brand: m.brand, image_url: m.image_url || '', unit_price: String(m.unit_price), price_unit: m.price_unit || '/㎡', description: m.description || '', quantity: String(m.quantity ?? 0) });
    } else { setEditingId(null); setForm(EMPTY_FORM); }
    setFormErrors({}); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setSubmitting(false); };

  const validateForm = () => {
    const errs = {};
    if (!form.category_id) errs.category_id = '请选择分类';
    if (!form.property_id) errs.property_id = '请选择楼盘';
    if (!form.name.trim()) errs.name = '请输入材料名称';
    if (!form.brand.trim()) errs.brand = '请输入品牌';
    if (!form.unit_price || Number(form.unit_price) <= 0) errs.unit_price = '请输入有效的单价';
    const qty = Number(form.quantity);
    if (form.quantity === '' || !Number.isInteger(qty) || qty < 0 || qty > 999) errs.quantity = '库存数量必须为0-999的整数';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验文件类型和大小
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
      const res = await fetch('/api/v1/upload?category=materials', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setForm(prev => ({ ...prev, image_url: data.data.image_url }));
        toast.success('图片上传成功');
      } else {
        toast.error(data.error?.message || '上传失败');
      }
    } catch (err) {
      toast.error('图片上传失败，请检查网络');
    } finally {
      setUploading(false);
      // 清空 file input 以支持重复上传同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = { category_id: Number(form.category_id), property_id: Number(form.property_id), name: form.name.trim(), brand: form.brand.trim(), image_url: form.image_url || null, unit_price: Number(form.unit_price), price_unit: form.price_unit || '/㎡', description: form.description.trim() || null, quantity: Number(form.quantity) };
      if (modalMode === 'add') {
        await client.post('/admin/materials', payload);
        toast.success('材料添加成功');
      } else {
        await client.put(`/admin/materials/${editingId}`, payload);
        toast.success('材料更新成功');
      }
      closeModal();
      fetchList({ page: pagination.page, page_size: 20, keyword, category_id: filterCategoryId || undefined, property_id: filterPropertyId || undefined });
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (m) => {
    setConfirmAction({
      title: '删除材料', message: `确定要删除「${m.name}」吗？`, variant: 'danger', confirmText: '确认删除',
      action: async () => {
        try {
          await client.delete(`/admin/materials/${m.id}`);
          toast.success('材料已删除');
          setConfirmOpen(false); setConfirmAction(null);
          fetchList({ page: pagination.page, page_size: 20, keyword, category_id: filterCategoryId || undefined, property_id: filterPropertyId || undefined });
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
            <h2 className="text-lg font-bold text-gray-900">材料管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">管理各楼盘的专属硬装材料库</p>
          </div>
          <button onClick={() => openModal('add')} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加材料
          </button>
        </div>
        {/* 筛选 */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <input type="text" placeholder="搜索名称/品牌..." value={keyword} onChange={(e) => setKeyword(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部分类</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterPropertyId} onChange={(e) => setFilterPropertyId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部楼盘</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => fetchList({ page: 1, page_size: 20 })} />
        </div>
      )}

      {/* ─── 数据表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : materials.length === 0 ? (
          <EmptyState icon="📦" title="暂无材料" description="点击上方按钮添加第一条材料" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['名称', '品牌', '分类', '楼盘', '单价', '库存', '操作'].map((h) => (
                      <th key={h} className={`text-left px-4 py-3 text-gray-500 font-medium text-xs ${h === '单价' || h === '库存' || h === '操作' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-44 truncate">{m.name}</td>
                      <td className="px-4 py-3 text-gray-600">{m.brand}</td>
                      <td className="px-4 py-3 text-gray-500">{m.category_name}</td>
                      <td className="px-4 py-3 text-gray-500">{m.property_name}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">¥{m.unit_price}{m.price_unit}</td>
                      <td className="px-4 py-3 text-right">
                        {m.quantity > 0 ? (
                          <span className="text-green-600 font-medium">{m.quantity}</span>
                        ) : (
                          <span className="text-red-500 font-medium">缺货</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button onClick={() => openModal('edit', m)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                          <button onClick={() => handleDelete(m)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
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

      {modalOpen && (
        <Modal open={modalOpen} title={modalMode === 'add' ? '添加材料' : '编辑材料'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {formErrors.category_id && <p className="text-red-500 text-xs mt-1">{formErrors.category_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">楼盘 *</label>
                <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {formErrors.property_id && <p className="text-red-500 text-xs mt-1">{formErrors.property_id}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">材料名称 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={128} />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌 *</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={64} />
                {formErrors.brand && <p className="text-red-500 text-xs mt-1">{formErrors.brand}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">单价 *</label>
                <input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                {formErrors.unit_price && <p className="text-red-500 text-xs mt-1">{formErrors.unit_price}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                <select value={form.price_unit} onChange={(e) => setForm({ ...form, price_unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="/㎡">/㎡</option>
                  <option value="/件">/件</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">库存 *</label>
                <input type="number" min="0" max="999" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0" />
                {formErrors.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">材料图片</label>
              <div className="flex items-center gap-3">
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
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
              {form.image_url && (
                <div className="mt-2 relative inline-block">
                  <img src={form.image_url} alt="预览" className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                  <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors">×</button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={256} placeholder="简短描述（选填）" />
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
