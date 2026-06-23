import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

/**
 * 路由 → 面包屑中文映射
 */
const BREADCRUMB_MAP = {
  dashboard: '仪表盘',
  works: '作品管理',
  designers: '人员管理',
  images: '图片库',
  settings: '系统设置',
  'avatar-reviews': '头像审核',
  properties: '楼盘管理',
  'material-categories': '材料分类',
  materials: '材料管理',
  'material-orders': '工程管理',
  categories: '分类字典',
};

/**
 * 从当前路径生成面包屑数组
 * 如 /works/approve → [{ label: '作品管理', path: '/works' }, { label: '审核', path: '' }]
 */
function getBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [];
  let accumulated = '';

  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label = BREADCRUMB_MAP[seg] || seg;
    crumbs.push({ label, path: accumulated });
  }

  return crumbs;
}

/**
 * 顶部操作栏
 * - 左侧：移动端汉堡按钮 + 面包屑导航
 * - 右侧：用户头像 + 下拉菜单
 */
export default function HeaderBar({ onMenuClick, user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    onLogout();
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* ─── 左侧 ─── */}
      <div className="flex items-center space-x-3">
        {/* 移动端汉堡按钮 */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* 面包屑 */}
        <nav className="hidden sm:flex items-center text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-1.5">
            {breadcrumbs.length === 0 ? (
              <li className="text-gray-500">首页</li>
            ) : (
              breadcrumbs.map((crumb, idx) => (
                <li key={crumb.path} className="flex items-center space-x-1.5">
                  {idx > 0 && (
                    <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd" />
                    </svg>
                  )}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  ) : (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {crumb.label}
                    </button>
                  )}
                </li>
              ))
            )}
          </ol>
        </nav>
      </div>

      {/* ─── 右侧：用户 ─── */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 pl-3 pr-1.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {/* 头像 */}
          <span className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-medium">
            {(user?.name || '管')[0]}
          </span>
          <span className="hidden sm:inline text-sm text-gray-700 font-medium">
            {user?.name || '管理员'}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 下拉菜单 */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user?.name || '管理员'}</p>
              <p className="text-xs text-gray-500">超级管理员</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>退出登录</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
