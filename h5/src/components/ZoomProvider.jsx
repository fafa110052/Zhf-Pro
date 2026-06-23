import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const MAX_SCALE = 2;
const DOUBLE_TAP_SCALE = 1.5;
const ANIM_DURATION = 350;

/**
 * Context：让子组件（如 Lightbox）可以禁用 ZoomProvider
 */
const ZoomContext = createContext({ disabled: false, setDisabled: () => {} });
export const useZoomContext = () => useContext(ZoomContext);

/**
 * 手势缩放容器 — 接管捏合与双击缩放，兼容微信内置浏览器
 *
 * 核心思路：
 *   zoom 是"真相"——决定页面实际缩放和滚动
 *   transform 是"动画皮"——只在动画播放时覆盖视觉效果
 *
 *   放大：zoom 瞬间到位 → transform 从 scale(1/target) 动画到 scale(1) 做出放大效果
 *   缩小：zoom 过渡回 1x
 *   捏合：以当前尺寸为基础实时跟随，最大 2x，最小 1x（保持原始尺寸）
 *
 * 放大后 #root 设 min-height:100vh 确保内容高度足够产生纵向滚动，
 * 配合原生 window.scroll 实现上下左右任意方向拖动。
 *
 * 当子组件通过 useZoomContext().setDisabled(true) 禁用时，
 * 所有触摸处理跳过，让子组件自行管理缩放（如 Lightbox 全屏预览）。
 */
export default function ZoomProvider({ children }) {
  const [disabled, setDisabled] = useState(false);
  const disabledRef = useRef(false); // 事件回调中读 ref 避免闭包过期

  const setDisabledWrapped = useCallback((v) => {
    disabledRef.current = v;
    setDisabled(v);
  }, []);

  const stateRef = useRef({
    scale: 1,
    lastTapTime: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchLocked: false,
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

    // ── 捏合：zoom 实时跟随（以当前尺寸为基础） ──
    const pinchTo = (scale) => {
      cancelAnim();
      s.scale = scale;
      root.style.zoom = scale;
      setMinHeight(scale);
    };

    // ── 双击放大（1.5x）──
    // zoom 瞬间到位（保证状态稳定），transform 做视觉动画
    const zoomIn = (clientX, clientY) => {
      cancelAnim();

      const oldScale = s.scale;
      const targetScale = DOUBLE_TAP_SCALE;

      // 触摸点在文档中的坐标（1x 基准）
      const docX = (clientX + window.scrollX) / oldScale;
      const docY = (clientY + window.scrollY) / oldScale;

      // Step 1: zoom 瞬间到位
      s.scale = targetScale;
      root.style.zoom = targetScale;
      setMinHeight(targetScale);

      // Step 2: 滚动使触摸点保持在原位
      window.scrollTo(
        docX * targetScale - clientX,
        docY * targetScale - clientY,
      );

      // Step 3: 盖一层 transform 动画——从视觉 oldScale 过渡到 targetScale
      const startScale = oldScale / targetScale;
      root.style.transformOrigin = `${docX}px ${docY}px`;
      root.style.transform = `scale(${startScale})`;
      root.style.transition = 'none';

      // 强制渲染初始帧
      void root.offsetHeight;

      // 启动动画
      root.style.transition = `transform ${ANIM_DURATION}ms cubic-bezier(0.25,0.46,0.45,0.94)`;
      root.style.transform = 'scale(1)';

      // 动画结束后清理
      s.animTimer = setTimeout(() => {
        root.style.transition = 'none';
        root.style.transform = '';
        root.style.transformOrigin = '';
        s.animTimer = null;
      }, ANIM_DURATION);
    };

    // ── 双击还原 ──
    const zoomOut = () => {
      cancelAnim();
      s.scale = 1;
      setMinHeight(1);
      // ⚠️ 先设 transition 再改 zoom，否则浏览器不会触发过渡动画
      root.style.transition = `zoom ${ANIM_DURATION}ms cubic-bezier(0.25,0.46,0.45,0.94)`;
      root.style.zoom = 1;
      window.scrollTo(0, 0);

      s.animTimer = setTimeout(() => {
        root.style.transition = 'none';
        s.animTimer = null;
      }, ANIM_DURATION);
    };

    const getDist = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e) => {
      if (disabledRef.current) return;

      if (e.touches.length === 2) {
        s.pinchStartDist = getDist(e.touches[0], e.touches[1]);
        s.pinchStartScale = s.scale;
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
        pinchTo(newScale);
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
  }, []); // disabledRef 在回调中通过 ref 读取，不需要重绑事件

  return (
    <ZoomContext.Provider value={{ disabled, setDisabled: setDisabledWrapped }}>
      {children}
    </ZoomContext.Provider>
  );
}
