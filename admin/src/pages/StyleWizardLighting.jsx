import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const SELECT_CLS = `${INPUT_CLS} bg-white`;

const ROOM_TYPES = ['客厅', '餐厅', '卧室'];

const EMPTY_ITEM = {
  room_type: '客厅', name: '', image_url: '', size: '', wattage: '',
  material: '', color: '', light_source: '', control_method: '', illumination_area: '',
  retail_price: '', sort_order: 0,
};

const DEFAULT_ITEMS = [
  { ...EMPTY_ITEM, room_type: '客厅', name: '主厅灯', sort_order: 1 },
  { ...EMPTY_ITEM, room_type: '餐厅', name: '餐厅灯', sort_order: 2 },
  { ...EMPTY_ITEM, room_type: '卧室', name: '卧室灯', sort_order: 3 },
  { ...EMPTY_ITEM, room_type: '卧室', name: '卧室灯', sort_order: 4 },
  { ...EMPTY_ITEM, room_type: '卧室', name: '卧室灯', sort_order: 5 },
];

const EMPTY_FORM = {
  name: '', image_url: '', original_price: '', discount_price: '', sort_order: 0,
  items: [],
};

/**
 * 风格选材 — 灯具套餐管理（套餐 + 5 件明细子表单）
 */
export default function StyleWizardLighting() {
  const toast = useToast();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalLoading, setModalLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/lighting-packages');
      setPackages(res.data || []);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openAdd = () => {
    setModalMode('add'); setEditingId(null);
    setForm({ ...EMPTY_FORM, items: DEFAULT_ITEMS.map((it) => ({ ...it })) });
    setFormErrors({}); setModalOpen(true);
  };

  const openEdit = async (row) => {
    setModalMode('edit'); setEditingId(row.id);
    setForm(EMPTY_FORM); setFormErrors({});
    setModalOpen(true); setModalLoading(true);
    try {
      const res = await client.get(`/admin/lighting-packages/${row.id}`);
      const p = res.data;
      setForm({
        name: p.name || '',
        image_url: p.image_url || '',
        original_price: p.original_price ?? '',
        discount_price: p.discount_price ?? '',
        sort_order: p.sort_order ?? 0,
        items: (p.items || []).map((it) => ({
          room_type: it.room_type || '客厅',
          name: it.name || '',
          image_url: it.image_url || '',
          size: it.size || '',
          wattage: it.wattage || '',
          material: it.material || '',
          color: it.color || '',
          light_source: it.light_source || '',
          control_method: it.control_method || '',
          illumination_area: it.illumination_area || '',
          retail_price: it.retail_price ?? '',
          sort_order: it.sort_order ?? 0,
        })),
      });
    } catch (err) {
      toast.error(err?.message || '加载套餐详情失败');
      setModalOpen(false);
    } finally { setModalLoading(false); }
  };

  const closeModal = () => { setModalOpen(false); setSubmitting(false); };

  // ─── Items 操作 ───
  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };
  const addItem = () => {
    const items = [...form.items, { ...EMPTY_ITEM, sort_order: form.items.length + 1 }];
    setForm({ ...form, items });
  };
  const removeItem = (idx) => {
    const items = form.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sort_order: i + 1 }));
    setForm({ ...form, items });
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '请输入套餐名称';
    if (form.items.length === 0) errs.items = '至少需要一项灯具明细';
    const itemErrs = form.items.map((it) => {
      const e = {};
      if (!it.name.trim()) e.name = '必填';
      return e;
    });
    if (itemErrs.some((e) => Object.keys(e).length > 0)) errs.items = '所有灯具明细的名称不能为空';
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
        image_url: form.image_url.trim() || null,
        original_price: form.original_price === '' || form.original_price === null ? null : Number(form.original_price),
        discount_price: form.discount_price === '' || form.discount_price === null ? null : Number(form.discount_price),
        sort_order: Number(form.sort_order) || 0,
        items: form.items.map((it) => ({
          room_type: it.room_type,
          name: it.name.trim(),
          image_url: it.image_url || null,
          size: it.size || null,
          wattage: it.wattage || null,
          material: it.material || null,
          color: it.color || null,
          light_source: it.light_source || null,
          control_method: it.control_method || null,
          illumination_area: it.illumination_area || null,
          retail_price: it.retail_price === '' || it.retail_price === null ? null : Number(it.retail_price),
          sort_order: it.sort_order,
        })),
      };
      if (modalMode === 'add') {
        await client.post('/admin/lighting-packages', payload);
        toast.success('灯具套餐添加成功');
      } else {
        await client.put(`/admin/lighting-packages/${editingId}`, payload);
        toast.success('灯具套餐更新成功');
      }
      closeModal();
      fetchList();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (pkg) => {
    setConfirmAction({
      title: '删除灯具套餐',
      message: `确定要删除灯具套餐「${pkg.name}」吗？删除后套餐内所有灯具明细也将一并删除，不可恢复。`,
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        setConfirmLoading(true);
        try {
          await client.delete(`/admin/lighting-packages/${pkg.id}`);
          toast.success('灯具套餐已删除');
          setConfirmOpen(false); setConfirmAction(null); fetchList();
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
        finally { setConfirmLoading(false); }
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
            <h2 className="text-lg font-bold text-gray-900">灯具套餐管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">管理灯具套餐及每套餐的灯具明细（主厅灯、餐厅灯、卧室灯）</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加灯具套餐
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
        ) : packages.length === 0 ? (
          <EmptyState icon="💡" title="暂无灯具套餐" description="点击右上角按钮添加灯具套餐" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['图片', '套餐名称', '原价', '优惠价', '灯具明细数', '排序', '操作'].map((h) => (
                    <th key={h} className={`${h === '灯具明细数' || h === '排序' ? 'text-center' : 'text-left'} ${h === '操作' ? 'text-right' : ''} px-4 py-3 text-gray-500 font-medium text-xs`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">💡</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.original_price != null ? `¥${p.original_price}` : '—'}</td>
                    <td className="px-4 py-3 text-red-600 font-medium whitespace-nowrap">{p.discount_price != null ? `¥${p.discount_price}` : '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{(p.items || []).length} 件</td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.sort_order}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => openEdit(p)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                        <button onClick={() => handleDelete(p)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
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
        <Modal open={modalOpen} size="xl" title={modalMode === 'add' ? '添加灯具套餐' : '编辑灯具套餐'} onClose={closeModal}>
          {modalLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 套餐字段 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">套餐名称 *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder="如：现代简约灯具套餐" />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">套餐主图 URL</label>
                  <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={INPUT_CLS} placeholder="https://... 或 /uploads/..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">原价（元）</label>
                  <input type="number" step="0.01" min="0" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">优惠价（元）</label>
                  <input type="number" step="0.01" min="0" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} className={INPUT_CLS} />
                </div>
              </div>

              {/* 灯具明细子表单 */}
              <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    灯具明细
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">（共 {form.items.length} 件）</span>
                  </p>
                  <button type="button" onClick={addItem}
                    className="inline-flex items-center px-3 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    添加明细
                  </button>
                </div>
                {formErrors.items && <p className="text-red-500 text-xs mb-2">{formErrors.items}</p>}
                <div className="space-y-3">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">明细 #{idx + 1}</span>
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-red-400 hover:text-red-600 transition-colors" title="删除此明细">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">空间类型</label>
                          <select value={it.room_type} onChange={(e) => updateItem(idx, 'room_type', e.target.value)} className={SELECT_CLS}>
                            {ROOM_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">灯具名称 *</label>
                          <input value={it.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} className={INPUT_CLS} maxLength={128} placeholder="如：主厅吊灯" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">图片 URL</label>
                          <input value={it.image_url} onChange={(e) => updateItem(idx, 'image_url', e.target.value)} className={INPUT_CLS} placeholder="https://..." />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">尺寸</label>
                          <input value={it.size} onChange={(e) => updateItem(idx, 'size', e.target.value)} className={INPUT_CLS} maxLength={64} placeholder="如：800×600mm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">功率</label>
                          <input value={it.wattage} onChange={(e) => updateItem(idx, 'wattage', e.target.value)} className={INPUT_CLS} maxLength={32} placeholder="如：36W" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">材质</label>
                          <input value={it.material} onChange={(e) => updateItem(idx, 'material', e.target.value)} className={INPUT_CLS} maxLength={64} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">颜色</label>
                          <input value={it.color} onChange={(e) => updateItem(idx, 'color', e.target.value)} className={INPUT_CLS} maxLength={32} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">光源类型</label>
                          <input value={it.light_source} onChange={(e) => updateItem(idx, 'light_source', e.target.value)} className={INPUT_CLS} maxLength={64} placeholder="如：LED" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">控制方式</label>
                          <input value={it.control_method} onChange={(e) => updateItem(idx, 'control_method', e.target.value)} className={INPUT_CLS} maxLength={64} placeholder="如：遥控" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">照明面积</label>
                          <input value={it.illumination_area} onChange={(e) => updateItem(idx, 'illumination_area', e.target.value)} className={INPUT_CLS} maxLength={32} placeholder="如：15-20㎡" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">建议零售价（元）</label>
                          <input type="number" step="0.01" min="0" value={it.retail_price} onChange={(e) => updateItem(idx, 'retail_price', e.target.value)} className={INPUT_CLS} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">排序</label>
                          <input type="number" value={it.sort_order} onChange={(e) => updateItem(idx, 'sort_order', e.target.value)} className={INPUT_CLS} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{submitting ? '保存中...' : '保存'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ─── 删除确认 ─── */}
      {confirmOpen && confirmAction && (
        <ConfirmDialog open={confirmOpen} title={confirmAction.title} message={confirmAction.message} variant={confirmAction.variant} confirmText={confirmAction.confirmText}
          loading={confirmLoading} onConfirm={confirmAction.action} onClose={() => { setConfirmOpen(false); setConfirmAction(null); }} />
      )}
    </div>
  );
}
