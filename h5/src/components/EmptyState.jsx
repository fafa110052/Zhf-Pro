/**
 * 空数据占位组件
 *
 * props:
 *   icon     - emoji 或文字图标（默认 '📭'）
 *   title    - 主提示文字
 *   description - 副提示文字
 *   action   - { text: '按钮文字', onClick: fn }
 */

export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <span className="text-4xl">{icon}</span>
      {title && <p className="text-sm text-gray-500 mt-3 font-medium">{title}</p>}
      {description && <p className="text-xs text-gray-300 mt-1 text-center">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium active:bg-slate-800 transition-colors"
        >
          {action.text}
        </button>
      )}
    </div>
  );
}
