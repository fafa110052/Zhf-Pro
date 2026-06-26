import { useNavigate } from 'react-router-dom';

// 简易格式化：面积
function formatArea(sqm) {
  if (!sqm && sqm !== 0) return '';
  return `${sqm}㎡`;
}

// 简易格式化：预算
function formatBudget(min, max) {
  if (!min && !max) return '';
  const w = (n) => (n >= 10000 ? `${(n / 10000).toFixed(0)}万` : `${n}`);
  if (min && max && min === max) return w(min);
  if (min && max) return `${w(min)}-${w(max)}`;
  if (min) return `${w(min)}起`;
  return `${w(max)}以内`;
}

// 简易格式化：浏览量
function formatViews(n) {
  if (!n) return '0';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function WorkCard({ work }) {
  const navigate = useNavigate();

  if (!work) return null;

  const areaText = formatArea(work.area_sqm);
  const budgetText = formatBudget(work.budget_min, work.budget_max);
  const viewsText = formatViews(work.view_count);

  return (
    <div
      onClick={() => navigate(`/work/${work.id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
    >
      {/* 封面图 */}
      <div className="relative w-full aspect-4/3 bg-gray-100">
        <img
          src={work.cover_thumb || work.cover_image}
          alt={work.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* 浏览量 */}
        {work.view_count > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
            👁 {viewsText}
          </span>
        )}
      </div>

      {/* 信息区 */}
      <div className="p-2.5 space-y-1.5">
        {/* 标题 */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {work.title}
        </h3>

        {/* 风格标签 */}
        {work.style_category_name && (
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
            {work.style_category_name}
          </span>
        )}

        {/* 面积 + 预算 */}
        {(areaText || budgetText) && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {areaText && <span>{areaText}</span>}
            {areaText && budgetText && <span>·</span>}
            {budgetText && <span>{budgetText}</span>}
          </div>
        )}

        {/* 设计师 */}
        {work.designer_name && (
          <div className="text-[10px] text-gray-400">
            设计师：{work.designer_name}
          </div>
        )}
      </div>
    </div>
  );
}
