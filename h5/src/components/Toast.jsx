import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

/**
 * Toast 通知系统（移动端适配版）
 *
 * 用法:
 *   <ToastProvider> ... </ToastProvider>
 *   const toast = useToast();
 *   toast.success('操作成功');
 *   toast.error('操作失败');
 */

const ToastContext = createContext(null);

let toastId = 0;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

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

  const addToast = useCallback((type, message, duration = 2500) => {
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

  useEffect(() => {
    return () => { Object.values(timersRef.current).forEach(clearTimeout); };
  }, []);

  return (
    <ToastContext.Provider value={{ success, error, info, warning, remove }}>
      {children}
      {/* 移动端：顶部居中 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-[90vw] max-w-sm">
        {toasts.map((t) => {
          const style = STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`${style.bg} text-white px-4 py-2.5 rounded-xl shadow-lg text-sm flex items-center gap-2 pointer-events-auto`}
            >
              <span className="shrink-0">{style.icon}</span>
              <span className="flex-1 truncate">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs"
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
