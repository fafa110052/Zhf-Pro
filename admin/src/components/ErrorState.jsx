/**
 * 错误状态组件
 *
 * Props:
 * - message?: string       错误消息（默认 '加载失败'）
 * - onRetry?: () => void   重试回调
 * - size?: 'sm' | 'md'     大小（默认 'md'）
 */
export default function ErrorState({
  message = '加载失败',
  onRetry,
  size = 'md',
}) {
  const padding = size === 'sm' ? 'py-8' : 'py-16';

  return (
    <div className={`text-center ${padding}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-sm text-red-600 mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重试
        </button>
      )}
    </div>
  );
}
