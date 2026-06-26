import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export default function ImageSwiper({ images, currentIndex, onIndexChange, coverImage }) {
  const navigate = useNavigate();

  // 无图片但有封面
  if ((!images || images.length === 0) && coverImage) {
    return (
      <div className="relative w-full aspect-4/3 bg-gray-900">
        <img
          src={coverImage}
          alt=""
          className="w-full h-full object-cover"
        />
        <BackButton onClick={() => navigate(-1)} />
      </div>
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
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* 返回按钮 */}
      <BackButton onClick={() => navigate(-1)} />
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
