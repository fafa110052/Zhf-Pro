import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const SELECT_CLS = `${INPUT_CLS} bg-white`;

const EMPTY_SERIES = { name: '', image_url: '', sort_order: 0 };
const EMPTY_COLOR = { name: '', image_url: '', sort_order: 0 };
const EMPTY_MATERIAL = { color_id: '', style_id: '', image_url: '' };

/**
 * 风格选材 — 门系列管理（系列 + 颜色 + 门材料组合）
 */
export default function StyleWizardDoors() {
  const toast = useToast();

  const [series, setSeries] = useState([]);
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 系列弹窗
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [seriesMode, setSeriesMode] = useState('add');
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [seriesForm, setSeriesForm] = useState(EMPTY_SERIES);
  const [seriesErrors, setSeriesErrors] = useState({});
  const [seriesSubmitting, setSeriesSubmitting] = useState(false);

  // 颜色弹窗
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [activeSeriesId, setActiveSeriesId] = useState(null);
  const [colorForm, setColorForm] = useState(EMPTY_COLOR);
  const [colorErrors, setColorErrors] = useState({});
  const [colorSubmitting, setColorSubmitting] = useState(false);

  // 门材料弹窗
  const [matModalOpen, setMatModalOpen] = useState(false);
  const [matSeriesId, setMatSeriesId] = useState(null);
  const [matForm, setMatForm] = useState(EMPTY_MATERIAL);
  const [matErrors, setMatErrors] = useState({});
  const [matSubmitting, setMatSubmitting] = useState(false);

  // 每个系列的风格筛选 → 门材料数据
  const [materialMap, setMaterialMap] = useState({});    // { [seriesId]: [] }
  const [styleFilterMap, setStyleFilterMap] = useState({}); // { [seriesId]: styleId }

  // 删除确认
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchSeries = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/door-series');
      setSeries(res.data || []);
      // 清空材料缓存（门材料列表依赖系列列表，需手动刷新）
      setMaterialMap({}); setStyleFilterMap({});
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchSeries();
    client.get('/admin/styles').then((res) => setStyles(res.data || [])).catch(() => {});
  }, [fetchSeries]);

  // ─── 系列 CRUD ───
  const openSeriesAdd = () => {
    setSeriesMode('add'); setEditingSeriesId(null);
    setSeriesForm(EMPTY_SERIES); setSeriesErrors({}); setSeriesModalOpen(true);
  };
  const openSeriesEdit = (s) => {
    setSeriesMode('edit'); setEditingSeriesId(s.id);
    setSeriesForm({ name: s.name || '', image_url: s.image_url || '', sort_order: s.sort_order ?? 0 });
    setSeriesErrors({}); setSeriesModalOpen(true);
  };
  const closeSeries = () => { setSeriesModalOpen(false); setSeriesSubmitting(false); };

  const validateSeries = () => {
    const e = {};
    if (!seriesForm.name.trim()) e.name = '请输入系列名称';
    if (!seriesForm.image_url.trim()) e.image_url = '请填写系列主图'; // 小程序系列卡以主图为主，无图即破卡
    setSeriesErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSeriesSubmit = async (ee) => {
    ee.preventDefault();
    if (!validateSeries()) return;
    setSeriesSubmitting(true);
    try {
      const payload = { name: seriesForm.name.trim(), image_url: seriesForm.image_url.trim() || null, sort_order: Number(seriesForm.sort_order) || 0 };
      if (seriesMode === 'add') {
        await client.post('/admin/door-series', payload);
        toast.success('门系列添加成功');
      } else {
        await client.put(`/admin/door-series/${editingSeriesId}`, payload);
        toast.success('门系列更新成功');
      }
      closeSeries(); fetchSeries();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSeriesSubmitting(false); }
  };

  const handleDeleteSeries = (s) => {
    setConfirmAction({
      title: '删除门系列',
      message: `确定要删除系列「${s.name}」吗？删除后该系列下所有颜色和门材料也将一并删除，不可恢复。`,
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        setConfirmLoading(true);
        try {
          await client.delete(`/admin/door-series/${s.id}`);
          toast.success('门系列已删除');
          setConfirmOpen(false); setConfirmAction(null); fetchSeries();
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
        finally { setConfirmLoading(false); }
      },
    });
    setConfirmOpen(true);
  };

  // ─── 颜色 CRUD ───
  const openColorAdd = (seriesId) => {
    setActiveSeriesId(seriesId);
    setColorForm(EMPTY_COLOR); setColorErrors({}); setColorModalOpen(true);
  };
  const closeColor = () => { setColorModalOpen(false); setColorSubmitting(false); };

  const validateColor = () => {
    const e = {};
    if (!colorForm.name.trim()) e.name = '请输入颜色名称';
    setColorErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleColorSubmit = async (ee) => {
    ee.preventDefault();
    if (!validateColor()) return;
    setColorSubmitting(true);
    try {
      await client.post(`/admin/door-series/${activeSeriesId}/colors`, {
        name: colorForm.name.trim(),
        image_url: colorForm.image_url.trim() || null,
        sort_order: Number(colorForm.sort_order) || 0,
      });
      toast.success('颜色添加成功');
      closeColor(); fetchSeries();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setColorSubmitting(false); }
  };

  const handleDeleteColor = (color) => {
    setConfirmAction({
      title: '删除颜色',
      message: `确定要删除颜色「${color.name}」吗？删除后该颜色下的所有门材料也将一并删除，不可恢复。`,
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        setConfirmLoading(true);
        try {
          await client.delete(`/admin/door-colors/${color.id}`);
          toast.success('颜色已删除');
          setConfirmOpen(false); setConfirmAction(null); fetchSeries();
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
        finally { setConfirmLoading(false); }
      },
    });
    setConfirmOpen(true);
  };

  // ─── 门材料 ───
  const fetchMaterials = async (seriesId, styleId) => {
    if (!styleId) { setMaterialMap((p) => ({ ...p, [seriesId]: [] })); return; }
    try {
      const res = await client.get('/admin/door-materials', { params: { series_id: seriesId, style_id: styleId } });
      setMaterialMap((p) => ({ ...p, [seriesId]: res.data || [] }));
    } catch { setMaterialMap((p) => ({ ...p, [seriesId]: [] })); }
  };

  const handleStyleFilter = (seriesId, styleId) => {
    setStyleFilterMap((p) => ({ ...p, [seriesId]: styleId }));
    fetchMaterials(seriesId, styleId);
  };

  const openMatAdd = (seriesId) => {
    setMatSeriesId(seriesId);
    setMatForm(EMPTY_MATERIAL); setMatErrors({}); setMatModalOpen(true);
  };
  const closeMat = () => { setMatModalOpen(false); setMatSubmitting(false); };

  const validateMat = () => {
    const e = {};
    if (!matForm.color_id) e.color_id = '请选择颜色';
    if (!matForm.style_id) e.style_id = '请选择风格';
    if (!matForm.image_url.trim()) e.image_url = '请填写图片';
    setMatErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleMatSubmit = async (ee) => {
    ee.preventDefault();
    if (!validateMat()) return;
    setMatSubmitting(true);
    try {
      await client.post('/admin/door-materials', {
        series_id: matSeriesId,
        color_id: Number(matForm.color_id),
        style_id: Number(matForm.style_id),
        image_url: matForm.image_url.trim(),
      });
      toast.success('门材料添加成功');
      closeMat();
      fetchMaterials(matSeriesId, styleFilterMap[matSeriesId] || '');
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setMatSubmitting(false); }
  };

  const handleDeleteMat = (mat) => {
    setConfirmAction({
      title: '删除门材料',
      message: '确定要删除该门材料吗？不可恢复。',
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        setConfirmLoading(true);
        try {
          await client.delete(`/admin/door-materials/${mat.id}`);
          toast.success('门材料已删除');
          setConfirmOpen(false); setConfirmAction(null);
          fetchMaterials(mat.series_id, styleFilterMap[mat.series_id] || '');
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
        finally { setConfirmLoading(false); }
      },
    });
    setConfirmOpen(true);
  };

  const seriesColors = (s) => s.colors || [];
  const seriesMatList = (s) => materialMap[s.id] || [];
  const seriesStyleFilter = (s) => styleFilterMap[s.id] || '';

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 顶部操作栏 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">门系列管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">管理门系列、颜色和风格维度下的门材料组合</p>
          </div>
          <button onClick={openSeriesAdd} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加门系列
          </button>
        </div>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={fetchSeries} />
        </div>
      )}

      {/* ─── 加载中 ─── */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
        </div>
      )}

      {/* ─── 系列卡片 ─── */}
      {!loading && !error && series.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <EmptyState icon="🚪" title="暂无门系列" description="点击右上角按钮添加门系列" />
        </div>
      )}

      {!loading && !error && series.map((s) => (
        <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 系列头部 */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
            <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
              {s.image_url
                ? <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🚪</div>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900">{s.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">排序：{s.sort_order} · 颜色：{seriesColors(s).length} 种</p>
            </div>
            <div className="flex items-center space-x-1">
              <button onClick={() => openSeriesEdit(s)} className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑系列</button>
              <button onClick={() => handleDeleteSeries(s)} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
            </div>
          </div>

          {/* 颜色区域 */}
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500">颜色</span>
              <button onClick={() => openColorAdd(s.id)} className="inline-flex items-center px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">
                <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                添加颜色
              </button>
            </div>
            {seriesColors(s).length === 0 ? (
              <p className="text-xs text-gray-400">暂无颜色</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {seriesColors(s).map((c) => (
                  <div key={c.id} className="inline-flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-6 h-6 rounded overflow-hidden bg-gray-200">
                      {c.image_url ? <img src={c.image_url} alt="" className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">—</div>
                      )}
                    </div>
                    <span className="text-xs text-gray-700">{c.name}</span>
                    <button onClick={() => handleDeleteColor(c)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors" title="删除颜色">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 门材料区域 */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">门材料</span>
              <div className="flex items-center gap-2">
                <select value={seriesStyleFilter(s)} onChange={(e) => handleStyleFilter(s.id, e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">选择风格...</option>
                  {styles.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
                <button onClick={() => openMatAdd(s.id)} disabled={!seriesStyleFilter(s)}
                  className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:text-gray-300 disabled:hover:bg-transparent">
                  + 添加门材料
                </button>
              </div>
            </div>
            {seriesMatList(s).length === 0 ? (
              <p className="text-xs text-gray-400">请选择一个风格查看或添加门材料</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['颜色', '图片', '操作'].map((h) => (
                        <th key={h} className="px-3 py-2 text-gray-500 font-medium text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seriesMatList(s).map((m) => (
                      <tr key={m.id} className="border-b border-gray-50">
                        <td className="px-3 py-2 text-gray-700">{m.color_name || '—'}</td>
                        <td className="px-3 py-2">
                          <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                            {m.image_url ? <img src={m.image_url} alt="" className="w-full h-full object-cover" /> : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">—</div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleDeleteMat(m)} className="text-red-500 hover:bg-red-50 px-1.5 py-0.5 rounded">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ═══ 弹窗 ═══ */}

      {/* 系列新增/编辑 */}
      {seriesModalOpen && (
        <Modal open={seriesModalOpen} size="md" title={seriesMode === 'add' ? '添加门系列' : '编辑门系列'} onClose={closeSeries}>
          <form onSubmit={handleSeriesSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">系列名称<span className="text-red-500"> *</span></label>
              <input value={seriesForm.name} onChange={(e) => setSeriesForm({ ...seriesForm, name: e.target.value })} className={INPUT_CLS} maxLength={64} placeholder="如：现代简约门系列" />
              {seriesErrors.name && <p className="text-red-500 text-xs mt-1">{seriesErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">系列主图 URL<span className="text-red-500"> *</span></label>
              <input value={seriesForm.image_url} onChange={(e) => setSeriesForm({ ...seriesForm, image_url: e.target.value })} className={INPUT_CLS} placeholder="https://... 或 /uploads/..." />
              {seriesErrors.image_url && <p className="text-red-500 text-xs mt-1">{seriesErrors.image_url}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
              <input type="number" value={seriesForm.sort_order} onChange={(e) => setSeriesForm({ ...seriesForm, sort_order: e.target.value })} className={INPUT_CLS} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeSeries} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={seriesSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{seriesSubmitting ? '保存中...' : '保存'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 颜色新增 */}
      {colorModalOpen && (
        <Modal open={colorModalOpen} size="sm" title="添加颜色" onClose={closeColor}>
          <form onSubmit={handleColorSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">颜色名称<span className="text-red-500"> *</span></label>
              <input value={colorForm.name} onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })} className={INPUT_CLS} maxLength={32} placeholder="如：胡桃木色" />
              {colorErrors.name && <p className="text-red-500 text-xs mt-1">{colorErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">色块图/纹理图 URL</label>
              <input value={colorForm.image_url} onChange={(e) => setColorForm({ ...colorForm, image_url: e.target.value })} className={INPUT_CLS} placeholder="https://... 或 /uploads/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
              <input type="number" value={colorForm.sort_order} onChange={(e) => setColorForm({ ...colorForm, sort_order: e.target.value })} className={INPUT_CLS} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeColor} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={colorSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{colorSubmitting ? '保存中...' : '添加'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 门材料新增 */}
      {matModalOpen && (
        <Modal open={matModalOpen} size="md" title="添加门材料" onClose={closeMat}>
          <form onSubmit={handleMatSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">颜色<span className="text-red-500"> *</span></label>
                <select value={matForm.color_id} onChange={(e) => setMatForm({ ...matForm, color_id: e.target.value })} className={SELECT_CLS}>
                  <option value="">请选择颜色</option>
                  {seriesColors(series.find((s) => s.id === matSeriesId) || {}).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {matErrors.color_id && <p className="text-red-500 text-xs mt-1">{matErrors.color_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">风格<span className="text-red-500"> *</span></label>
                <select value={matForm.style_id} onChange={(e) => setMatForm({ ...matForm, style_id: e.target.value })} className={SELECT_CLS}>
                  <option value="">请选择风格</option>
                  {styles.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
                {matErrors.style_id && <p className="text-red-500 text-xs mt-1">{matErrors.style_id}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">图片 URL<span className="text-red-500"> *</span></label>
              <input value={matForm.image_url} onChange={(e) => setMatForm({ ...matForm, image_url: e.target.value })} className={INPUT_CLS} placeholder="https://... 或 /uploads/..." />
              {matErrors.image_url && <p className="text-red-500 text-xs mt-1">{matErrors.image_url}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeMat} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={matSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{matSubmitting ? '保存中...' : '添加'}</button>
            </div>
          </form>
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
