import Modal from './Modal';

/**
 * 确认对话框
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onConfirm: () => void | Promise<void>
 * - title: string
 * - message: string
 * - confirmText?: string (default "确定")
 * - variant?: 'danger' | 'warning' | 'default' (default 'default')
 * - loading?: boolean
 */
export default function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmText = '确定', variant = 'default', loading = false,
}) {
  const btnColors = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-400',
    default: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-500',
  };

  const iconColors = {
    danger: 'text-red-600 bg-red-100',
    warning: 'text-orange-500 bg-orange-100',
    default: 'text-blue-600 bg-blue-100',
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 ${btnColors[variant]}`}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconColors[variant]}`}>
          {variant === 'danger' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
