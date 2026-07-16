import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const EMPTY_FORM = { name: '', cover_image: '', description: '', sort_order: 0, enabled: 1 };

/**
 * 风格选材 — 风格管理（CRUD）
 */
export default function StyleWizardStyles() {
  const toast = useToast();

  const [styles, setStyles] = useState([]);
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

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/styles');
      setStyles(res.data || []);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openModal = (mode, style = null) => {
    setModalMode(mode);
    if (mode === 'edit' && style) {
      setEditingId(style.id);
      setForm({
        name: style.name || '',
        cover_image: style.cover_image || '',
        description: style.description || '',
        sort_order: style.sort_order ?? 0,
        enabled: style.enabled ? 1 : 0,
      });
    } else { setEditingId(null); setForm(EMPTY_FORM); }
    setFormErrors({}); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setSubmitting(false); };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '请输入风格名称';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        cover_image: form.cover_image.trim() || null,
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order) || 0,
      };
      if (modalMode === 'add') {
        const res = await client.post('/admin/styles', payload);
        // 后端创建时默认启用，如选择禁用则补一次更新
        if (Number(form.enabled) === 0 && res.data?.id) {
          await client.put(`/admin/styles/${res.data.id}`, { enabled: 0 });
        }
        toast.success('风格添加成功');
      } else {
        await client.put(`/admin/styles/${editingId}`, { ...payload, enabled: Number(form.enabled) });
        toast.success('风格更新成功');
      }
      closeModal();
      fetchList();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (style) => {
    setConfirmAction({
      title: '删除风格',
      message: `确定要删除风格「${style.name}」吗？删除后不可恢复。`,
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        try {
          await client.delete(`/admin/styles/${style.id}`);
          toast.success('风格已删除');
          setConfirmOpen(false); setConfirmAction(null);
          fetchList();
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
            <h2 className="text-lg font-bold text-gray-900">风格管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">管理选材向导第一步的装修风格（现代简约、奶油风等）</p>
          </div>
          <button onClick={() => openModal('add')} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加风格
          </button>
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
        ) : styles.length === 0 ? (
          <EmptyState icon="🎨" title="暂无风格" description="点击上方按钮添加风格" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['封面', '名称', '描述', '排序', '状态', '操作'].map((h) => (
                    <th key={h} className={`${h === '排序' || h === '状态' ? 'text-center' : 'text-left'} ${h === '操作' ? 'text-right' : ''} px-4 py-3 text-gray-500 font-medium text-xs`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {styles.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden">
                        {s.cover_image
                          ? <img src={s.cover_image} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">🎨</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[320px]"><span className="line-clamp-2">{s.description || '—'}</span></td>
                    <td className="px-4 py-3 text-center text-gray-500">{s.sort_order}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => openModal('edit', s)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                        <button onClick={() => handleDelete(s)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 新增/编辑弹窗 ─── */}
      {modalOpen && (
        <Modal open={modalOpen} title={modalMode === 'add' ? '添加风格' : '编辑风格'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">风格名称 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={32} placeholder="如：现代简约" />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">封面图 URL</label>
              <input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://... 或 /uploads/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="简要描述该风格的特点" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value={1}>启用</option>
                  <option value={0}>禁用</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{submitting ? '保存中...' : '保存'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── 删除确认 ─── */}
      {confirmOpen && confirmAction && (
        <ConfirmDialog open={confirmOpen} title={confirmAction.title} message={confirmAction.message} variant={confirmAction.variant} confirmText={confirmAction.confirmText}
          onConfirm={confirmAction.action} onClose={() => { setConfirmOpen(false); setConfirmAction(null); }} />
      )}
    </div>
  );
}
