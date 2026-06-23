import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginByPhone } from '../api/auth';

export default function Login() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 是否已登录
  const token = localStorage.getItem('h5_token');
  const user = localStorage.getItem('h5_user');

  if (token && user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-12" style={{ background: 'linear-gradient(180deg, #e8f4fd 0%, #f8fafc 40%)' }}>
        <img src="/zhflogo.png" alt="住好房" className="w-16 h-16 mx-auto rounded-xl mb-2" />
        <h2 className="text-lg font-semibold text-gray-900 mt-4">已登录</h2>
        <p className="text-sm text-gray-400 mt-1">
          {(() => {
            try { return JSON.parse(user).name || ''; } catch { return ''; }
          })()}
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('h5_token');
            localStorage.removeItem('h5_user');
            window.location.reload();
          }}
          className="mt-6 px-6 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg active:bg-gray-50"
        >
          退出登录
        </button>
        <button
          onClick={() => navigate('/')}
          className="mt-3 text-sm text-slate-900 font-medium"
        >
          返回首页
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 校验手机号
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      setError('请输入正确的手机号码');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await loginByPhone(phone);
      const { token, user } = result.data || result;

      localStorage.setItem('h5_token', token);
      localStorage.setItem('h5_user', JSON.stringify(user));

      // 登录成功跳回首页
      navigate('/', { replace: true });
    } catch (err) {
      setLoading(false);
      const msg = err?.message || '登录失败，请重试';
      if (msg.includes('网络')) {
        setError('网络错误，请检查连接');
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12" style={{ background: 'linear-gradient(180deg, #e8f4fd 0%, #f8fafc 40%)' }}>
      {/* Logo */}
      <div className="text-center mb-8">
        <img src="/zhflogo.png" alt="住好房" className="w-20 h-20 mx-auto rounded-2xl shadow-sm" />
        <h1 className="text-xl font-bold text-gray-900 mt-3">住好房</h1>
        <p className="text-sm text-gray-400 mt-1">装修展示平台</p>
      </div>

      {/* 登录表单 */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">手机号登录</h2>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <input
          type="tel"
          maxLength={11}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, ''));
            if (error) setError('');
          }}
          placeholder="请输入手机号"
          autoFocus
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        />

        <button
          type="submit"
          disabled={!phone || loading}
          className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-medium disabled:opacity-30 active:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              登录中...
            </>
          ) : (
            '登 录'
          )}
        </button>

        <p className="text-xs text-gray-300 text-center">
          登录即表示同意《用户协议》和《隐私政策》
        </p>
      </form>

      {/* 底部返回 */}
      <button
        onClick={() => navigate('/')}
        className="mt-6 text-sm text-gray-400 active:text-gray-600"
      >
        返回首页
      </button>
    </div>
  );
}
