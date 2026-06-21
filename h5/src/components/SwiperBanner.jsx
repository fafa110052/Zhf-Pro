import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export default function SwiperBanner({ banners, loading }) {
  const navigate = useNavigate();

  // 加载中：骨架屏
  if (loading) {
    return (
      <div className="w-full aspect-16/9 bg-gray-200 animate-pulse rounded-lg" />
    );
  }

  // 无数据
  if (!banners || banners.length === 0) {
    return null;
  }

  const handleBannerTap = (banner) => {
    const link = banner.config_value?.link || banner.link;
    // 纯数字链接 → 跳作品详情
    if (link && /^\d+$/.test(String(link))) {
      navigate(`/work/${link}`);
    }
    // 外部链接和内部路径暂时不处理
  };

  return (
    <div className="w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        slidesPerView={1}
        loop={banners.length > 1}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className="rounded-lg overflow-hidden"
      >
        {banners.map((banner, idx) => {
          const config = banner.config_value || banner;
          return (
            <SwiperSlide key={banner.id || idx}>
              <div
                className="relative w-full aspect-16/9 cursor-pointer"
                onClick={() => handleBannerTap(banner)}
              >
                <img
                  src={config.image_url}
                  alt={config.title || ''}
                  className="w-full h-full object-cover"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
                {config.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                    <span className="text-white text-sm font-medium">
                      {config.title}
                    </span>
                  </div>
                )}
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
