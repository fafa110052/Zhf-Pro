import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ToastProvider } from './Toast';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';

/**
 * 管理后台主布局
 *
 * 前置条件：ProtectedLayout 已确保 isAuthenticated 为 true，
 *           所以本组件可以直接使用 useAuth() 获取 user。
 *
 * 提供：
 * - Toast 通知系统（全局）
 * - 响应式侧栏布局
 */
export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleToggle = () => setCollapsed((v) => !v);
  const handleMobileToggle = () => setMobileOpen((v) => !v);
  const handleMobileClose = () => setMobileOpen(false);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          mobileOpen={mobileOpen}
          onMobileClose={handleMobileClose}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <HeaderBar
            onMenuClick={handleMobileToggle}
            user={user}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>

          {/* ICP备案号 */}
          <div className="text-center py-1 bg-gray-50 text-gray-400 text-[11px] border-t border-gray-100">
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
            >
              桂ICP备2026013449号
            </a>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
