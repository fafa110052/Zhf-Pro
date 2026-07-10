import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/**
 * 菜单分组配置
 */
const MENU_GROUPS = [
  {
    key: 'content',
    label: '内容管理',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    items: [
      { path: '/works', label: '作品管理' },
      { path: '/avatar-reviews', label: '头像审核' },
      { path: '/images', label: '图片库' },
      { path: '/categories', label: '分类字典' },
    ],
  },
  {
    key: 'business',
    label: '业务管理',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    items: [
      { path: '/designers', label: '人员管理' },
      { path: '/properties', label: '楼盘管理' },
      { path: '/material-orders', label: '工程管理' },
      { path: '/measurement-appointments', label: '量房预约' },
    ],
  },
  {
    key: 'materials',
    label: '装修选材',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    items: [
      { path: '/material-categories', label: '材料分类' },
      { path: '/materials', label: '材料管理' },
    ],
  },
  {
    key: 'marketing',
    label: '运营工具',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    items: [
      { path: '/lottery', label: '摇一摇抽奖' },
    ],
  },
];

// 各菜单项图标（按 path 索引）
const ITEM_ICONS = {
  '/works': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  '/avatar-reviews': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  '/images': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  '/designers': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  '/properties': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  '/material-orders': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  '/measurement-appointments': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  '/material-categories': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  '/materials': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  '/categories': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  '/lottery': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A2.704 2.704 0 003 15.546M12 3v2m-6.364.636L7.05 7.05m9.9 0l1.414-1.414M21 12h-2M5 12H3m14.364 5.364l-1.414 1.414M7.05 16.95l-1.414 1.414" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  '/settings': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  '/dashboard': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  ),
};

/**
 * 左侧垂直导航栏 — 分组卡片版
 *
 * 设计系统：Data-Dense Dashboard + Dark Mode
 * - 深色侧边栏（slate-900），分组采用微凸起容器
 * - 激活分组：左侧 accent 色条 + 背景高亮
 * - 间距：8px 节奏（组间 8px，组内子项 2px）
 * - 动画：200ms ease-in-out
 */
