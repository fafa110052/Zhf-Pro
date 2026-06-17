import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

// ─── 初始表单状态 ───
const EMPTY_FORM = { name: '', phone: '', years_of_exp: '', bio: '', personnel_type: '', employee_id: '', role: 'designer', owner_property_id: '', building: '', room: '' };

// ─── 状态标签 ───
const STATUS_MAP = {
  active: { label: '启用', cls: 'bg-green-100 text-green-700' },
  inactive: { label: '禁用', cls: 'bg-gray-100 text-gray-500' },
};

export default function Designers() {
  const toast = useToast();

  // ─── 列表状态 ───
  const [designers, setDesigners] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 12, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── 详情面板 ───
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState(null);

  // ─── 筛选状态 ───
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // 楼盘下拉选项（业主角色需要）
  const [properties, setProperties] = useState([]);
  useEffect(() => {
    client.get('/admin/properties').then(r => setProperties(r.data.list || [])).catch(() => {});
  }, []);

  // ─── 弹窗状态 ───
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ─── 确认框状态 ───
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, designer }

  // ─── 删除人员（含作品处理选项）───
  const [deleteWorksOpen, setDeleteWorksOpen] = useState(false);
  const [deleteWorksDesigner, setDeleteWorksDesigner] = useState(null);
  const [deleteWorksCount, setDeleteWorksCount] = useState(0);
  const [deleteWorksChoice, setDeleteWorksChoice] = useState('keep'); // 'keep' | 'delete'
  const [deleteWorksLoading, setDeleteWorksLoading] = useState(false);
  const [deleteWorksChecking, setDeleteWorksChecking] = useState(false);

  // ═══ 加载列表 ═══
  const fetchList = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/admin/users', { params });
      setDesigners(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList({ keyword, status: statusFilter, role: roleFilter || undefined, page: 1, page_size: 12 }); }, [keyword, statusFilter, roleFilter, fetchList]);

  // ═══ 搜索 ═══
  const handleSearch = (e) => {
    e.preventDefault();
    fetchList({ keyword, status: statusFilter, page: 1, page_size: 12 });
  };

  // ═══ 分页 ═══
  const goPage = (p) => {
    if (p < 1 || p > pagination.total_pages) return;
    fetchList({ keyword, status: statusFilter, page: p, page_size: pagination.page_size });
  };

  // ═══ 打开弹窗（新增 / 编辑）═══
  const openModal = (mode, designer = null) => {
    setModalMode(mode);
    if (mode === 'edit' && designer) {
      setEditingId(designer.id);
      setForm({
        name: designer.name || '',
        phone: designer.phone || '',
        years_of_exp: designer.years_of_exp ?? '',
        bio: designer.bio || '',
        personnel_type: designer.personnel_type || 'designer',
        employee_id: designer.employee_id || '',
        role: designer.role || 'designer',
        owner_property_id: designer.owner_property_id || '',
        building: designer.building || '',
        room: designer.room || '',
      });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSubmitting(false);
  };

  const openDetail = (designer) => {
    setDetailUser(designer);
    setDetailOpen(true);
  };

  // ═══ 表单校验 ═══
  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = form.role === 'owner' ? '请输入业主姓名' : '请输入员工姓名';
    if (!form.phone.trim()) {
      errs.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) {
      errs.phone = '手机号格式不正确';
    }
    if (form.years_of_exp !== '' && (isNaN(form.years_of_exp) || Number(form.years_of_exp) < 0)) {
      errs.years_of_exp = '请输入有效的从业年限';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ═══ 提交表单 ═══
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role || 'designer',
      };

      if (form.role === 'owner') {
        payload.owner_property_id = form.owner_property_id || null;
        payload.building = form.building.trim() || null;
        payload.room = form.room.trim() || null;
      } else {
        payload.years_of_exp = form.years_of_exp === '' ? 0 : Number(form.years_of_exp);
        payload.bio = form.bio.trim() || null;
        payload.personnel_type = form.personnel_type || 'designer';
        payload.employee_id = form.employee_id.trim() || null;
      }

      if (modalMode === 'add') {
        await client.post('/admin/designers', payload);
        toast.success('添加成功');
      } else {
        await client.put(`/admin/designers/${editingId}`, payload);
        toast.success('更新成功');
      }
      closeModal();
      fetchList({ keyword, status: statusFilter, page: pagination.page, page_size: pagination.page_size });
    } catch (err) {
      toast.error(err?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ═══ 状态切换 ═══
  const handleToggleStatus = (designer) => {
    setConfirmAction({
      type: 'toggle',
      designer,
      title: designer.status === 'active' ? `禁用${designer.role === 'owner' ? '业主' : '员工'}` : `启用${designer.role === 'owner' ? '业主' : '员工'}`,
      message: designer.status === 'active'
        ? `确定要禁用${designer.role === 'owner' ? '业主' : '员工'}「${designer.name}」吗？禁用后将无法登录小程序。`
        : `确定要启用${designer.role === 'owner' ? '业主' : '员工'}「${designer.name}」吗？`,
      variant: designer.status === 'active' ? 'warning' : 'default',
      confirmText: designer.status === 'active' ? '禁用' : '启用',
      action: async () => {
        await client.patch(`/admin/designers/${designer.id}/status`);
        toast.success(designer.status === 'active' ? `${designer.role === 'owner' ? '业主' : '员工'}已禁用` : `${designer.role === 'owner' ? '业主' : '员工'}已启用`);
        setConfirmOpen(false);
        setConfirmAction(null);
        fetchList({ keyword, status: statusFilter, page: pagination.page, page_size: pagination.page_size });
      },
    });
    setConfirmOpen(true);
  };

  // ═══ 删除（先检查作品数量）═══
  const handleDelete = async (designer) => {
    setDeleteWorksChecking(true);
    try {
      const res = await client.get(`/admin/designers/${designer.id}`);
      const count = res.data?.case_stats?.total || 0;
      if (count > 0) {
        // 有作品 → 显示选项弹窗
        setDeleteWorksDesigner(designer);
        setDeleteWorksCount(count);
        setDeleteWorksChoice('keep');
        setDeleteWorksOpen(true);
      } else {
        // 无作品 → 直接确认删除
        setConfirmAction({
          type: 'delete',
          designer,
          title: `删除${designer.role === 'owner' ? '业主' : '员工'}`,
          message: `确定要删除${designer.role === 'owner' ? '业主' : '员工'}「${designer.name}」吗？此操作不可撤销。`,
          variant: 'danger',
          confirmText: '确认删除',
          action: async () => {
            try {
              await client.delete(`/admin/designers/${designer.id}`);
              toast.success(`${designer.role === 'owner' ? '业主' : '员工'}已删除`);
              setConfirmOpen(false);
              setConfirmAction(null);
              fetchList({ keyword, status: statusFilter, page: pagination.page, page_size: pagination.page_size });
            } catch (err) {
              toast.error(err?.message || '删除失败');
            }
          },
        });
        setConfirmOpen(true);
      }
    } catch (err) {
      toast.error(err?.message || '获取人员信息失败');
    } finally {
      setDeleteWorksChecking(false);
    }
  };

  // ═══ 确认删除（含作品处理方式）═══
  const confirmDeleteWithWorks = async () => {
    if (!deleteWorksDesigner) return;
    setDeleteWorksLoading(true);
    try {
      const keepWorks = deleteWorksChoice === 'keep';
      await client.delete(`/admin/designers/${deleteWorksDesigner.id}?keep_works=${keepWorks}`);
      const roleLabel = deleteWorksDesigner?.role === 'owner' ? '业主' : '员工';
      toast.success(
        keepWorks
          ? `${roleLabel}已删除，${deleteWorksCount} 个作品已转移至管理员`
          : `${roleLabel}及 ${deleteWorksCount} 个作品已一并删除`
      );
      setDeleteWorksOpen(false);
      setDeleteWorksDesigner(null);
      fetchList({ keyword, status: statusFilter, page: pagination.page, page_size: pagination.page_size });
    } catch (err) {
      toast.error(err?.message || '删除失败');
    } finally {
      setDeleteWorksLoading(false);
    }
  };

  // ═══ 渲染 ═══
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 顶部操作栏 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="搜索姓名 / 手机号"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            <option value="active">启用</option>
            <option value="inactive">禁用</option>
          </select>
          {['', 'designer', 'owner'].map(r => (
            <button key={r} type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${roleFilter === r ? 'bg-slate-900 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {r === '' ? '全部' : r === 'designer' ? '员工' : '业主'}
            </button>
          ))}
          <button
            type="submit"
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            搜索
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加人员
          </button>
        </form>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => { setError(''); fetchList({ keyword, status: statusFilter, page: pagination.page, page_size: pagination.page_size }); }} />
        </div>
      )}

      {/* ─── 数据表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['姓名', '手机号', '角色', '楼盘/房号', '类型', '状态', '微信绑定', '注册时间', '操作'].map((h) => (
                  <th key={h} className={`${h === '操作' ? 'text-right' : 'text-left'} px-4 py-3 text-gray-500 font-medium text-xs`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="w-8 h-8 mx-auto border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : designers.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState icon="👤" title="暂无人员数据" size="sm"
                      action={
                        <button onClick={() => openModal('add')} className="text-sm text-blue-600 hover:underline">
                          添加第一位人员
                        </button>
                      } />
                  </td>
                </tr>
              ) : (
                designers.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => openDetail(d)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium shrink-0">
                          {d.name?.[0] || '?'}
                        </span>
                        <span className="font-medium text-gray-900">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.role === 'owner' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {d.role === 'owner' ? '业主' : '员工'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.role === 'owner' && d.property_name
                        ? <span>{d.property_name}{d.building || d.room ? ` · ${d.building || ''}${d.room || ''}` : ''}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.personnel_type === 'supervisor' ? 'bg-purple-100 text-purple-700' :
                        d.personnel_type === 'engineer' ? 'bg-cyan-100 text-cyan-700' :
                        d.personnel_type === 'design_director' ? 'bg-indigo-100 text-indigo-700' :
                        d.personnel_type === 'engineering_director' ? 'bg-teal-100 text-teal-700' :
                        d.role === 'owner' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'}`}>
                        {d.role === 'owner' ? '业主' :
                         d.personnel_type === 'supervisor' ? '监理' :
                         d.personnel_type === 'engineer' ? '工程师' :
                         d.personnel_type === 'design_director' ? '设计总监' :
                         d.personnel_type === 'engineering_director' ? '工程总监' :
                         '设计师'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[d.status]?.cls}`}>
                        {STATUS_MAP[d.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.is_bound ? (
                        <span className="inline-flex items-center text-xs text-green-600">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          已绑定
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">未绑定</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openModal('edit', d); }}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(d); }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            d.status === 'active'
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {d.status === 'active' ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(d); }}
                          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── 分页 ─── */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>共 {pagination.total} 条记录</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => goPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              {/* 页码按钮 */}
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                .filter((p) => {
                  // 只显示当前页附近的页码
                  if (pagination.total_pages <= 7) return true;
                  if (p === 1 || p === pagination.total_pages) return true;
                  if (Math.abs(p - pagination.page) <= 1) return true;
                  return false;
                })
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`dot-${idx}`} className="px-1 text-gray-300">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        pagination.page === p
                          ? 'bg-slate-900 text-white'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => goPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 添加/编辑弹窗 ═══ */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalMode === 'add' ? '添加人员' : '编辑人员'}
        footer={
          <>
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {submitting ? '保存中...' : modalMode === 'add' ? '添加' : '保存'}
            </button>
          </>
        }
      >
        {formErrors.form && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
            {formErrors.form}
          </div>
        )}
        <div className="space-y-4">
          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={form.role === 'owner' ? '请输入业主姓名' : '请输入员工姓名'}
            />
            {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
          </div>

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              手机号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="请输入手机号"
            />
            {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
          </div>

          {/* 角色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">角色</label>
            <select value={form.role} onChange={(e) => {
              const newRole = e.target.value;
              setForm({ ...form, role: newRole,
                ...(newRole === 'owner' ? { personnel_type: '', employee_id: '' } : { owner_property_id: '', building: '', room: '' })
              });
            }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="designer">员工</option>
              <option value="owner">业主</option>
            </select>
          </div>

          {/* 业主专属字段 */}
          {form.role === 'owner' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">所属楼盘 *</label>
                <select value={form.owner_property_id} onChange={(e) => setForm({ ...form, owner_property_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择楼盘</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">楼号</label>
                  <input type="text" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如：3栋" maxLength={32} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">房号</label>
                  <input type="text" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如：1001" maxLength={32} />
                </div>
              </div>
            </>
          )}

          {/* 员工专属字段 */}
          {form.role !== 'owner' && (
            <>
              {/* 人员类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">人员类型</label>
                <select value={form.personnel_type} onChange={(e) => setForm({ ...form, personnel_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="designer">设计师</option>
                  <option value="supervisor">监理</option>
                  <option value="engineer">工程师</option>
                  <option value="design_director">设计总监</option>
                  <option value="engineering_director">工程总监</option>
                </select>
              </div>

              {/* 工号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">工号</label>
                <input type="text" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如 D001 / S001（选填）" maxLength={32} />
              </div>

              {/* 从业年限 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">从业年限</label>
                <input
                  type="number"
                  min="0"
                  value={form.years_of_exp}
                  onChange={(e) => setForm({ ...form, years_of_exp: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.years_of_exp ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {formErrors.years_of_exp && <p className="mt-1 text-xs text-red-500">{formErrors.years_of_exp}</p>}
              </div>

              {/* 简介 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">简介</label>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="请输入员工简介（选填）"
                />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ═══ 确认对话框 ═══ */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
        onConfirm={confirmAction?.action}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmText={confirmAction?.confirmText}
        variant={confirmAction?.variant}
      />

      {/* ═══ 删除人员 — 作品处理选项 ═══ */}
      <Modal
        open={deleteWorksOpen}
        onClose={() => setDeleteWorksOpen(false)}
        title={`删除${deleteWorksDesigner?.role === 'owner' ? '业主' : '员工'}`}
        footer={
          <>
            <button
              onClick={() => setDeleteWorksOpen(false)}
              disabled={deleteWorksLoading}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmDeleteWithWorks}
              disabled={deleteWorksLoading}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleteWorksLoading ? '处理中...' : '确认删除'}
            </button>
          </>
        }>
        <div className="space-y-4">
          {/* 头部提示 */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-800">
                {deleteWorksDesigner?.role === 'owner' ? '业主' : '员工'}「{deleteWorksDesigner?.name}」有 {deleteWorksCount} 个作品
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                作品属于公司知识产权，请选择处理方式
              </p>
            </div>
          </div>

          {/* 选项 */}
          <div className="space-y-3">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                deleteWorksChoice === 'keep'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="worksChoice"
                value="keep"
                checked={deleteWorksChoice === 'keep'}
                onChange={() => setDeleteWorksChoice('keep')}
                className="mt-0.5 w-4 h-4 text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">保留作品</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  作品归属将转移至管理员账号，作品数据、图片、浏览记录全部保留
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                deleteWorksChoice === 'delete'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="worksChoice"
                value="delete"
                checked={deleteWorksChoice === 'delete'}
                onChange={() => setDeleteWorksChoice('delete')}
                className="mt-0.5 w-4 h-4 text-red-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">一并删除</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  永久删除该员工的所有 {deleteWorksCount} 个作品及相关图片，此操作不可撤销
                </p>
              </div>
            </label>
          </div>
        </div>
      </Modal>

      {/* ═══ 人员详情侧边栏 ═══ */}
      {detailOpen && detailUser && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">人员详情</h3>
              <button onClick={() => setDetailOpen(false)} className="p-1 hover:bg-slate-100 rounded">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <span className="w-16 h-16 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-2xl font-bold shrink-0">
                  {detailUser.name?.[0] || '?'}
                </span>
                <div>
                  <p className="text-lg font-bold text-gray-900">{detailUser.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${detailUser.role === 'owner' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {detailUser.role === 'owner' ? '业主' : '员工'}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[detailUser.status]?.cls}`}>
                      {STATUS_MAP[detailUser.status]?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">手机号</span><span className="text-gray-900 text-sm">{detailUser.phone || '—'}</span></div>
                <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">角色</span><span className="text-gray-900 text-sm">{detailUser.role === 'owner' ? '业主' : '员工'}</span></div>
                {detailUser.role !== 'owner' && (
                  <>
                    <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">人员类型</span><span className="text-gray-900 text-sm">{
                      detailUser.personnel_type === 'supervisor' ? '监理' :
                      detailUser.personnel_type === 'engineer' ? '工程师' :
                      detailUser.personnel_type === 'design_director' ? '设计总监' :
                      detailUser.personnel_type === 'engineering_director' ? '工程总监' : '设计师'
                    }</span></div>
                    <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">从业年限</span><span className="text-gray-900 text-sm">{detailUser.years_of_exp ? `${detailUser.years_of_exp} 年` : '—'}</span></div>
                    <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">工号</span><span className="text-gray-900 text-sm font-mono">{detailUser.employee_id || '—'}</span></div>
                  </>
                )}
                {detailUser.role === 'owner' && detailUser.property_name && (
                  <>
                    <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">所属楼盘</span><span className="text-gray-900 text-sm">{detailUser.property_name}</span></div>
                    <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">楼栋房号</span><span className="text-gray-900 text-sm">{(detailUser.building || '') + (detailUser.room || '') || '—'}</span></div>
                  </>
                )}
                <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">微信绑定</span>
                  <span className={`text-sm ${detailUser.is_bound ? 'text-green-600' : 'text-gray-400'}`}>{detailUser.is_bound ? '已绑定' : '未绑定'}</span></div>
                <div className="flex"><span className="text-gray-400 text-sm w-24 shrink-0">注册时间</span><span className="text-gray-900 text-sm">{detailUser.created_at?.slice(0, 10)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
