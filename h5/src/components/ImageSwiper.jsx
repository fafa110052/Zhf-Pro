import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export default function ImageSwiper({ images, currentIndex, onIndexChange, coverImage }) {
  const navigate = useNavigate();
  const [previewIndex, setPreviewIndex] = useState(-1);

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

        <BackButton onClick={() => navigate(-1)} />

        {/* 点击查看大图 */}
        <div
          className="absolute bottom-3 right-3 bg-black/40 text-white text-[10px] px-2 py-1 rounded-full active:bg-black/60 z-10"
          onClick={() => openPreview(currentIndex || 0)}
        >
          🔍 查看大图
        </div>
      </div>

      {/* 全屏大图 — 浏览器原生缩放 */}
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
 * 全屏大图弹窗 — 可左右滑动，缩放由浏览器原生手势处理
 */
function Lightbox({ images, currentIndex, open, onClose, onIndexChange }) {
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

      {/* 图片轮播 — 原生缩放 */}
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
                <img
                  src={img.image_url}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
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
