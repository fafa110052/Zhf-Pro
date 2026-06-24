import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 路由守卫
 * - requireRole: 需要特定角色才能访问（不传则仅需登录）
 * - 未登录 → 跳转 /login?redirect=当前路径
 * - 角色不匹配 → 跳转 /mine
 */
export default function AuthGuard({ children, requireRole }) {
  const { isLoggedIn, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <span className="w-5 h-5 border-2 border-gray-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requireRole && role !== requireRole) {
    return <Navigate to="/mine" replace />;
  }

  return children;
}
