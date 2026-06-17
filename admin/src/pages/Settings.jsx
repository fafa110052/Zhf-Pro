import { useState, useEffect, useRef, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

/**
 * 系统设置页 — 轮播图 + 热门推荐配置
 *
 * API:
 * - GET    /api/v1/admin/settings           配置列表（?type=banner|hot_works）
 * - POST   /api/v1/admin/settings           新增 { config_type, config_value, sort_order }
 * - PUT    /api/v1/admin/settings/:id       编辑 { config_value?, sort_order? }
 * - DELETE /api/v1/admin/settings/:id       删除
 *
 * config_value:
 *   banner → { image_url: string, title?: string, link?: string }
 *   hot_works → { work_ids: number[], title?: string }
 */

// ─── 工具函数 ───
const parseValue = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
};

export default function Settings() {
  const toast = useToast();

  // ─── 数据 ───
  const [banners, setBanners] = useState([]);
  const [hotWorks, setHotWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── 表单弹窗 ───
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState('banner');        // 'banner' | 'hot_works'
  const [formMode, setFormMode] = useState('add');           // 'add' | 'edit'
  const [formId, setFormId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formWorkIds, setFormWorkIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ─── 作品搜索（热门推荐选作品用） ───
  const [workSearch, setWorkSearch] = useState('');
  const [workResults, setWorkResults] = useState([]);
  const [workSearching, setWorkSearching] = useState(false);
  const [workDropdown, setWorkDropdown] = useState(false);
  const workSearchRef = useRef(null);
  const searchTimer = useRef(null);

  // ─── 删除确认 ───
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ─── 加载配置 ───
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/admin/settings');
      const data = res.data || {};
      setBanners((data.banner || []).map((item) => ({
        ...item,
        _parsed: parseValue(item.config_value),
      })));
      setHotWorks((data.hot_works || []).map((item) => ({
        ...item,
        _parsed: parseValue(item.config_value),
      })));
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ─── 作品搜索 ───
  const searchWorks = async (keyword) => {
    if (!keyword.trim()) { setWorkResults([]); return; }
    setWorkSearching(true);
    try {
      const res = await client.get('/admin/works', { params: { keyword, page_size: 10, status: 'approved' } });
      setWorkResults(res.data?.list || []);
    } catch {
      setWorkResults([]);
    } finally {
      setWorkSearching(false);
    }
  };

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (workSearch.trim()) {
      searchTimer.current = setTimeout(() => searchWorks(workSearch), 300);
    } else {
      setWorkResults([]);
    }
    return () => clearTimeout(searchTimer.current);
  }, [workSearch]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e) => {
      if (workSearchRef.current && !workSearchRef.current.contains(e.target)) {
        setWorkDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── 打开表单 ───
  const openAddForm = (type) => {
    setFormType(type);
    setFormMode('add');
    setFormId(null);
    setFormTitle('');
    setFormImageUrl('');
    setFormLink('');
    setFormSortOrder(0);
    setFormWorkIds([]);
    setFormError('');
    setWorkSearch('');
    setWorkResults([]);
    setFormOpen(true);
  };

  const openEditForm = (type, item) => {
    const v = item._parsed || {};
    setFormType(type);
    setFormMode('edit');
    setFormId(item.id);
    setFormTitle(v.title || '');
    setFormImageUrl(v.image_url || '');
    setFormLink(v.link || '');
    setFormSortOrder(item.sort_order || 0);
    setFormWorkIds(v.work_ids || []);
    setFormError('');
    setWorkSearch('');
    setWorkResults([]);
    setFormOpen(true);
  };

  // ─── 保存 ───
  const handleSave = async () => {
    setFormError('');
    setSaving(true);

    try {
      let configValue;
      if (formType === 'banner') {
        if (!formImageUrl.trim()) {
          setFormError('请填写图片链接');
          setSaving(false);
          return;
        }
        configValue = { image_url: formImageUrl.trim() };
        if (formTitle.trim()) configValue.title = formTitle.trim();
        if (formLink.trim()) configValue.link = formLink.trim();
      } else {
        if (formWorkIds.length === 0) {
          setFormError('请至少选择一个作品');
          setSaving(false);
          return;
        }
        configValue = { work_ids: formWorkIds };
        if (formTitle.trim()) configValue.title = formTitle.trim();
      }

      const body = {
        config_type: formType,
        config_value: configValue,
        sort_order: formSortOrder,
      };

      if (formMode === 'add') {
        await client.post('/admin/settings', body);
        toast.success(formType === 'banner' ? '轮播图已添加' : '热门推荐已添加');
      } else {
        await client.put(`/admin/settings/${formId}`, {
          config_value: configValue,
          sort_order: formSortOrder,
        });
        toast.success('配置已更新');
      }

      setFormOpen(false);
      fetchSettings();
    } catch (err) {
      toast.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ─── 删除 ───
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/settings/${deleteTarget.id}`);
      toast.success('配置已删除');
      setDeleteTarget(null);
      fetchSettings();
    } catch (err) {
      // keep dialog open and show error
    } finally {
      setDeleting(false);
    }
  };

  // ─── 热门作品：添加/移除作品ID ───
  const addWorkId = (work) => {
    if (!formWorkIds.includes(work.id)) {
      setFormWorkIds([...formWorkIds, work.id]);
    }
    setWorkSearch('');
    setWorkDropdown(false);
  };

  const removeWorkId = (id) => {
    setFormWorkIds(formWorkIds.filter((wid) => wid !== id));
  };

  // ─── 加载态 ───
  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={fetchSettings} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">系统设置</h2>

      {/* ════════════════════════════════════ */}
      {/* 轮播图配置 */}
      {/* ════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">首页轮播图</h3>
            <p className="text-sm text-gray-500 mt-0.5">配置小程序首页顶部轮播图片及跳转链接</p>
          </div>
          <button onClick={() => openAddForm('banner')}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增
          </button>
        </div>

        {banners.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg">
            <EmptyState icon="🖼️" title="暂无轮播图配置" size="sm"
              action={<button onClick={() => openAddForm('banner')} className="text-sm text-blue-600 hover:underline">添加第一张轮播图</button>} />
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((item, idx) => {
              const v = item._parsed || {};
              return (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  {/* 排序序号 */}
                  <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  {/* 图片预览 */}
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-200 shrink-0 border border-gray-100">
                    {v.image_url ? (
                      <img src={v.image_url} alt="" className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">无图</div>
                    )}
                  </div>
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{v.title || '未命名轮播图'}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{v.image_url || '无图片链接'}</p>
                    {v.link && <p className="text-xs text-blue-500 truncate">🔗 {v.link}</p>}
                  </div>
                  {/* 排序 */}
                  <div className="text-xs text-gray-400 shrink-0">排序: {item.sort_order}</div>
                  {/* 操作 */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditForm('banner', item)}
                      className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                    <button onClick={() => setDeleteTarget(item)}
                      className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════ */}
      {/* 热门推荐配置 */}
      {/* ════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">热门推荐</h3>
            <p className="text-sm text-gray-500 mt-0.5">手动精选作品展示在小程序首页热门区域</p>
          </div>
          <button onClick={() => openAddForm('hot_works')}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增
          </button>
        </div>

        {hotWorks.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg">
            <EmptyState icon="🔥" title="暂无热门推荐配置" size="sm"
              action={<button onClick={() => openAddForm('hot_works')} className="text-sm text-blue-600 hover:underline">添加推荐分组</button>} />
          </div>
        ) : (
          <div className="space-y-3">
            {hotWorks.map((item, idx) => {
              const v = item._parsed || {};
              const count = (v.work_ids || []).length;
              return (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <span className="w-7 h-7 rounded-full bg-orange-200 text-orange-700 text-xs font-medium flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{v.title || '未命名推荐分组'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">包含 {count} 个作品 · 排序: {item.sort_order}</p>
                    {/* 作品ID标签 */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(v.work_ids || []).slice(0, 8).map((wid) => (
                        <span key={wid} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-500">
                          #{wid}
                        </span>
                      ))}
                      {count > 8 && <span className="text-[10px] text-gray-400">等 {count} 个</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditForm('hot_works', item)}
                      className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                    <button onClick={() => setDeleteTarget(item)}
                      className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════ */}
      {/* 表单弹窗 — Banner / Hot Works 共用 */}
      {/* ════════════════════════════════════ */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={formType === 'banner' ? (formMode === 'add' ? '新增轮播图' : '编辑轮播图') : (formMode === 'add' ? '新增热门推荐' : '编辑热门推荐')}
        footer={
          <>
            <button onClick={() => setFormOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }>
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{formError}</div>
          )}

          {/* 排序序号 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">排序序号</label>
            <input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <p className="text-xs text-gray-400 mt-0.5">数字越小越靠前</p>
          </div>

          {formType === 'banner' ? (
            <>
              {/* Banner 表单 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">图片链接 <span className="text-red-400">*</span></label>
                <input type="text" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg" autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                {formImageUrl && (
                  <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <img src={formImageUrl} alt="预览" className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">标题</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="轮播图标题（选填）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">跳转链接</label>
                <input type="text" value={formLink} onChange={(e) => setFormLink(e.target.value)}
                  placeholder="/pages/detail/detail?id=1（选填）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </>
          ) : (
            <>
              {/* Hot Works 表单 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">分组标题</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="如：精品案例推荐（选填）" autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">选择作品 <span className="text-red-400">*</span></label>
                {/* 搜索框 */}
                <div className="relative" ref={workSearchRef}>
                  <input type="text" value={workSearch}
                    onChange={(e) => { setWorkSearch(e.target.value); setWorkDropdown(true); }}
                    onFocus={() => setWorkDropdown(true)}
                    placeholder="搜索已通过的作品..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  {workDropdown && workSearch.trim() && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {workSearching ? (
                        <div className="p-3 text-center text-sm text-gray-400">搜索中...</div>
                      ) : workResults.length === 0 ? (
                        <div className="p-3 text-center text-sm text-gray-400">无匹配作品</div>
                      ) : (
                        workResults.map((w) => (
                          <button key={w.id} onClick={() => addWorkId(w)}
                            disabled={formWorkIds.includes(w.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${formWorkIds.includes(w.id) ? 'opacity-40 bg-gray-50' : ''}`}>
                            <span className="truncate">{w.title}</span>
                            {formWorkIds.includes(w.id) && <span className="text-green-500 text-xs shrink-0 ml-2">已选</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* 已选作品列表 */}
                {formWorkIds.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs text-gray-400">已选 {formWorkIds.length} 个作品：</p>
                    {formWorkIds.map((wid, idx) => (
                      <div key={wid} className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                        <span className="text-gray-700">作品 #{wid}</span>
                        <button onClick={() => removeWorkId(wid)}
                          className="text-red-400 hover:text-red-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">在上方搜索并选择作品</p>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ════════════════════════════════════ */}
      {/* 删除确认 */}
      {/* ════════════════════════════════════ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除配置"
        message={`确定要删除此${deleteTarget?.config_type === 'banner' ? '轮播图' : '热门推荐'}配置吗？此操作不可撤销。`}
        confirmText="确认删除"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