export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();

  // 分组展开状态（默认全部展开）
  const [expanded, setExpanded] = useState(() => {
    const init = {};
    MENU_GROUPS.forEach((g) => { init[g.key] = true; });
    return init;
  });

  const toggleGroup = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** 判断菜单项是否激活 */
  const isItemActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  /** 判断分组是否有激活子项 */
  const isGroupActive = (group) => group.items.some((item) => isItemActive(item.path));

  /** 渲染菜单项 */
  const renderItem = (item, { indent = true, compact = false } = {}) => {
    const active = isItemActive(item.path);
    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onMobileClose}
        className={`
          flex items-center rounded-lg transition-all duration-200 group
          ${compact
            ? 'justify-center px-0 h-9'
            : indent
              ? 'pl-9 pr-2 h-8'
              : 'px-2.5 space-x-3 h-9'
          }
          ${active
            ? 'bg-slate-700/80 text-white shadow-sm'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }
        `}
        title={collapsed ? item.label : undefined}
      >
        <span className={`shrink-0 transition-colors duration-200 ${
          active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
        }`}>
          {ITEM_ICONS[item.path]}
        </span>
        <span
          className={`text-[13px] font-medium whitespace-nowrap transition-opacity ${
            collapsed ? 'lg:hidden' : ''
          }`}
        >
          {item.label}
        </span>
      </NavLink>
    );
  };

  return (
    <>
      {/* ─── 移动端遮罩层 ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* ─── 侧边栏本体 ─── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen
          flex flex-col bg-slate-900 text-white
          transition-all duration-300 ease-in-out
          lg:relative lg:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-16' : 'lg:w-56'}
        `}
      >
        {/* Logo + 折叠按钮 */}
        <div className="flex items-center h-14 px-3 border-b border-white/6 shrink-0">
          <div className={`flex items-center overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
            <img src="/admin/zhfanglogo.png" alt="住好房" className="w-7 h-7 rounded-lg shrink-0" />
            <h1 className="text-[15px] font-bold whitespace-nowrap ml-2.5 tracking-tight">
              住好房
            </h1>
          </div>
          {/* 折叠按钮 — 仅桌面端可见 */}
          <button
            onClick={onToggle}
            className="hidden lg:flex items-center justify-center w-7 h-7 ml-auto rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
            title={collapsed ? '展开菜单' : '收起菜单'}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {/* 移动端关闭按钮 */}
          <button
            onClick={onMobileClose}
            className="lg:hidden flex items-center justify-center w-8 h-8 ml-auto rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 菜单列表 */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto">
          {/* ── 仪表盘（独立，不分组）── */}
          <div className={collapsed ? 'lg:flex lg:justify-center' : ''}>
            {renderItem(
              { path: '/dashboard', label: '仪表盘' },
              { indent: false, compact: collapsed }
            )}
          </div>

          {/* ── 分隔线 ── */}
          <div className="my-3 mx-1 border-t border-white/6" />

          {/* ── 分组菜单 ── */}
          <div className="space-y-2">
            {MENU_GROUPS.map((group) => {
              const isOpen = expanded[group.key];
              const active = isGroupActive(group);

              return (
                <div
                  key={group.key}
                  className={`
                    rounded-xl transition-all duration-200 relative
                    ${active && !collapsed
                      ? 'bg-white/5 ring-1 ring-white/6 border-l-2 border-l-blue-400'
                      : 'bg-transparent hover:bg-white/2'
                    }
                    ${collapsed ? 'lg:bg-transparent lg:ring-0 lg:border-l-0' : ''}
                  `}
                >
                  {/* 分组标题 */}
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className={`
                      w-full flex items-center rounded-xl transition-all duration-200
                      ${collapsed ? 'lg:justify-center lg:px-0 lg:h-9 lg:relative' : 'px-2.5 h-9'}
                      ${active && !collapsed
                        ? 'text-slate-100'
                        : 'text-slate-500 hover:text-slate-300'
                      }
                    `}
                    title={collapsed ? group.label : undefined}
                  >
                    <span className={`shrink-0 transition-colors duration-200 ${
                      active ? 'text-blue-400' : ''
                    }`}>
                      {group.icon}
                    </span>
                    <span className={`flex-1 text-left ml-2.5 text-xs font-medium whitespace-nowrap ${
                      collapsed ? 'lg:hidden' : ''
                    }`}>
                      {group.label}
                    </span>
                    {/* 折叠箭头 */}
                    {!collapsed && (
                      <svg
                        className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-90' : ''
                        } ${active ? 'text-slate-300' : 'text-slate-600'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    {/* 折叠态：激活分组用小圆点提示 */}
                    {collapsed && active && (
                      <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 lg:block hidden" />
                    )}
                  </button>

                  {/* 分组子项 */}
                  <div
                    className={`space-y-0.5 overflow-hidden transition-all duration-200 ease-in-out ${
                      collapsed
                        ? 'lg:block'
                        : isOpen
                          ? 'max-h-64 opacity-100 pb-1.5 px-1.5'
                          : 'max-h-0 opacity-0'
                    }`}
                  >
                    {group.items.map((item) => renderItem(item, { compact: collapsed }))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 分隔线 ── */}
          <div className="my-3 mx-1 border-t border-white/6" />

          {/* ── 系统设置（独立，最后）── */}
          <div className={collapsed ? 'lg:flex lg:justify-center' : ''}>
            {renderItem(
              { path: '/settings', label: '系统设置' },
              { indent: false, compact: collapsed }
            )}
          </div>
        </nav>

        {/* 底部版本号 */}
        <div className={`px-4 py-3 border-t border-white/6 text-xs text-slate-600 ${collapsed ? 'lg:text-center' : ''}`}>
          {collapsed ? (
            <span className="hidden lg:inline" title="住好房 v1.1">🏠</span>
          ) : (
            <span>住好房 v1.1</span>
          )}
        </div>
      </aside>
    </>
  );
}
