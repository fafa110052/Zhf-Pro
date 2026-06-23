import { useEffect, useRef } from 'react';

/**
 * 双击缩放：双击放大到 2x（以触摸点为中心），再次双击还原
 */
export default function useDoubleTapZoom() {
  const lastTap = useRef(0);
  const zoomed = useRef(false);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    let tapTimer = null;

    const handleTouchEnd = (e) => {
      const now = Date.now();
      const touch = e.changedTouches[0];
      if (!touch) return;

      if (now - lastTap.current < 300 && tapTimer) {
        // 双击
        clearTimeout(tapTimer);
        tapTimer = null;
        lastTap.current = 0;

        const x = touch.clientX;
        const y = touch.clientY;

        if (zoomed.current) {
          // 还原
          root.style.transform = '';
          root.style.transformOrigin = '';
          root.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          zoomed.current = false;
        } else {
          // 放大 2x，中心为触摸点
          root.style.transformOrigin = `${x}px ${y}px`;
          root.style.transform = 'scale(2)';
          root.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          zoomed.current = true;
        }
      } else {
        // 第一次点击
        lastTap.current = now;
        // 300ms 内无第二次点击 → 当作单击，重置计时器
        if (tapTimer) clearTimeout(tapTimer);
        tapTimer = setTimeout(() => {
          tapTimer = null;
        }, 300);
      }
    };

    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => document.removeEventListener('touchend', handleTouchEnd);
  }, []);
}
