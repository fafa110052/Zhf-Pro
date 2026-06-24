import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Mine() {
  const navigate = useNavigate();
  const { isLoggedIn, user, isDesigner, isGuest, isOwner, logout, loading } = useAuth();

  // 初始化中
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <span className="w-5 h-5 border-2 border-gray-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  // 未登录
  if (!isLoggedIn) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6" style={{ background: 'linear-gradient(180deg, #e8f4fd 0%, #f8fafc 40%)' }}>
        <img src="/zhflogo.png" alt="住好房" className="w-20 h-20 mx-auto rounded-2xl shadow-sm mb-6" />
        <h2 className="text-lg font-semibold text-gray-900">登录后查看更多</h2>
        <p className="text-sm text-gray-400 mt-1 mb-8">登录后可管理作品、查看进度</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full max-w-xs py-3 bg-slate-900 text-white rounded-xl text-sm font-medium active:bg-slate-800"
        >
          手机号登录
        </button>
      </div>
    );
  }

  // 角色标签
  const roleLabel = isDesigner ? '设计师' : isOwner ? '业主' : isGuest ? '游客' : '';
  const roleClass = isDesigner ? 'bg-blue-50 text-blue-700' : isOwner ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className="min-h-full bg-gray-50">
      {/* 顶部个人信息卡片 */}
      <div className="bg-white px-4 py-8 border-b border-gray-100" style={{ background: 'linear-gradient(180deg, #e8f4fd 0%, #ffffff 60%)' }}>
        <div className="flex items-center gap-4">
          {/* 头像 */}
          <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white text-xl font-medium shrink-0">
            {(user?.name || '用')[0]}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{user?.name || '用户'}</h3>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${roleClass}`}>
                {roleLabel}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{user?.phone || ''}</p>
          </div>
        </div>
      </div>

      {/* 游客：升级引导 */}
      {isGuest && (
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              您当前是<b>游客</b>身份，可以浏览作品但无法上传作品。如需成为设计师，请联系管理员升级账号。
            </p>
          </div>
        </div>
      )}

      {/* 业主 */}
      {isOwner && (
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">
              业主账号，可在小程序中查看施工进度。H5 暂不支持施工管理功能。
            </p>
          </div>
        </div>
      )}

      {/* 设计师：功能入口 */}
      {isDesigner && (
        <div className="p-4 space-y-3">
          {/* 作品管理 */}
          <button
            onClick={() => navigate('/work-manage')}
            className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 active:bg-gray-50"
          >
            <span className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-lg shrink-0">
              📁
            </span>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-gray-900">作品管理</div>
              <div className="text-xs text-gray-400 mt-0.5">查看和管理我的作品</div>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </button>

          {/* 上传作品 */}
          <button
            onClick={() => navigate('/work-upload')}
            className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 active:bg-gray-50"
          >
            <span className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg shrink-0">
              ➕
            </span>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-gray-900">上传作品</div>
              <div className="text-xs text-gray-400 mt-0.5">发布新的装修作品</div>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </button>
        </div>
      )}

      {/* 退出登录 */}
      {isLoggedIn && (
        <div className="p-4">
          <button
            onClick={() => { logout(); navigate('/', { replace: true }); }}
            className="w-full py-3 text-sm text-gray-400 border border-gray-200 rounded-xl bg-white active:bg-gray-50"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
