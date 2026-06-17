/**
 * 空状态占位组件
 *
 * Props:
 * - icon?: string          emoji 图标（默认 '📭'）
 * - title?: string         标题（默认 '暂无数据'）
 * - description?: string   描述文字
 * - action?: ReactNode     操作按钮/链接
 * - size?: 'sm' | 'md'     大小（默认 'md'）
 */
export default function EmptyState({
  icon = '📭',
  title = '暂无数据',
  description,
  action,
  size = 'md',
}) {
  const padding = size === 'sm' ? 'py-10' : 'py-16';
  const iconSize = size === 'sm' ? 'text-3xl' : 'text-5xl';
  const titleSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className={`text-center text-gray-400 ${padding}`}>
      <span className={iconSize}>{icon}</span>
      <p className={`${titleSize} text-gray-500 mt-3 font-medium`}>{title}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
