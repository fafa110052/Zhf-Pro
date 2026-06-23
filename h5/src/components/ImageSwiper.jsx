import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { useZoomContext } from './ZoomProvider';
import 'swiper/css';
import 'swiper/css/pagination';

export default function ImageSwiper({ images, currentIndex, onIndexChange, coverImage }) {
  const navigate = useNavigate();
  const [previewIndex, setPreviewIndex] = useState(-1); // -1 = 关闭，>=0 = 显示第几张

  const openPreview = (idx) => setPreviewIndex(idx);
  const closePreview = () => setPreviewIndex(-1);

  // 无图片但有封面
  if ((!images || images.length === 0) && coverImage) {
    return (
      <>
        <div className="relative w-full aspect-4/3 bg-gray-900">
          <img
            src={coverImage}
            alt=""
            className="w-full h-full object-cover"
            onClick={() => openPreview(0)}
          />
          <BackButton onClick={() => navigate(-1)} />
        </div>
        <Lightbox
          images={[{ image_url: coverImage }]}
          currentIndex={0}
          open={previewIndex >= 0}
          onClose={closePreview}
          onIndexChange={setPreviewIndex}
        />
      </>
    );
  }

  // 完全没有图片
  if (!images || images.length === 0) {
    return (
      <div className="relative w-full aspect-4/3 bg-gray-100 flex items-center justify-center">
        <span className="text-5xl">🖼️</span>
        <BackButton onClick={() => navigate(-1)} />
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full aspect-4/3 bg-gray-900">
        <Swiper
          modules={[Pagination]}
          slidesPerView={1}
          pagination={images.length > 1 ? { type: 'fraction' } : false}
          onSlideChange={(swiper) => onIndexChange && onIndexChange(swiper.activeIndex)}
          className="w-full h-full"
        >
          {images.map((img, idx) => (
            <SwiperSlide key={img.id || idx}>
              <img
                src={img.image_url}
                alt=""
                className="w-full h-full object-cover"
                onClick={() => openPreview(idx)}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* 返回按钮 */}
        <BackButton onClick={() => navigate(-1)} />

        {/* 点击提示 */}
        <div
          className="absolute bottom-3 right-3 bg-black/40 text-white text-[10px] px-2 py-1 rounded-full active:bg-black/60 z-10"
          onClick={() => openPreview(currentIndex)}
        >
          🔍 点击查看大图
        </div>
      </div>

      {/* 全屏灯箱 */}
      <Lightbox
        images={images}
        currentIndex={previewIndex}
        open={previewIndex >= 0}
        onClose={closePreview}
        onIndexChange={setPreviewIndex}
      />
    </>
  );
}

/**
 * 全屏灯箱：当前页弹窗，不跳转
 * 支持左右滑动 + 双指缩放
 */
function Lightbox({ images, currentIndex, open, onClose, onIndexChange }) {
  const { setDisabled } = useZoomContext();

  useEffect(() => {
    setDisabled(open);
    return () => {
      if (open) setDisabled(false);
    };
  }, [open, setDisabled]);

  if (!open || !images.length) return null;

  return (
    <div className="fixed inset-0 z-200 bg-black flex flex-col">
      {/* 顶部操作栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe py-3">
        <span className="text-white/80 text-sm">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-lg active:bg-white/30"
        >
          ✕
        </button>
      </div>

      {/* 图片轮播 */}
      <div className="flex-1 flex items-center justify-center">
        <Swiper
          modules={[Pagination]}
          slidesPerView={1}
          initialSlide={currentIndex}
          onSlideChange={(swiper) => onIndexChange(swiper.activeIndex)}
          className="w-full h-full"
        >
          {images.map((img, idx) => (
            <SwiperSlide key={img.id || idx}>
              <div className="w-full h-full flex items-center justify-center overflow-auto">
                <ZoomableImage src={img.image_url} alt="" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-6 left-0 right-0 text-center pb-safe pointer-events-none">
        <span className="text-white/30 text-xs">双指缩放查看细节</span>
      </div>
    </div>
  );
}

/**
 * 灯箱内可缩放图片 — 使用 zoom 属性实现布局级缩放
 * 2 指捏合缩放（以当前尺寸为基础，最大 2x，最小 1x）
 * + 双击切换 1x/1.5x
 * 放大后单指拖动 = 原生滚动平移（overflow:auto 容器提供，支持上下左右）
 */
function ZoomableImage({ src, alt }) {
  const imgRef = useRef(null);
  const stateRef = useRef({
    scale: 1,
    lastTap: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchMidClientX: 0,   // 捏合起始双指中点（视口坐标）
    pinchMidClientY: 0,
    pinchImgLocalX: 0,    // 捏合起始时，手指指向的图片本地坐标（1x 基准）
    pinchImgLocalY: 0,
    pinchLocked: false,
  });

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const s = stateRef.current;
    // 容器是 img 的父级 div（overflow:auto 的那个）
    const container = img.parentElement;

    const getDist = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const applyZoom = (scale) => {
      s.scale = scale;
      img.style.zoom = scale;
      img.style.maxWidth = scale > 1.01 ? 'none' : '';
      img.style.maxHeight = scale > 1.01 ? 'none' : '';
    };

    // 捏合时：以手指中点为中心缩放
    const pinchZoom = (newScale, midClientX, midClientY) => {
      applyZoom(newScale);

      if (!container || newScale <= 1.01) return;

      const containerRect = container.getBoundingClientRect();
      const cw = containerRect.width;
      const ch = containerRect.height;
      const nw = img.naturalWidth || cw;
      const nh = img.naturalHeight || ch;

      // 图片居中后的左上角在容器内的位置（考虑滚动）
      const imgLeft = (cw - nw * newScale) / 2;
      const imgTop = (ch - nh * newScale) / 2;

      // 当前手指在容器内的位置
      const fx = midClientX - containerRect.left;
      const fy = midClientY - containerRect.top;

      // 让图片本地坐标 (pinchImgLocalX, pinchImgLocalY) 对齐到当前手指位置
      container.scrollLeft = imgLeft + s.pinchImgLocalX * newScale - fx;
      container.scrollTop = imgTop + s.pinchImgLocalY * newScale - fy;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.stopPropagation();
        s.pinchStartDist = getDist(e.touches[0], e.touches[1]);
        s.pinchStartScale = s.scale;

        // 记录手指中点和对应的图片本地坐标
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        s.pinchMidClientX = midX;
        s.pinchMidClientY = midY;

        // 计算当前手指指向的图片本地坐标（1x 基准）
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const cw = containerRect.width;
          const ch = containerRect.height;
          const nw = img.naturalWidth || cw;
          const nh = img.naturalHeight || ch;
          const curScale = s.scale;

          const imgLeft = (cw - nw * curScale) / 2;
          const imgTop = (ch - nh * curScale) / 2;
          const fx = midX - containerRect.left;
          const fy = midY - containerRect.top;

          s.pinchImgLocalX = (fx - imgLeft + container.scrollLeft) / curScale;
          s.pinchImgLocalY = (fy - imgTop + container.scrollTop) / curScale;
        }

        s.pinchLocked = true;
      } else if (e.touches.length === 1 && !s.pinchLocked) {
        const now = Date.now();
        if (now - s.lastTap < 300) {
          e.stopPropagation();
          e.preventDefault();

          if (s.scale > 1.05) {
            // 还原
            applyZoom(1);
            if (container) {
              container.scrollLeft = 0;
              container.scrollTop = 0;
            }
          } else {
            // 双击放大到 1.5x（以触摸点为中心）
            const touch = e.touches[0];
            if (container) {
              const containerRect = container.getBoundingClientRect();
              const cw = containerRect.width;
              const ch = containerRect.height;
              const nw = img.naturalWidth || cw;
              const nh = img.naturalHeight || ch;
              const oldScale = s.scale;

              // 手指在容器内的位置
              const fx = touch.clientX - containerRect.left;
              const fy = touch.clientY - containerRect.top;
              // 当前手指指向的图片本地坐标
              const imgLeft = (cw - nw * oldScale) / 2;
              const imgTop = (ch - nh * oldScale) / 2;
              const imgLocalX = (fx - imgLeft + container.scrollLeft) / oldScale;
              const imgLocalY = (fy - imgTop + container.scrollTop) / oldScale;

              applyZoom(1.5);

              // 缩放后对齐
              const newImgLeft = (cw - nw * 1.5) / 2;
              const newImgTop = (ch - nh * 1.5) / 2;
              container.scrollLeft = newImgLeft + imgLocalX * 1.5 - fx;
              container.scrollTop = newImgTop + imgLocalY * 1.5 - fy;
            } else {
              applyZoom(1.5);
            }
          }
          s.lastTap = 0;
          return;
        }
        s.lastTap = now;
        if (s.scale > 1.01) {
          e.stopPropagation();
        }
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && s.pinchStartDist > 0) {
        e.stopPropagation();
        e.preventDefault();
        const dist = getDist(e.touches[0], e.touches[1]);
        const ratio = dist / s.pinchStartDist;
        const newScale = Math.min(2, Math.max(1, s.pinchStartScale * ratio));
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinchZoom(newScale, midX, midY);
      } else if (s.scale > 1.01) {
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        s.pinchStartDist = 0;
        setTimeout(() => { s.pinchLocked = false; }, 100);
      }
    };

    img.addEventListener('touchstart', onTouchStart, { passive: false });
    img.addEventListener('touchmove', onTouchMove, { passive: false });
    img.addEventListener('touchend', onTouchEnd);
    img.addEventListener('touchcancel', onTouchEnd);

    return () => {
      img.removeEventListener('touchstart', onTouchStart);
      img.removeEventListener('touchmove', onTouchMove);
      img.removeEventListener('touchend', onTouchEnd);
      img.removeEventListener('touchcancel', onTouchEnd);
      img.style.zoom = '';
      img.style.maxWidth = '';
      img.style.maxHeight = '';
    };
  }, []);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className="max-w-full max-h-full object-contain"
    />
  );
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center text-xl leading-none active:bg-black/50 z-10"
    >
      ‹
    </button>
  );
}
