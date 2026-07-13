import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/**
 * 功能色彩体系 — 浅色背景下提高饱和度，保证对比度
 */
const GROUP_COLORS = {
  dashboard: {
    accent: 'text-cyan-600',
    accentLight: 'text-cyan-500',
    bg: 'bg-cyan-500',
    bgActive: 'bg-cyan-50',
    border: 'border-cyan-500',
    hoverBg: 'hover:bg-cyan-50',
    dot: 'bg-cyan-500',
  },
  content: {
    accent: 'text-blue-600',
    accentLight: 'text-blue-500',
    bg: 'bg-blue-500',
    bgActive: 'bg-blue-50',
    border: 'border-blue-500',
    hoverBg: 'hover:bg-blue-50',
    dot: 'bg-blue-500',
  },
  business: {
    accent: 'text-emerald-600',
    accentLight: 'text-emerald-500',
    bg: 'bg-emerald-500',
    bgActive: 'bg-emerald-50',
    border: 'border-emerald-500',
    hoverBg: 'hover:bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  materials: {
    accent: 'text-amber-600',
    accentLight: 'text-amber-500',
    bg: 'bg-amber-500',
    bgActive: 'bg-amber-50',
    border: 'border-amber-500',
    hoverBg: 'hover:bg-amber-50',
    dot: 'bg-amber-500',
  },
  marketing: {
    accent: 'text-violet-600',
    accentLight: 'text-violet-500',
    bg: 'bg-violet-500',
    bgActive: 'bg-violet-50',
    border: 'border-violet-500',
    hoverBg: 'hover:bg-violet-50',
    dot: 'bg-violet-500',
  },
  settings: {
    accent: 'text-slate-500',
    accentLight: 'text-slate-400',
    bg: 'bg-slate-400',
    bgActive: 'bg-slate-100',
    border: 'border-slate-400',
    hoverBg: 'hover:bg-slate-100',
    dot: 'bg-slate-400',
  },
};

/**
 * 菜单分组配置
 */
const MENU_GROUPS = [
  {
    key: 'content',
    label: '内容管理',
    colorKey: 'content',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    colorKey: 'business',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    colorKey: 'materials',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    colorKey: 'marketing',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    items: [
      { path: '/lottery', label: '摇一摇抽奖' },
      { path: '/operation-data', label: '运营数据' },
      { path: '/reports', label: '举报管理' },
    ],
  },
];

// 各菜单项图标（按 path 索引）
const ITEM_ICONS = {
  '/works': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  '/avatar-reviews': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  '/images': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  '/designers': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  '/properties': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  '/material-orders': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  '/measurement-appointments': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  '/material-categories': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  '/materials': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  '/categories': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  '/lottery': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A2.704 2.704 0 003 15.546M12 3v2m-6.364.636L7.05 7.05m9.9 0l1.414-1.414M21 12h-2M5 12H3m14.364 5.364l-1.414 1.414M7.05 16.95l-1.414 1.414" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  '/operation-data': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  '/reports': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  '/settings': (
    <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  '/dashboard': (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  ),
};

