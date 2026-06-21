import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/category', label: '分类', icon: '🔍' },
  { path: '/login', label: '我的', icon: '👤' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-dvh max-w-lg mx-auto bg-gray-50">
      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* 底部导航栏 */}
      <nav className="bg-white border-t border-gray-100 pb-safe">
        <div className="flex items-center justify-around h-14">
          {TABS.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center gap-0.5 w-full h-full active:bg-gray-50 transition-colors ${
                  active ? 'text-slate-900' : 'text-gray-400'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
