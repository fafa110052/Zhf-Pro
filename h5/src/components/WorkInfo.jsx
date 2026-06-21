export default function WorkInfo({ work }) {
  if (!work) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
      {/* 标题 */}
      <h1 className="text-lg font-bold text-gray-900 leading-snug">{work.title}</h1>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-1.5">
        {work.house_type_name && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
            {work.house_type_name}
          </span>
        )}
        {work.area_category_name && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
            {work.area_category_name}
          </span>
        )}
        {work.style_category_name && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
            {work.style_category_name}
          </span>
        )}
      </div>

      {/* 数据项 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <MetaItem label="面积" value={work.area_text || '未填写'} />
        <MetaItem label="预算" value={work.budget_text || '未填写'} />
        <MetaItem label="浏览量" value={`${work.view_count || 0} 次`} />
        <MetaItem label="发布时间" value={work.created_at_text || ''} />
      </div>

      {/* 设计说明 */}
      {work.description && (
        <div className="pt-3 border-t border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">设计说明</h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {work.description}
          </p>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <p className="text-sm text-gray-700 mt-0.5">{value}</p>
    </div>
  );
}
