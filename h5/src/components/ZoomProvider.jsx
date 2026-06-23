import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const MAX_SCALE = 2;
const DOUBLE_TAP_SCALE = 1.5;

/**
 * Context：让子组件（如 Lightbox）可以禁用 ZoomProvider
 */
const ZoomContext = createContext({ disabled: false, setDisabled: () => {} });
export const useZoomContext = () => useContext(ZoomContext);

/**
 * 手势缩放容器 — 接管捏合与双击缩放，兼容微信内置浏览器
 *
 * 缩放原理：
 *   使用 CSS zoom 属性改变 #root 布局尺寸 → 浏览器自动产生滚动条
 *   捏合/双击时同步调整 scroll 位置，使缩放始终以手指位置为中心
 *
 * - 捏合：以当前尺寸为基础，最大 2x，最小 1x（保持原始尺寸）
 * - 双击：1.5x / 还原，以触摸点为中心
 * - 放大后：原生滚动实现上下左右拖动
 */
export default function ZoomProvider({ children }) {
  const [disabled, setDisabled] = useState(false);
  const disabledRef = useRef(false);

  const setDisabledWrapped = useCallback((v) => {
    disabledRef.current = v;
    setDisabled(v);
  }, []);

  const stateRef = useRef({
    scale: 1,
    lastTapTime: 0,
    // 捏合状态
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchCenterX: 0,      // 捏合起始时双指中点（屏幕坐标）
    pinchCenterY: 0,
    pinchStartScrollX: 0, // 捏合起始时的滚动位置
    pinchStartScrollY: 0,
    pinchLocked: false,
    // 双击还原动画定时器
    animTimer: null,
  });

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const s = stateRef.current;

    // ── 清除动画残留 ──
    const cancelAnim = () => {
      if (s.animTimer) {
        clearTimeout(s.animTimer);
        s.animTimer = null;
      }
      root.style.transition = 'none';
      root.style.transform = '';
      root.style.transformOrigin = '';
    };

    // ── 确保放大后有足够的纵向滚动空间 ──
    const setMinHeight = (scale) => {
      root.style.minHeight = scale > 1.01 ? '100vh' : '';
    };

    // ── 应用缩放 + 调整滚动使目标文档坐标保持在目标屏幕位置 ──
    // docX/docY: 需要保持不动的文档坐标（1x 基准）
    // screenX/screenY: 该文档坐标应出现的屏幕位置
    const applyScaleWithAnchor = (newScale, docX, docY, screenX, screenY) => {
      cancelAnim();
      s.scale = newScale;
      root.style.zoom = newScale;
      setMinHeight(newScale);
      window.scrollTo(
        docX * newScale - screenX,
        docY * newScale - screenY,
      );
    };

    // ── 文档坐标：将屏幕坐标转为 1x 基准的文档坐标 ──
    const toDocCoords = (clientX, clientY) => ({
      x: (clientX + window.scrollX) / s.scale,
      y: (clientY + window.scrollY) / s.scale,
    });

    // ── 双击放大（1.5x，以触摸点为中心）──
    const zoomIn = (clientX, clientY) => {
      const doc = toDocCoords(clientX, clientY);
      applyScaleWithAnchor(DOUBLE_TAP_SCALE, doc.x, doc.y, clientX, clientY);
    };

    // ── 双击还原 ──
    const zoomOut = () => {
      cancelAnim();
      s.scale = 1;
      setMinHeight(1);
      root.style.transition = `zoom 350ms cubic-bezier(0.25,0.46,0.45,0.94)`;
      root.style.zoom = 1;
      window.scrollTo(0, 0);

      s.animTimer = setTimeout(() => {
        root.style.transition = 'none';
        s.animTimer = null;
      }, 350);
    };

    const getDist = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e) => {
      if (disabledRef.current) return;

      if (e.touches.length === 2) {
        // ── 捏合开始：记录初始距离、缩放、双指中点、滚动位置 ──
        s.pinchStartDist = getDist(e.touches[0], e.touches[1]);
        s.pinchStartScale = s.scale;
        s.pinchStartScrollX = window.scrollX;
        s.pinchStartScrollY = window.scrollY;
        s.pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        s.pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        s.pinchLocked = true;
      } else if (e.touches.length === 1 && !s.pinchLocked) {
        const now = Date.now();
        const touch = e.touches[0];

        if (now - s.lastTapTime < 300) {
          e.preventDefault();

          if (s.scale > 1.05) {
            zoomOut();
          } else {
            zoomIn(touch.clientX, touch.clientY);
          }

          s.lastTapTime = 0;
        } else {
          s.lastTapTime = now;
        }
      }
    };

    const onTouchMove = (e) => {
      if (disabledRef.current) return;

      if (e.touches.length === 2 && s.pinchStartDist > 0) {
        e.preventDefault();

        const dist = getDist(e.touches[0], e.touches[1]);
        const ratio = dist / s.pinchStartDist;
        const newScale = Math.min(MAX_SCALE, Math.max(1, s.pinchStartScale * ratio));

        // 当前双指中点（屏幕坐标）
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        // 捏合起始时，双指中点对应的文档坐标（1x 基准）
        const docX = (s.pinchCenterX + s.pinchStartScrollX) / s.pinchStartScale;
        const docY = (s.pinchCenterY + s.pinchStartScrollY) / s.pinchStartScale;

        // 让该文档坐标始终出现在当前双指中点位置
        applyScaleWithAnchor(newScale, docX, docY, midX, midY);
      }
    };

    const onTouchEnd = (e) => {
      if (disabledRef.current) return;

      if (e.touches.length === 0) {
        s.pinchStartDist = 0;
        setTimeout(() => {
          s.pinchLocked = false;
        }, 100);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    return () => {
      cancelAnim();
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      root.style.zoom = '';
      root.style.transform = '';
      root.style.transformOrigin = '';
      root.style.transition = '';
      root.style.minHeight = '';
    };
  }, []);

  return (
    <ZoomContext.Provider value={{ disabled, setDisabled: setDisabledWrapped }}>
      {children}
    </ZoomContext.Provider>
  );
}
