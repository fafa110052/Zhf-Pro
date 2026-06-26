import { useState, useEffect } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

/**
 * 分类管理页 — 户型/空间/风格的增删改查
 *
 * API:
 * - GET    /api/v1/admin/categories      列表
 * - POST   /api/v1/admin/categories      新增
 * - PUT    /api/v1/admin/categories/:id  编辑
 * - DELETE /api/v1/admin/categories/:id  删除
 */

const TYPE_LABELS = { house_type: '户型', area: '空间', style: '风格' };
const TYPE_OPTIONS = [
  { value: 'house_type', label: '户型' },
  { value: 'area', label: '空间' },
  { value: 'style', label: '风格' },
];

export default function Categories() {
  const toast = useToast();

  // ─── 列表状态 ───
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('house_type');

  // ─── 弹窗 ───
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);   // null = 新增
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 表单
  const [form, setForm] = useState({ type: 'house_type', name: '', sort_order: 0 });

  // ─── 加载列表 ───
  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/admin/categories');
      setCategories(res.data || []);
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // ─── 按 type 分组 ───
  const grouped = {};
  for (const cat of categories) {
    if (!grouped[cat.type]) grouped[cat.type] = [];
    grouped[cat.type].push(cat);
  }
  // 按 sort_order 排序
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  const currentList = grouped[activeTab] || [];

  // ─── 打开新增弹窗 ───
  const openCreate = () => {
    setEditTarget(null);
    setForm({ type: activeTab, name: '', sort_order: 0 });
    setModalOpen(true);
  };

  // ─── 打开编辑弹窗 ───
  const openEdit = (cat) => {
    setEditTarget(cat);
    setForm({ type: cat.type, name: cat.name, sort_order: cat.sort_order || 0, is_active: cat.is_active });
    setModalOpen(true);
  };

  // ─── 保存 ───
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('分类名称不能为空');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await client.put(`/admin/categories/${editTarget.id}`, {
          name: form.name.trim(),
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        });
        toast.success('分类已更新');
      } else {
        await client.post('/admin/categories', {
          type: form.type,
          name: form.name.trim(),
          sort_order: Number(form.sort_order) || 0,
        });
        toast.success('分类已创建');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ─── 切换启用/禁用 ───
  const toggleActive = async (cat) => {
    try {
      await client.put(`/admin/categories/${cat.id}`, {
        is_active: cat.is_active ? 0 : 1,
      });
      toast.success(cat.is_active ? '已禁用' : '已启用');
      fetchCategories();
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  // ─── 删除 ───
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await client.delete(`/admin/categories/${deleteTarget.id}`);
      toast.success('分类已删除');
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      setDeleteError(err.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // ─── 统计 ───
  const stats = Object.keys(grouped).map((type) => ({
    type,
    label: TYPE_LABELS[type] || type,
    total: grouped[type].length,
    active: grouped[type].filter((c) => c.is_active).length,
  }));

  // ─── 渲染 ───
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 标题 + 统计 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">分类字典管理</h2>
          <button onClick={openCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增分类
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.type}
              onClick={() => setActiveTab(s.type)}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${activeTab === s.type ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-2xl font-bold text-gray-900">{s.active}<span className="text-sm font-normal text-gray-400">/{s.total}</span></div>
              <div className="text-xs text-gray-400">启用/总计</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Tab + 列表 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[300px]">
        {/* Tab 栏 */}
        <div className="flex border-b border-gray-100">
          {TYPE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setActiveTab(opt.value)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === opt.value ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {opt.label}
              <span className="ml-1 text-xs text-gray-400">({grouped[opt.value]?.length || 0})</span>
              {activeTab === opt.value && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* 内容 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchCategories} />
        ) : currentList.length === 0 ? (
          <EmptyState icon="🏷️" title={`暂无${TYPE_LABELS[activeTab] || ''}分类`}
            desc="点击右上角「新增分类」创建" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-16">排序</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">分类名称</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-24">状态</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium w-32">操作</th>
                </tr>
              </thead>
              <tbody>
                {currentList.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{cat.sort_order || 0}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{cat.name}</span>
                      {cat.is_active ? null : (
                        <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-xs">已禁用</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(cat)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${cat.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        {cat.is_active ? '启用中' : '已禁用'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(cat)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                        <button onClick={() => { setDeleteTarget(cat); setDeleteError(''); }}
                          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════ 新增/编辑弹窗 ═══════════ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? '编辑分类' : '新增分类'} size="sm"
        footer={
          <>
            <button onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }>
        <div className="space-y-4">
          {/* 类型选择（新增时可选，编辑时只读） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类类型</label>
            {editTarget ? (
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                {TYPE_LABELS[form.type] || form.type}
              </div>
            ) : (
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
            <input type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：现代简约、三室两厅..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          </div>

          {/* 排序 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">排序序号（越小越靠前）</label>
            <input type="number" value={form.sort_order || 0}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          {/* 启用/禁用（仅编辑时） */}
          {editTarget && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">启用状态</span>
              <button onClick={() => setForm({ ...form, is_active: form.is_active ? 0 : 1 })}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* ═══════════ 删除确认 ═══════════ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
        onConfirm={handleDelete}
        title="删除分类"
        message={deleteError || `确定要删除「${deleteTarget?.name || ''}」分类吗？${deleteTarget ? '\n\n⚠ 如果该分类已被作品引用，将无法删除。' : ''}`}
        confirmText={deleteError ? '无法删除' : '确认删除'}
        variant={deleteError ? 'warning' : 'danger'}
        loading={deleting}
      />
    </div>
  );
}
