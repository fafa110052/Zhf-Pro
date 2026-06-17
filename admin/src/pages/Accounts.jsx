import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

// ─── 角色标签配置 ───
const ROLE_MAP = {
  guest: { label: '游客', cls: 'bg-gray-100 text-gray-600' },
  designer: { label: '设计师', cls: 'bg-blue-50 text-blue-700' },
  owner: { label: '业主', cls: 'bg-orange-50 text-orange-700' },
};

// ─── 状态标签 ───
const STATUS_MAP = {
  active: { label: '启用', cls: 'bg-green-100 text-green-700' },
  inactive: { label: '禁用', cls: 'bg-gray-100 text-gray-500' },
};

// ─── 角色筛选 Tab ───
const ROLE_TABS = [
  { key: '', label: '全部' },
  { key: 'guest', label: '游客' },
  { key: 'designer', label: '设计师' },
  { key: 'owner', label: '业主' },
];

export default function Accounts() {
  const toast = useToast();

  // ─── 列表状态 ───
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 12, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── 筛选状态 ───
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // ─── 确认框状态（变更角色）───
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, account }

  // ═══ 加载列表 ═══
  const fetchList = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/admin/accounts', { params });
      setAccounts(res.data.list);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = { keyword, page: 1, page_size: 12 };
    if (roleFilter) params.role = roleFilter;
    fetchList(params);
  }, [keyword, roleFilter, fetchList]);

  // ═══ 搜索 ═══
  const handleSearch = (e) => {
    e.preventDefault();
    const params = { keyword, page: 1, page_size: 12 };
    if (roleFilter) params.role = roleFilter;
    fetchList(params);
  };

  // ═══ 分页 ═══
  const goPage = (p) => {
    if (p < 1 || p > pagination.total_pages) return;
    const params = { keyword, page: p, page_size: pagination.page_size };
    if (roleFilter) params.role = roleFilter;
    fetchList(params);
  };

  // ═══ 变更角色 — 打开确认框 ═══
  const handleChangeRole = (account) => {
    const newRole = account.role === 'guest' ? 'designer' : 'guest';
    const isUpgrade = newRole === 'designer';

    setConfirmAction({
      account,
      title: isUpgrade ? '升级为设计师' : '降为游客',
      message: isUpgrade
        ? `确定将「${account.name}」从游客升级为设计师吗？升级后可管理作品。`
        : `确定将「${account.name}」从设计师降为游客吗？降级后将失去作品管理权限。（已有作品保留）`,
      variant: isUpgrade ? 'default' : 'warning',
      confirmText: isUpgrade ? '确认升级' : '确认降级',
      action: async () => {
        try {
          await client.put(`/admin/accounts/${account.id}/role`, { role: newRole });
          toast.success(isUpgrade ? '已升级为设计师' : '已降为游客');
          setConfirmOpen(false);
          setConfirmAction(null);
          // 刷新列表
          const params = { keyword, page: pagination.page, page_size: pagination.page_size };
          if (roleFilter) params.role = roleFilter;
          fetchList(params);
        } catch (err) {
          toast.error(err?.message || '操作失败');
        }
      },
    });
    setConfirmOpen(true);
  };

  // ═══ 渲染 ═══
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 页面标题 ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">用户管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">管理小程序登录用户，控制游客与设计师角色分配</p>
        </div>
      </div>

      {/* ─── 顶部操作栏 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* 角色筛选 Tab */}
        <div className="flex items-center gap-1 mb-3">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setRoleFilter(tab.key); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                roleFilter === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 搜索栏 */}
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
          <button
            type="submit"
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            搜索
          </button>
        </form>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => {
            setError('');
            const params = { keyword, page: pagination.page, page_size: pagination.page_size };
            if (roleFilter) params.role = roleFilter;
            fetchList(params);
          }} />
        </div>
      )}

      {/* ─── 数据表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['用户', '手机号', '角色', '作品数', '状态', '注册时间', '操作'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="w-8 h-8 mx-auto border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon="👥" title="暂无用户数据" size="sm" />
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    {/* 用户 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {a.avatar_url ? (
                          <img
                            src={a.avatar_url}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium shrink-0">
                            {a.name?.[0] || '?'}
                          </span>
                        )}
                        <span className="font-medium text-gray-900">{a.name || '未命名'}</span>
                      </div>
                    </td>
                    {/* 手机号 */}
                    <td className="px-4 py-3 text-gray-600">{a.phone || '—'}</td>
                    {/* 角色 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_MAP[a.role]?.cls || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_MAP[a.role]?.label || a.role}
                      </span>
                    </td>
                    {/* 作品数 */}
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-flex items-center">
                        {a.case_count > 0 ? (
                          <span className="font-medium text-gray-900">{a.case_count}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </span>
                    </td>
                    {/* 状态 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[a.status]?.cls}`}>
                        {STATUS_MAP[a.status]?.label}
                      </span>
                    </td>
                    {/* 注册时间 */}
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.created_at?.slice(0, 10)}</td>
                    {/* 操作 */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleChangeRole(a)}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          a.role === 'guest'
                            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                            : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                        }`}
                      >
                        {a.role === 'guest' ? '↑ 升级设计师' : '↓ 降为游客'}
                      </button>
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
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                .filter((p) => {
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

      {/* ═══ 变更角色确认对话框 ═══ */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
        onConfirm={confirmAction?.action}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmText={confirmAction?.confirmText}
        variant={confirmAction?.variant}
      />
    </div>
  );
}
