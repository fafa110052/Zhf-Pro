import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const LAYOUT_TYPES = [
  { value: 'image_top_text_bottom', label: '上图下文' },
  { value: 'image_left_text_right', label: '左图右文' },
  { value: 'color_swatch', label: '色块' },
  { value: 'package_card', label: '套餐卡' },
];

const LAYOUT_LABEL = Object.fromEntries(LAYOUT_TYPES.map((t) => [t.value, t.label]));

const EMPTY_FORM = { name: '', sort_order: 0, layout_type: 'image_top_text_bottom', columns: 2, attribute_template: '' };

/**
 * 风格选材 — 品类管理（7 个品类固定，子品类可增删改）
 */
export default function StyleWizardCategories() {
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 弹窗：add 时锁定 category；edit 时带子品类
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [targetCategory, setTargetCategory] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // 步骤封面图弹窗：{ cat, url }
  const [coverModal, setCoverModal] = useState(null);
  const [coverSaving, setCoverSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/style-categories');
      setCategories(res.data || []);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openAdd = (cat) => {
    setModalMode('add'); setTargetCategory(cat); setEditingId(null);
    setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true);
  };

  const openEdit = (cat, sub) => {
    setModalMode('edit'); setTargetCategory(cat); setEditingId(sub.id);
    setForm({
      name: sub.name || '',
      sort_order: sub.sort_order ?? 0,
      layout_type: sub.layout_type || 'image_top_text_bottom',
      columns: sub.columns ?? 2,
      attribute_template: sub.attribute_template || '',
    });
    setFormErrors({}); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setSubmitting(false); };

  const handleCoverSave = async () => {
    setCoverSaving(true);
    try {
      await client.put(`/admin/style-categories/${coverModal.cat.id}`, { cover_image: coverModal.url.trim() || null });
      toast.success('封面图已保存');
      setCoverModal(null);
      fetchList();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setCoverSaving(false); }
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '请输入子品类名称';
    const tpl = form.attribute_template.trim();
    if (tpl) {
      try {
        const parsed = JSON.parse(tpl);
        if (!Array.isArray(parsed)) errs.attribute_template = '必须是 JSON 数组，如 ["功率","色温"]';
      } catch {
        errs.attribute_template = 'JSON 格式不正确，如 ["功率","色温","材质"]';
      }
    }
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
        sort_order: Number(form.sort_order) || 0,
        layout_type: form.layout_type,
        columns: Number(form.columns) || 2,
        attribute_template: form.attribute_template.trim() || null,
      };
      if (modalMode === 'add') {
        await client.post('/admin/subcategories', { ...payload, category_id: targetCategory.id });
        toast.success('子品类添加成功');
      } else {
        await client.put(`/admin/subcategories/${editingId}`, payload);
        toast.success('子品类更新成功');
      }
      closeModal();
      fetchList();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (sub) => {
    setConfirmAction({
      title: '删除子品类',
      message: `确定要删除子品类「${sub.name}」吗？删除后该子品类下的材料将无法在向导中展示。`,
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        try {
          await client.delete(`/admin/subcategories/${sub.id}`);
          toast.success('子品类已删除');
          setConfirmOpen(false); setConfirmAction(null);
          fetchList();
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
      },
    });
    setConfirmOpen(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 顶部说明 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-lg font-bold text-gray-900">品类管理</h2>
        <p className="text-sm text-gray-500 mt-0.5">选材向导共 7 步固定品类，每个品类下可自由配置子品类</p>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={fetchList} />
        </div>
      )}

      {/* ─── 加载中 ─── */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
        </div>
      )}

      {/* ─── 品类分组卡片 ─── */}
      {!loading && !error && categories.map((cat) => (
        <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <span className="text-gray-400 font-mono mr-2">{String(cat.page_number).padStart(2, '0')}</span>
              {cat.name}
              {cat.cover_image && (
                <span className="ml-3 w-10 h-6 rounded overflow-hidden bg-gray-100 inline-block align-middle">
                  <img src={cat.cover_image} alt="" className="w-full h-full object-cover" />
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setCoverModal({ cat, url: cat.cover_image || '' })}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                步骤封面图
              </button>
              <button onClick={() => openAdd(cat)}
                className="inline-flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新增子品类
              </button>
            </div>
          </div>
          {cat.subcategories?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['名称', '布局类型', '列数', '排序', '操作'].map((h) => (
                      <th key={h} className={`${h === '列数' || h === '排序' ? 'text-center' : 'text-left'} ${h === '操作' ? 'text-right' : ''} px-4 py-3 text-gray-500 font-medium text-xs`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.subcategories.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                      <td className="px-4 py-3 text-gray-600">{LAYOUT_LABEL[sub.layout_type] || sub.layout_type || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{sub.columns ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{sub.sort_order}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button onClick={() => openEdit(cat, sub)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                          <button onClick={() => handleDelete(sub)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">暂无子品类，点击右上角按钮添加</p>
          )}
        </div>
      ))}

      {!loading && !error && categories.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <EmptyState icon="🗂️" title="暂无品类数据" description="请先在后端初始化 7 个预置品类" />
        </div>
      )}

      {/* ─── 新增/编辑子品类弹窗 ─── */}
      {modalOpen && (
        <Modal open={modalOpen} onClose={closeModal}
          title={modalMode === 'add' ? `新增子品类 — ${targetCategory?.name || ''}` : `编辑子品类 — ${targetCategory?.name || ''}`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">子品类名称 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={32} placeholder="如：木地板" />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">布局类型</label>
                <select value={form.layout_type} onChange={(e) => setForm({ ...form, layout_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {LAYOUT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">列数</label>
                <select value={form.columns} onChange={(e) => setForm({ ...form, columns: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value={1}>1 列</option>
                  <option value={2}>2 列</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">属性模板（JSON，可空）</label>
              <textarea rows={3} value={form.attribute_template} onChange={(e) => setForm({ ...form, attribute_template: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder='["功率","色温","材质"]' />
              {formErrors.attribute_template
                ? <p className="text-red-500 text-xs mt-1">{formErrors.attribute_template}</p>
                : <p className="text-xs text-gray-400 mt-1">定义该子品类材料的属性字段，格式为 JSON 数组</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{submitting ? '保存中...' : '保存'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── 步骤封面图弹窗 ─── */}
      {coverModal && (
        <Modal open={true} title={`步骤封面图 — ${coverModal.cat.name}`} onClose={() => setCoverModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">封面图 URL</label>
              <input value={coverModal.url} onChange={(e) => setCoverModal({ ...coverModal, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://... 或 /uploads/..." />
              <p className="text-xs text-gray-400 mt-1">小程序向导页该步骤顶部展示的大图，上滑时被表单卡片盖住；留空则该步骤不显示头图</p>
            </div>
            {coverModal.url.trim() && (
              <div className="w-full h-36 rounded-lg overflow-hidden bg-gray-100">
                <img src={coverModal.url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCoverModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="button" onClick={handleCoverSave} disabled={coverSaving} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{coverSaving ? '保存中...' : '保存'}</button>
            </div>
          </div>
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
