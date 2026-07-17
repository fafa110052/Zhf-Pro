import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const EMPTY_SERIES = { name: '', image_url: '', sort_order: 0 };
const EMPTY_LIB_COLOR = { name: '', image_url: '', sort_order: 0 };

/**
 * 风格选材 — 门系列管理
 * 通用颜色库（独立维护）→ 系列从库中挑颜色 → 颜色按风格勾选上架
 */
export default function StyleWizardDoors() {
  const toast = useToast();

  const [series, setSeries] = useState([]);
  const [styles, setStyles] = useState([]);
  const [libColors, setLibColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 系列弹窗
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [seriesMode, setSeriesMode] = useState('add');
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [seriesForm, setSeriesForm] = useState(EMPTY_SERIES);
  const [seriesErrors, setSeriesErrors] = useState({});
  const [seriesSubmitting, setSeriesSubmitting] = useState(false);

  // 颜色库弹窗（新增库颜色）
  const [libModalOpen, setLibModalOpen] = useState(false);
  const [libForm, setLibForm] = useState(EMPTY_LIB_COLOR);
  const [libErrors, setLibErrors] = useState({});
  const [libSubmitting, setLibSubmitting] = useState(false);

  // 系列选色弹窗（从颜色库多选）
  const [pickModalOpen, setPickModalOpen] = useState(false);
  const [pickSeriesId, setPickSeriesId] = useState(null);
  const [pickedIds, setPickedIds] = useState([]);
  const [pickSubmitting, setPickSubmitting] = useState(false);

  // 每个系列的门材料（颜色×风格开关矩阵数据）
  const [materialMap, setMaterialMap] = useState({}); // { [seriesId]: [doorMaterial] }
  const [togglingKey, setTogglingKey] = useState(''); // `${seriesId}-${colorId}-${styleId}` 防连点

  // 删除确认
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchLibColors = useCallback(async () => {
    try {
      const res = await client.get('/admin/door-color-library');
      setLibColors(res.data || []);
    } catch { /* 列表失败不阻塞页面，操作时会再报错 */ }
  }, []);

  // 拉取某系列全部风格下的门材料，得到 颜色×风格 勾选矩阵
  const fetchSeriesMaterials = useCallback(async (seriesList, styleList) => {
    const map = {};
    await Promise.all(seriesList.map(async (s) => {
      const results = await Promise.all(styleList.map((st) =>
        client.get('/admin/door-materials', { params: { series_id: s.id, style_id: st.id } })
          .then((res) => res.data || []).catch(() => [])
      ));
      map[s.id] = results.flat();
    }));
    setMaterialMap(map);
  }, []);

  const fetchSeries = useCallback(async (styleList) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/door-series');
      const list = res.data || [];
      setSeries(list);
      if ((styleList || []).length) await fetchSeriesMaterials(list, styleList);
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, [fetchSeriesMaterials]);

  useEffect(() => {
    (async () => {
      let styleList = [];
      try {
        const res = await client.get('/admin/styles');
        styleList = res.data || [];
        setStyles(styleList);
      } catch { /* 风格加载失败时矩阵为空 */ }
      fetchLibColors();
      fetchSeries(styleList);
    })();
  }, [fetchLibColors, fetchSeries]);

  const refreshAll = () => fetchSeries(styles);

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
      closeSeries(); refreshAll();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSeriesSubmitting(false); }
  };

  const handleDeleteSeries = (s) => {
    setConfirmAction({
      title: '删除门系列',
      message: `确定要删除系列「${s.name}」吗？删除后该系列下所有颜色及风格配置也将一并删除，不可恢复。`,
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        setConfirmLoading(true);
        try {
          await client.delete(`/admin/door-series/${s.id}`);
          toast.success('门系列已删除');
          setConfirmOpen(false); setConfirmAction(null); refreshAll();
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
        finally { setConfirmLoading(false); }
      },
    });
    setConfirmOpen(true);
  };

  // ─── 通用颜色库 ───
  const openLibAdd = () => { setLibForm(EMPTY_LIB_COLOR); setLibErrors({}); setLibModalOpen(true); };
  const closeLib = () => { setLibModalOpen(false); setLibSubmitting(false); };

  const validateLib = () => {
    const e = {};
    if (!libForm.name.trim()) e.name = '请输入颜色名称';
    if (!libForm.image_url.trim()) e.image_url = '请填写色块图'; // 选色与小程序色卡均以图为主
    setLibErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLibSubmit = async (ee) => {
    ee.preventDefault();
    if (!validateLib()) return;
    setLibSubmitting(true);
    try {
      await client.post('/admin/door-color-library', {
        name: libForm.name.trim(),
        image_url: libForm.image_url.trim(),
        sort_order: Number(libForm.sort_order) || 0,
      });
      toast.success('颜色已加入颜色库');
      closeLib(); fetchLibColors();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setLibSubmitting(false); }
  };

  const handleDeleteLibColor = (c) => {
    setConfirmAction({
      title: '删除库颜色',
      message: `确定要从颜色库删除「${c.name}」吗？已加入各系列的该颜色不受影响。`,
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        setConfirmLoading(true);
        try {
          await client.delete(`/admin/door-color-library/${c.id}`);
          toast.success('已从颜色库删除');
          setConfirmOpen(false); setConfirmAction(null); fetchLibColors();
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
        finally { setConfirmLoading(false); }
      },
    });
    setConfirmOpen(true);
  };

  // ─── 系列从颜色库选色 ───
  const openPick = (seriesId) => {
    setPickSeriesId(seriesId); setPickedIds([]); setPickModalOpen(true);
  };
  const closePick = () => { setPickModalOpen(false); setPickSubmitting(false); };

  const togglePick = (id) => {
    setPickedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const handlePickSubmit = async () => {
    if (!pickedIds.length) { toast.warning('请先勾选颜色'); return; }
    setPickSubmitting(true);
    try {
      const picked = libColors.filter((c) => pickedIds.includes(c.id));
      for (const c of picked) {
        await client.post(`/admin/door-series/${pickSeriesId}/colors`, {
          name: c.name, image_url: c.image_url, sort_order: c.sort_order || 0,
        });
      }
      toast.success(`已添加 ${picked.length} 个颜色`);
      closePick(); refreshAll();
    } catch (err) { toast.error(err?.message || '保存失败'); refreshAll(); }
    finally { setPickSubmitting(false); }
  };

  const handleDeleteColor = (color) => {
    setConfirmAction({
      title: '移除颜色',
      message: `确定要将颜色「${color.name}」移出该系列吗？其在各风格中的配置也将一并移除。`,
      variant: 'danger', confirmText: '确认移除',
      action: async () => {
        setConfirmLoading(true);
        try {
          await client.delete(`/admin/door-colors/${color.id}`);
          toast.success('颜色已移除');
          setConfirmOpen(false); setConfirmAction(null); refreshAll();
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
        finally { setConfirmLoading(false); }
      },
    });
    setConfirmOpen(true);
  };

  // ─── 颜色×风格 开关 ───
  const findMaterial = (seriesId, colorId, styleId) =>
    (materialMap[seriesId] || []).find((m) => m.color_id === colorId && m.style_id === styleId);

  const handleToggleStyle = async (s, color, style) => {
    const key = `${s.id}-${color.id}-${style.id}`;
    if (togglingKey) return;
    const existing = findMaterial(s.id, color.id, style.id);
    setTogglingKey(key);
    try {
      if (existing) {
        await client.delete(`/admin/door-materials/${existing.id}`);
        setMaterialMap((p) => ({ ...p, [s.id]: (p[s.id] || []).filter((m) => m.id !== existing.id) }));
      } else {
        if (!color.image_url) { toast.warning('该颜色缺少色块图，请先补图'); return; }
        await client.post('/admin/door-materials', {
          series_id: s.id, color_id: color.id, style_id: style.id, image_url: color.image_url,
        });
        // 后端只回 id，本地补一条记录避免整页刷新
        const res = await client.get('/admin/door-materials', { params: { series_id: s.id, style_id: style.id } });
        setMaterialMap((p) => ({
          ...p,
          [s.id]: [...(p[s.id] || []).filter((m) => m.style_id !== style.id), ...(res.data || [])],
        }));
      }
    } catch (err) { toast.error(err?.message || '操作失败'); }
    finally { setTogglingKey(''); }
  };

  const seriesColors = (s) => s.colors || [];
  const seriesColorNames = (s) => new Set(seriesColors(s).map((c) => c.name));

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 顶部操作栏 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">门系列管理</h2>
            <p className="text-sm text-gray-500 mt-0.5">先维护通用颜色库，再到系列中挑选颜色并勾选所属风格</p>
          </div>
          <button onClick={openSeriesAdd} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加门系列
          </button>
        </div>
      </div>

      {/* ─── 通用颜色库 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">通用颜色库</h3>
            <p className="text-xs text-gray-400 mt-0.5">各系列共用的颜色，系列内「添加颜色」从这里挑选</p>
          </div>
          <button onClick={openLibAdd} className="inline-flex items-center px-3 py-1.5 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增颜色
          </button>
        </div>
        {libColors.length === 0 ? (
          <p className="text-xs text-gray-400">颜色库为空，点击右上角「新增颜色」录入</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {libColors.map((c) => (
              <div key={c.id} className="inline-flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                <div className="w-8 h-8 rounded overflow-hidden bg-gray-200">
                  <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-gray-700">{c.name}</span>
                <button onClick={() => handleDeleteLibColor(c)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors" title="从颜色库删除">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={refreshAll} />
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
              <button onClick={() => openPick(s.id)} className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">添加颜色</button>
              <button onClick={() => openSeriesEdit(s)} className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑系列</button>
              <button onClick={() => handleDeleteSeries(s)} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
            </div>
          </div>

          {/* 颜色×风格矩阵：勾选=该颜色在该风格下可选 */}
          <div className="px-4 py-3">
            {seriesColors(s).length === 0 ? (
              <p className="text-xs text-gray-400">暂无颜色，点击「添加颜色」从通用颜色库挑选</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-3 py-2 text-gray-500 font-medium text-left">颜色</th>
                      {styles.map((st) => (
                        <th key={st.id} className="px-3 py-2 text-gray-500 font-medium text-center">{st.name}</th>
                      ))}
                      <th className="px-3 py-2 text-gray-500 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seriesColors(s).map((c) => (
                      <tr key={c.id} className="border-b border-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded overflow-hidden bg-gray-200 shrink-0">
                              {c.image_url ? <img src={c.image_url} alt="" className="w-full h-full object-cover" /> : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">—</div>
                              )}
                            </div>
                            <span className="text-gray-700">{c.name}</span>
                          </div>
                        </td>
                        {styles.map((st) => {
                          const on = !!findMaterial(s.id, c.id, st.id);
                          const busy = togglingKey === `${s.id}-${c.id}-${st.id}`;
                          return (
                            <td key={st.id} className="px-3 py-2 text-center">
                              <button onClick={() => handleToggleStyle(s, c, st)} disabled={busy}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded border transition-colors ${
                                  on ? 'bg-green-500 border-green-500 text-white hover:bg-green-600' : 'bg-white border-gray-300 text-transparent hover:border-green-400'
                                } ${busy ? 'opacity-50' : ''}`}
                                title={on ? '点击取消该风格' : '点击加入该风格'}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleDeleteColor(c)} className="text-red-500 hover:bg-red-50 px-1.5 py-0.5 rounded">移除</button>
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

      {/* 颜色库新增 */}
      {libModalOpen && (
        <Modal open={libModalOpen} size="sm" title="新增库颜色" onClose={closeLib}>
          <form onSubmit={handleLibSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">颜色名称<span className="text-red-500"> *</span></label>
              <input value={libForm.name} onChange={(e) => setLibForm({ ...libForm, name: e.target.value })} className={INPUT_CLS} maxLength={32} placeholder="如：胡桃木色" />
              {libErrors.name && <p className="text-red-500 text-xs mt-1">{libErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">色块图/纹理图 URL<span className="text-red-500"> *</span></label>
              <input value={libForm.image_url} onChange={(e) => setLibForm({ ...libForm, image_url: e.target.value })} className={INPUT_CLS} placeholder="https://... 或 /uploads/..." />
              {libErrors.image_url && <p className="text-red-500 text-xs mt-1">{libErrors.image_url}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
              <input type="number" value={libForm.sort_order} onChange={(e) => setLibForm({ ...libForm, sort_order: e.target.value })} className={INPUT_CLS} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeLib} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button type="submit" disabled={libSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{libSubmitting ? '保存中...' : '添加'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 系列从颜色库选色 */}
      {pickModalOpen && (
        <Modal open={pickModalOpen} size="md" title="从颜色库添加颜色" onClose={closePick}>
          {(() => {
            const target = series.find((x) => x.id === pickSeriesId);
            const existNames = target ? seriesColorNames(target) : new Set();
            const available = libColors.filter((c) => !existNames.has(c.name));
            return (
              <div className="space-y-4">
                {available.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">颜色库中的颜色都已加入该系列，可先到「通用颜色库」新增颜色</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                    {available.map((c) => {
                      const picked = pickedIds.includes(c.id);
                      return (
                        <button key={c.id} type="button" onClick={() => togglePick(c.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                            picked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                          }`}>
                          <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 shrink-0">
                            <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs text-gray-700 flex-1">{c.name}</span>
                          {picked && (
                            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closePick} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
                  <button type="button" onClick={handlePickSubmit} disabled={pickSubmitting || !available.length}
                    className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">
                    {pickSubmitting ? '添加中...' : `添加所选（${pickedIds.length}）`}
                  </button>
                </div>
              </div>
            );
          })()}
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
