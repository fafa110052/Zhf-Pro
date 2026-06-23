import { useEffect, useRef } from 'react';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * 手势缩放容器 — 接管捏合与双击缩放，兼容微信内置浏览器
 *
 * 原理：监听 touch 事件，计算缩放比例并应用到 #root 的 zoom 属性。
 *       zoom 改变元素布局尺寸 → 页面自动出现滚动条。
 *       双击 → 以触摸点为中心放大，再次双击 → 还原。
 */
export default function ZoomProvider({ children }) {
  const stateRef = useRef({
    scale: 1,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchLocked: false,
  });

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const applyScale = (s, animate) => {
      stateRef.current.scale = s;
      root.style.zoom = s;
      root.style.transition = animate ? 'zoom 0.35s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
    };

    const getDist = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e) => {
      const s = stateRef.current;

      if (e.touches.length === 2) {
        // ── 捏合开始 ──
        s.pinchStartDist = getDist(e.touches[0], e.touches[1]);
        s.pinchStartScale = s.scale;
        s.pinchLocked = true; // 锁住，避免 touchend 误判双击
      } else if (e.touches.length === 1 && !s.pinchLocked) {
        // ── 双击检测 ──
        const now = Date.now();
        const touch = e.touches[0];

        if (now - s.lastTapTime < 300) {
          // 双击
          e.preventDefault();

          if (s.scale > 1.05) {
            // 还原
            applyScale(1, true);
            window.scrollTo(0, 0);
          } else {
            // 放大
            applyScale(DOUBLE_TAP_SCALE, true);
            // 滚动使触摸点居中
            requestAnimationFrame(() => {
              window.scrollTo(
                touch.clientX * DOUBLE_TAP_SCALE - window.innerWidth / 2,
                touch.clientY * DOUBLE_TAP_SCALE - window.innerHeight / 2
              );
            });
          }

          s.lastTapTime = 0;
        } else {
          s.lastTapTime = now;
          s.lastTapX = touch.clientX;
          s.lastTapY = touch.clientY;
        }
      }
    };

    const onTouchMove = (e) => {
      const s = stateRef.current;

      if (e.touches.length === 2 && s.pinchStartDist > 0) {
        // ── 捏合中 ──
        e.preventDefault();
        const dist = getDist(e.touches[0], e.touches[1]);
        const ratio = dist / s.pinchStartDist;
        const newScale = Math.min(MAX_SCALE, Math.max(1, s.pinchStartScale * ratio));
        applyScale(newScale, false);
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        // 重置捏合状态
        stateRef.current.pinchStartDist = 0;
        // 延迟解除锁定，避免 touchend → touchstart 的时序问题
        setTimeout(() => { stateRef.current.pinchLocked = false; }, 50);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      root.style.zoom = '';
      root.style.transition = '';
    };
  }, []);

  return children;
}
