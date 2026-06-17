import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

/**
 * Toast 通知系统
 *
 * 用法:
 *   import { ToastProvider, useToast } from '../components/Toast';
 *
 *   在 Layout 中包裹 <ToastProvider>...</ToastProvider>
 *   在任意子组件中: const toast = useToast();
 *     toast.success('操作成功');
 *     toast.error('操作失败');
 *     toast.info('提示信息');
 *     toast.warning('警告');
 */

const ToastContext = createContext(null);

let toastId = 0;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/**
 * 颜色配置
 */
const STYLES = {
  success: { bg: 'bg-green-600', icon: '✅' },
  error: { bg: 'bg-red-600', icon: '❌' },
  info: { bg: 'bg-blue-600', icon: 'ℹ️' },
  warning: { bg: 'bg-orange-500', icon: '⚠️' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback((type, message, duration = 3000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => remove(id), duration);
    }

    return id;
  }, [remove]);

  const success = useCallback((msg, dur) => addToast('success', msg, dur), [addToast]);
  const error = useCallback((msg, dur) => addToast('error', msg, dur), [addToast]);
  const info = useCallback((msg, dur) => addToast('info', msg, dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast('warning', msg, dur), [addToast]);

  // 清理定时器
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ success, error, info, warning, remove }}>
      {children}
      {/* Toast 渲染 */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const style = STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`${style.bg} text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 min-w-[240px] max-w-[360px] pointer-events-auto animate-in slide-in-from-right fade-in duration-200`}
            >
              <span className="shrink-0">{style.icon}</span>
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
