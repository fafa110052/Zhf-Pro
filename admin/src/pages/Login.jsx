import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();

  // 已登录 → 直接跳转仪表盘
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      navigate(redirect, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('请输入账号和密码');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedUser, trimmedPass);
      // 记住密码（仅存用户名，不推荐存密码）
      if (remember) {
        localStorage.setItem('remembered_username', trimmedUser);
      } else {
        localStorage.removeItem('remembered_username');
      }
      const redirect = searchParams.get('redirect') || '/dashboard';
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err?.message || '登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 读取记住的用户名
  useEffect(() => {
    const saved = localStorage.getItem('remembered_username');
    if (saved) {
      setUsername(saved);
      setRemember(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ─── 左侧品牌区（桌面端可见） ─── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-slate-900 relative overflow-hidden items-center justify-center">
        {/* 装饰背景 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-teal-300 rounded-full blur-3xl" />
        </div>
        <div className="relative text-center text-white px-12">
          <div className="text-7xl mb-6">🏠</div>
          <h1 className="text-4xl font-bold tracking-wide mb-4">住好房</h1>
          <p className="text-lg text-slate-300 mb-3">装修展示平台</p>
          <div className="w-16 h-0.5 bg-blue-400 mx-auto mb-4" />
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            装修案例 · 设计灵感<br />一站式装饰作品管理
          </p>
        </div>
      </div>

      {/* ─── 右侧登录表单 ─── */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">🏠 住好房</h1>
            <p className="mt-2 text-gray-500">管理后台</p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">欢迎回来</h2>
            <p className="mt-1 text-sm text-gray-500">请输入管理员账号登录系统</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
          >
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 flex items-start space-x-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* 账号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                账号
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-gray-400"
                placeholder="请输入管理员账号"
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-gray-400"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>

            {/* 记住密码 + 忘记密码 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">记住账号</span>
              </label>
              <span className="text-sm text-gray-400">忘记密码？联系管理员</span>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span>{loading ? '登录中...' : '登 录'}</span>
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            住好房装修展示平台 · 管理后台 v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
