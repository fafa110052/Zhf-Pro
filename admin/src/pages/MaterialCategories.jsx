import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const EMPTY_FORM = { name: '', sort_order: 0 };

export default function MaterialCategories() {
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/material-categories', { params });
      setCategories(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList({ page: 1, page_size: 20 }); }, [fetchList]);

  const goPage = (p) => { if (p < 1 || p > pagination.total_pages) return; fetchList({ page: p, page_size: 20 }); };

  const openModal = (mode, cat = null) => {
    setModalMode(mode);
    if (mode === 'edit' && cat) { setEditingId(cat.id); setForm({ name: cat.name, sort_order: cat.sort_order ?? 0 }); }
    else { setEditingId(null); setForm(EMPTY_FORM); }
    setFormErrors({}); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setSubmitting(false); };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '请输入分类名称';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = { name: form.name.trim(), sort_order: Number(form.sort_order) || 0 };
      if (modalMode === 'add') {
        await client.post('/admin/material-categories', payload);
        toast.success('分类添加成功');
      } else {
        await client.put(`/admin/material-categories/${editingId}`, payload);
        toast.success('分类更新成功');
      }
      closeModal();
      fetchList({ page: pagination.page, page_size: 20 });
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (cat) => {
    setConfirmAction({
      title: '删除分类', message: `确定要删除「${cat.name}」吗？${cat.material_count > 0 ? `该分类下还有 ${cat.material_count} 条材料，无法删除。` : ''}`, variant: 'danger', confirmText: '确认删除',
      action: async () => {
        try {
          await client.delete(`/admin/material-categories/${cat.id}`);
          toast.success('分类已删除');
          setConfirmOpen(false); setConfirmAction(null);
          fetchList({ page: pagination.page, page_size: 20 });
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
            <h2 className="text-lg font-bold text-gray-900">材料分类管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">管理全局材料分类（地板、墙面、卫浴等）</p>
          </div>
          <button onClick={() => openModal('add')} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加分类
          </button>
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
        ) : categories.length === 0 ? (
          <EmptyState icon="🏷️" title="暂无材料分类" description="点击上方按钮添加分类" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['ID', '分类名称', '排序', '材料数', '操作'].map((h) => (
                      <th key={h} className={`${h === '排序' || h === '材料数' ? 'text-center' : 'text-left'} ${h === '操作' ? 'text-right' : ''} px-4 py-3 text-gray-500 font-medium text-xs`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{c.sort_order}</td>
                      <td className="px-4 py-3 text-center"><span className="font-medium text-gray-900">{c.material_count ?? 0}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button onClick={() => openModal('edit', c)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                          <button onClick={() => handleDelete(c)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
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
        <Modal open={modalOpen} title={modalMode === 'add' ? '添加分类' : '编辑分类'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类名称 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={32} />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
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
