/**
 * 错误状态组件
 *
 * props:
 *   icon     - emoji 图标（默认 '⚠️'）
 *   message  - 错误提示文字
 *   onRetry  - 重试回调
 *   retryText - 重试按钮文字（默认 '点击重试'）
 */

export default function ErrorState({
  icon = '⚠️',
  message = '加载失败',
  onRetry,
  retryText = '点击重试',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4" onClick={onRetry}>
      <span className="text-4xl">{icon}</span>
      <p className="text-sm text-gray-400 mt-3">{message}</p>
      {onRetry && (
        <p className="text-xs text-gray-300 mt-1">{retryText}</p>
      )}
    </div>
  );
}
