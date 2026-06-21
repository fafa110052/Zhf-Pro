export default function DesignerCard({ designer }) {
  if (!designer) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">设计师</h3>

      <div className="flex items-center gap-3">
        {/* 头像 */}
        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0">
          {designer.avatar_url ? (
            <img
              src={designer.avatar_url}
              alt={designer.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-2xl">👤</span>
          )}
        </div>

        {/* 姓名 + 经验 */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {designer.name || '未知设计师'}
          </p>
          {designer.years_of_exp > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {designer.years_of_exp} 年设计经验
            </p>
          )}
        </div>
      </div>

      {/* 简介 */}
      {designer.bio && (
        <p className="text-xs text-gray-500 leading-relaxed">{designer.bio}</p>
      )}
    </div>
  );
}
