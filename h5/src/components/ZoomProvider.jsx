import { createContext, useContext, useState, useCallback } from 'react';

/**
 * Context：保留接口兼容，但不再接管缩放
 * 缩放由微信浏览器原生手势处理
 */
const ZoomContext = createContext({ disabled: false, setDisabled: () => {} });
export const useZoomContext = () => useContext(ZoomContext);

export default function ZoomProvider({ children }) {
  const [disabled, setDisabled] = useState(false);
  const setDisabledWrapped = useCallback((v) => setDisabled(v), []);

  return (
    <ZoomContext.Provider value={{ disabled, setDisabled: setDisabledWrapped }}>
      {children}
    </ZoomContext.Provider>
  );
}