/**
 * 左侧垂直导航栏 — 浅色渐变 · 字体层级 · 功能色彩 · 精致高级
 *
 * 设计理念：
 * - 浅色渐变背景（白→靛蓝微染），干净明亮
 * - 双层字体：大分类(15px bold) → 子菜单(13px medium)，层次分明
 * - 功能色标：每组独立强调色，深色字体确保 4.5:1 对比度
 * - 8px 间距节奏，白卡片分组容器+柔和阴影
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

  /** 渲染菜单项 — TIER 2 字体（子分类） */
  const renderItem = (item, { indent = true, compact = false, colorKey = null } = {}) => {
    const active = isItemActive(item.path);
    const c = GROUP_COLORS[colorKey] || GROUP_COLORS.settings;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onMobileClose}
        className={`
          flex items-center rounded-lg transition-all duration-200 relative
          ${compact
            ? 'justify-center px-0 h-9'
            : indent
              ? 'pl-9 pr-3 h-8'
              : 'px-3 gap-3 h-9'
          }
          ${active
            ? `${c.bgActive} ${c.accent}`
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }
        `}
        title={collapsed ? item.label : undefined}
      >
        {/* 激活态左侧色条 */}
        {active && !compact && indent && (
          <span className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full ${c.bg}`} />
        )}

        <span className={`shrink-0 transition-colors duration-200 ${
          active ? c.accent : 'text-slate-400 group-hover:text-slate-500'
        }`}>
          {ITEM_ICONS[item.path]}
        </span>

        {/* TIER 2：子分类字体 — 13px medium */}
        <span
          className={`text-[13px] font-medium whitespace-nowrap transition-opacity leading-tight ${
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
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* ─── 侧边栏本体 ─── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen
          flex flex-col
          bg-gradient-to-b from-white via-blue-50/30 to-slate-50
          text-slate-800 border-r border-slate-200/80
          transition-all duration-300 ease-in-out
          lg:relative lg:z-50
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:shadow-none'}
          ${collapsed ? 'lg:w-16' : 'lg:w-56'}
        `}
      >
        {/* ─── Logo 区域 ─── */}
        <div className="flex items-center h-14 px-3 border-b border-slate-200/70 shrink-0">
          <div className={`flex items-center overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <img src="/admin/zhfanglogo.png" alt="住好房" className="w-5 h-5 rounded" />
            </div>
            <h1 className="text-[16px] font-bold whitespace-nowrap ml-2.5 tracking-tight text-slate-800">
              住好房
            </h1>
          </div>

          {/* 折叠按钮 — 桌面端 */}
          <button
            onClick={onToggle}
            className="hidden lg:flex items-center justify-center w-7 h-7 ml-auto rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
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
            className="lg:hidden flex items-center justify-center w-8 h-8 ml-auto rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ─── 导航菜单 ─── */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1.5">
          {/* ── 仪表盘（独立，无分组）── */}
          <div className={collapsed ? 'lg:flex lg:justify-center relative' : 'relative'}>
            {renderItem(
              { path: '/dashboard', label: '仪表盘' },
              { indent: false, compact: collapsed, colorKey: 'dashboard' }
            )}
            {collapsed && isItemActive('/dashboard') && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-500 lg:block hidden" />
            )}
          </div>

          {/* ── 分隔线 ── */}
          <div className="my-2.5 mx-1 border-t border-slate-200/70" />

          {/* ── 功能分组 ── */}
          {MENU_GROUPS.map((group) => {
            const isOpen = expanded[group.key];
            const active = isGroupActive(group);
            const c = GROUP_COLORS[group.colorKey];

            return (
              <div
                key={group.key}
                className={`
                  rounded-xl transition-all duration-200 relative
                  ${active && !collapsed
                    ? 'bg-white shadow-sm ring-1 ring-slate-200/80'
                    : 'bg-transparent hover:bg-white/60'
                  }
                  ${collapsed ? 'lg:bg-transparent lg:shadow-none lg:ring-0' : ''}
                `}
              >
                {/* ── 分组标题 — TIER 1 大分类字体 ── */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`
                    w-full flex items-center rounded-xl transition-all duration-200
                    ${collapsed ? 'lg:justify-center lg:px-0 lg:h-9' : 'px-3 h-10'}
                    ${active
                      ? c.accent
                      : 'text-slate-500 hover:text-slate-700'
                    }
                  `}
                  title={collapsed ? group.label : undefined}
                >
                  {/* 分组图标 */}
                  <span className={`shrink-0 transition-colors duration-200 ${active ? c.accent : ''}`}>
                    {group.icon}
                  </span>

                  {/* TIER 1：大分类名称 — 15px bold，最大字号 */}
                  <span className={`flex-1 text-left ml-2.5 font-bold whitespace-nowrap ${
                    collapsed ? 'lg:hidden' : 'text-[15px]'
                  } ${active ? c.accent : ''}`}>
                    {group.label}
                  </span>

                  {/* 折叠箭头 */}
                  {!collapsed && (
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-90' : ''
                      } ${active ? c.accentLight : 'text-slate-400'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}

                  {/* 折叠态激活指示点 */}
                  {collapsed && active && (
                    <span className={`absolute right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${c.dot} lg:block hidden`} />
                  )}
                </button>

                {/* ── 子项列表 — TIER 2 字体 ── */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    collapsed
                      ? 'lg:block'
                      : isOpen
                        ? 'max-h-64 opacity-100 pb-2 px-1'
                        : 'max-h-0 opacity-0'
                  }`}
                >
                  {group.items.map((item) => renderItem(item, {
                    compact: collapsed,
                    colorKey: group.colorKey,
                  }))}
                </div>
              </div>
            );
          })}

          {/* ── 分隔线 ── */}
          <div className="my-2.5 mx-1 border-t border-slate-200/70" />

          {/* ── 系统设置（独立）── */}
          <div className={collapsed ? 'lg:flex lg:justify-center relative' : 'relative'}>
            {renderItem(
              { path: '/settings', label: '系统设置' },
              { indent: false, compact: collapsed, colorKey: 'settings' }
            )}
          </div>
        </nav>

        {/* ─── 底部版本号 ─── */}
        <div className={`px-4 py-3 border-t border-slate-200/70 text-[10px] text-slate-400 tracking-wide ${collapsed ? 'lg:text-center' : ''}`}>
          {collapsed ? (
            <span className="hidden lg:inline" title="住好房 v1.1">v1.1</span>
          ) : (
            <span>住好房 v1.1</span>
          )}
        </div>
      </aside>
    </>
  );
}
