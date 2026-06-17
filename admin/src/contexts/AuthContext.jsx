import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

/**
 * 认证状态提供者
 *
 * 提供：
 * - user         当前用户对象
 * - token        当前 JWT
 * - isAuthenticated  是否已登录
 * - isLoading    初始化加载中（从 localStorage 恢复时）
 * - login(input) 登录 → 调 API → 存 token → 更新状态
 * - logout()     登出 → 清 storage → 清状态
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // 初始恢复中

  // ─── 应用启动时从 localStorage 恢复 ───
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  // ─── 登录 ───
  const login = useCallback(async (username, password) => {
    const res = await client.post('/auth/admin/login', { username, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  // ─── 登出 ───
  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 快速访问认证上下文的 Hook
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return ctx;
}

export default AuthContext;
