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
  const [hotWorks, setHotWorks] = useState([]);           // 旧：homepage_config hot_works（保留兼容）
  const [hotWorksList, setHotWorksList] = useState([]);   // 新：is_hot 标记的作品
  const [hotWorksLoading, setHotWorksLoading] = useState(true);
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
  const [uploading, setUploading] = useState(false);

  // ─── 作品搜索（热门推荐选作品用） ───
  const [workSearch, setWorkSearch] = useState('');
  const [workResults, setWorkResults] = useState([]);
  const [workSearching, setWorkSearching] = useState(false);
  const [workDropdown, setWorkDropdown] = useState(false);
  const workSearchRef = useRef(null);
  const searchTimer = useRef(null);

  // ─── 拖拽排序 ───
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [reordering, setReordering] = useState(false);

  // ─── 设计团队 ───
  const [designTeam, setDesignTeam] = useState([]);
  const [dtLoading, setDtLoading] = useState(true);

  // ─── 设计团队表单 ───
  const [dtFormOpen, setDtFormOpen] = useState(false);
  const [dtFormMode, setDtFormMode] = useState('add');
  const [dtFormId, setDtFormId] = useState(null);
  const [dtName, setDtName] = useState('');
  const [dtAvatar, setDtAvatar] = useState('');
  const [dtStyles, setDtStyles] = useState('');
  const [dtSortOrder, setDtSortOrder] = useState(0);
  const [dtSaving, setDtSaving] = useState(false);
  const [dtUploading, setDtUploading] = useState(false);
  const [dtFormError, setDtFormError] = useState('');

  // ─── 设计团队删除 ───
  const [dtDeleteTarget, setDtDeleteTarget] = useState(null);
  const [dtDeleting, setDtDeleting] = useState(false);

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
  useEffect(() => { fetchHotWorks(); }, []);

  // ─── 加载热门作品（is_hot 标记，与作品管理同步）───
  const fetchHotWorks = useCallback(async () => {
    setHotWorksLoading(true);
    try {
      const res = await client.get('/admin/hot-works');
      setHotWorksList(res.data || []);
    } catch {
      // silent
    } finally {
      setHotWorksLoading(false);
    }
  }, []);

  // ─── 取消热门 ───
  const handleToggleHot = async (workId) => {
    try {
      await client.patch(`/admin/works/${workId}/hot`);
      toast.success('已取消热门');
      fetchHotWorks();
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  // ─── 加载设计团队 ───
  const fetchDesignTeam = useCallback(async () => {
    setDtLoading(true);
    try {
      const res = await client.get('/admin/design-team');
      setDesignTeam(res.data || []);
    } catch {
      // silent
    } finally {
      setDtLoading(false);
    }
  }, []);

  useEffect(() => { fetchDesignTeam(); }, [fetchDesignTeam]);

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

  // ─── 本地上传轮播图 ───
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.data?.image_url) {
        setFormImageUrl(result.data.image_url);
        toast.success('图片上传成功');
      } else {
        toast.error(result.error?.message || '上传失败');
      }
    } catch (err) {
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ─── 设计团队：打开表单 ───
  const openDtAddForm = () => {
    setDtFormMode('add');
    setDtFormId(null);
    setDtName('');
    setDtAvatar('');
    setDtStyles('');
    setDtSortOrder(designTeam.length);
    setDtFormError('');
    setDtFormOpen(true);
  };

  const openDtEditForm = (item) => {
    setDtFormMode('edit');
    setDtFormId(item.id);
    setDtName(item.name || '');
    setDtAvatar(item.avatar_url || '');
    setDtStyles(item.styles || '');
    setDtSortOrder(item.sort_order || 0);
    setDtFormError('');
    setDtFormOpen(true);
  };

  // ─── 设计团队：保存 ───
  const handleDtSave = async () => {
    setDtFormError('');
    if (!dtName.trim()) {
      setDtFormError('请输入设计师姓名');
      return;
    }
    setDtSaving(true);
    try {
      const body = {
        name: dtName.trim(),
        avatar_url: dtAvatar.trim(),
        styles: dtStyles.trim(),
        sort_order: dtSortOrder,
      };
      if (dtFormMode === 'add') {
        await client.post('/admin/design-team', body);
        toast.success('设计师已添加');
      } else {
        await client.put(`/admin/design-team/${dtFormId}`, body);
        toast.success('设计师信息已更新');
      }
      setDtFormOpen(false);
      fetchDesignTeam();
    } catch (err) {
      toast.error(err.message || '保存失败');
    } finally {
      setDtSaving(false);
    }
  };

  // ─── 设计团队：删除 ───
  const handleDtDelete = async () => {
    if (!dtDeleteTarget) return;
    setDtDeleting(true);
    try {
      await client.delete(`/admin/design-team/${dtDeleteTarget.id}`);
      toast.success('设计师已删除');
      setDtDeleteTarget(null);
      fetchDesignTeam();
    } catch (err) {
      toast.error(err.message || '删除失败');
    } finally {
      setDtDeleting(false);
    }
  };

  // ─── 设计团队：头像上传 ───
  const handleDtAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      e.target.value = '';
      return;
    }
    setDtUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.data?.image_url) {
        setDtAvatar(result.data.image_url);
        toast.success('头像上传成功');
      } else {
        toast.error(result.error?.message || '上传失败');
      }
    } catch {
      toast.error('上传失败，请重试');
    } finally {
      setDtUploading(false);
      e.target.value = '';
    }
  };

  // ─── 拖拽排序：轮播图 ───
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // 设置拖拽时的半透明预览
    if (e.target.closest('.banner-row')) {
      e.dataTransfer.setDragImage(e.target.closest('.banner-row'), 0, 0);
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    const fromIndex = dragIndex;
    setDragIndex(null);
    setDragOverIndex(null);

    if (fromIndex === null || fromIndex === dropIndex) return;

    // 重排数组
    const reordered = [...banners];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // 立即更新 UI
    setBanners(reordered);
    setReordering(true);

    // 保存新排序
    try {
      await Promise.all(
        reordered.map((item, i) =>
          client.put(`/admin/settings/${item.id}`, { sort_order: i })
        )
      );
    } catch (err) {
      toast.error('排序保存失败，请刷新页面');
      fetchSettings();
    } finally {
      setReordering(false);
    }
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
          <div className="space-y-2">
            {banners.map((item, idx) => {
              const v = item._parsed || {};
              const isDragging = dragIndex === idx;
              const isDragOver = dragOverIndex === idx && dragIndex !== idx;
              return (
                <div key={item.id}
                  className={`banner-row flex items-center gap-3 p-3 rounded-xl border transition-all select-none ${isDragging ? 'opacity-40 bg-gray-100 border-dashed border-gray-300' : isDragOver ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                  draggable={!reordering}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, idx)}>
                  {/* 拖拽手柄 */}
                  <div className={`shrink-0 cursor-grab active:cursor-grabbing ${reordering ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="拖动排序">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                    </svg>
                  </div>
                  {/* 排序序号 */}
                  <span className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center shrink-0 ${isDragOver ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
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
            {reordering && (
              <div className="text-center text-xs text-gray-400 py-1">保存排序中...</div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════ */}
      {/* 正在上热门 — 与作品管理同步（is_hot 标记）*/}
      {/* ════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">热门推荐</h3>
            <p className="text-sm text-gray-500 mt-0.5">在「作品管理」中设置热门，此处同步展示</p>
          </div>
        </div>

        {hotWorksLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : hotWorksList.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg">
            <EmptyState icon="🔥" title="暂无热门作品" size="sm"
              description="前往作品管理，将优质作品设为热门" />
          </div>
        ) : (
          <div className="space-y-2">
            {hotWorksList.map((work, idx) => (
              <div key={work.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 text-xs font-medium flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                {/* 封面缩略图 */}
                <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0 border border-gray-100">
                  {(work.cover_image) ? (
                    <img
                      src={work.cover_image}
                      alt={work.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* 作品信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{work.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{work.designer_name || '未知设计师'} · {work.view_count || 0} 次浏览</p>
                </div>
                {/* 取消热门 */}
                <button
                  onClick={() => handleToggleHot(work.id)}
                  className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                >
                  取消热门
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════ */}
      {/* 设计团队 */}
      {/* ════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">设计团队</h3>
            <p className="text-sm text-gray-500 mt-0.5">管理小程序首页展示的设计师名片</p>
          </div>
          <button onClick={openDtAddForm}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增
          </button>
        </div>

        {dtLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : designTeam.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg">
            <EmptyState icon="👤" title="暂无设计团队成员" size="sm"
              action={<button onClick={openDtAddForm} className="text-sm text-blue-600 hover:underline">添加第一位设计师</button>} />
          </div>
        ) : (
          <div className="space-y-2">
            {designTeam.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                {/* 头像 */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0 border border-gray-100">
                  {item.avatar_url ? (
                    <img src={item.avatar_url} alt="" className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">👤</div>
                  )}
                </div>
                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.styles || '未设置擅长风格'}</p>
                </div>
                {/* 操作 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openDtEditForm(item)}
                    className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                  <button onClick={() => setDtDeleteTarget(item)}
                    className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                </div>
              </div>
            ))}
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
                <label className="block text-sm text-gray-600 mb-1">图片 <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  <input type="text" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="粘贴图片链接或点击右侧上传" autoFocus
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <label className={`inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-lg cursor-pointer transition-colors shrink-0 ${uploading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}>
                    {uploading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        上传中
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        本地上传
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={handleBannerUpload} />
                  </label>
                </div>
                {formImageUrl && (
                  <div className="mt-2 w-full h-36 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
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
      {/* 设计团队表单弹窗 */}
      {/* ════════════════════════════════════ */}
      <Modal open={dtFormOpen} onClose={() => setDtFormOpen(false)}
        title={dtFormMode === 'add' ? '新增设计师' : '编辑设计师'}
        footer={
          <>
            <button onClick={() => setDtFormOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button onClick={handleDtSave} disabled={dtSaving}
              className="px-4 py-2 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
              {dtSaving ? '保存中...' : '保存'}
            </button>
          </>
        }>
        <div className="space-y-4">
          {dtFormError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{dtFormError}</div>
          )}

          {/* 姓名 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">姓名 <span className="text-red-400">*</span></label>
            <input type="text" value={dtName} onChange={(e) => setDtName(e.target.value)}
              placeholder="如：张工" autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          {/* 头像 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">头像</label>
            <div className="flex gap-2">
              <input type="text" value={dtAvatar} onChange={(e) => setDtAvatar(e.target.value)}
                placeholder="粘贴图片链接或点击右侧上传"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <label className={`inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-lg cursor-pointer transition-colors shrink-0 ${dtUploading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}>
                {dtUploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    上传中
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    本地上传
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" disabled={dtUploading}
                  onChange={handleDtAvatarUpload} />
              </label>
            </div>
            {dtAvatar && (
              <div className="mt-2 w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                <img src={dtAvatar} alt="预览" className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
          </div>

          {/* 擅长风格 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">擅长风格</label>
            <input type="text" value={dtStyles} onChange={(e) => setDtStyles(e.target.value)}
              placeholder="如：现代·轻奢（选填）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          {/* 排序 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">排序序号</label>
            <input type="number" value={dtSortOrder} onChange={(e) => setDtSortOrder(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <p className="text-xs text-gray-400 mt-0.5">数字越小越靠前</p>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════ */}
      {/* 设计团队删除确认 */}
      {/* ════════════════════════════════════ */}
      <ConfirmDialog
        open={!!dtDeleteTarget}
        onClose={() => setDtDeleteTarget(null)}
        onConfirm={handleDtDelete}
        title="删除设计师"
        message={`确定要删除「${dtDeleteTarget?.name}」吗？此操作不可撤销。`}
        confirmText="确认删除"
        variant="danger"
        loading={dtDeleting}
      />

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
