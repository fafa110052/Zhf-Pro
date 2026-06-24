import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'h5_token';
const USER_KEY = 'h5_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // 初始化时从 storage 恢复

  // 启动时从 localStorage 恢复
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // 数据损坏，清掉
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // 登录
  const login = useCallback(async (phone) => {
    const result = await client.post('/auth/designer/login/dev', { phone });
    const { token: newToken, user: newUser } = result.data || result;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    return newUser;
  }, []);

  // 退出
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const result = await client.get('/auth/designer/me');
      const userData = result.data || result;
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch {
      // token 失效，清登录态
      logout();
    }
  }, [logout]);

  // 派生状态
  const role = user?.role || null;
  const isLoggedIn = !!(token && user);
  const isDesigner = role === 'designer';
  const isGuest = role === 'guest';
  const isOwner = role === 'owner';

  return (
    <AuthContext.Provider value={{ user, token, role, loading, isLoggedIn, isDesigner, isGuest, isOwner, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
