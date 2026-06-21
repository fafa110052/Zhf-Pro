export default function FilterBar({
  keyword,
  selectedFilters,
  sortBy,
  totalCount,
  onSortChange,
  onRemoveFilter,
  onClearKeyword,
  onClearAll,
}) {
  const hasAnyFilter = selectedFilters.length > 0 || !!keyword;

  return (
    <div className="bg-white border-b border-gray-50">
      {/* 已选筛选条件 + 清除 */}
      {hasAnyFilter && (
        <div className="flex items-center gap-1.5 px-4 pt-2 pb-1 flex-wrap">
          {keyword && (
            <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs bg-slate-900 text-white">
              搜索：{keyword}
              <button onClick={onClearKeyword} className="ml-0.5 text-white/70 active:text-white">
                ✕
              </button>
            </span>
          )}
          {selectedFilters.map((f) => (
            <span
              key={f.paramKey}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700"
            >
              {f.dimLabel}：{f.name}
              <button onClick={() => onRemoveFilter(f.paramKey)} className="ml-0.5 text-slate-400 active:text-slate-600">
                ✕
              </button>
            </span>
          ))}
          <button
            onClick={onClearAll}
            className="text-xs text-gray-400 active:text-gray-600 ml-1"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 排序 + 结果数 */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs text-gray-400">
          {totalCount != null ? `共 ${totalCount} 个作品` : ''}
        </span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => onSortChange('newest')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'newest'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-gray-400'
            }`}
          >
            最新
          </button>
          <button
            onClick={() => onSortChange('popular')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'popular'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-gray-400'
            }`}
          >
            最热
          </button>
        </div>
      </div>
    </div>
  );
}
