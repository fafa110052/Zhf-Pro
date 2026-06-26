import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SwiperBanner from '../components/SwiperBanner';
import WorkCard from '../components/WorkCard';
import { getHomepageConfig, getHotWorks } from '../api/works';

const QUICK_CATS = [
  { key: 'house_type', label: '户型', icon: '🏠', color: 'bg-blue-50 text-blue-600' },
  { key: 'area', label: '空间', icon: '🔨', color: 'bg-green-50 text-green-600' },
  { key: 'style', label: '风格', icon: '🎨', color: 'bg-amber-50 text-amber-600' },
];

export default function Home() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [hotWorks, setHotWorks] = useState([]);
  const [hotLoading, setHotLoading] = useState(true);
  const [hotError, setHotError] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const kw = searchInput.trim();
    if (kw) {
      navigate(`/category?q=${encodeURIComponent(kw)}`);
    } else {
      navigate('/category');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setHotLoading(true);
    setHotError(false);

    // 并行加载 banner 和热门作品
    const [bannerResult, hotResult] = await Promise.allSettled([
      getHomepageConfig().catch(() => null),
      getHotWorks(6).catch(() => null),
    ]);

    // Banner
    if (bannerResult.status === 'fulfilled' && bannerResult.value) {
      const data = bannerResult.value;
      setBanners(data.banner || []);
    }
    setLoading(false);

    // 热门作品
    if (hotResult.status === 'fulfilled' && hotResult.value) {
      setHotWorks(Array.isArray(hotResult.value) ? hotResult.value : []);
    } else {
      setHotError(true);
    }
    setHotLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-4 pb-4">
      {/* ─── Banner 轮播 ─── */}
      <SwiperBanner banners={banners} loading={loading} />

      {/* ─── 搜索栏 ─── */}
      <form onSubmit={handleSearch} className="px-4">
        <div className="flex items-center gap-2 bg-white rounded-full shadow-sm border border-gray-100 px-4 py-2">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索作品"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-300"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="text-gray-300 active:text-gray-500"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* ─── 快捷分类入口 ─── */}
      <div className="px-4">
        <div className="flex gap-3">
          {QUICK_CATS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => navigate(`/category?tab=${cat.key}`)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl active:scale-95 transition-transform ${cat.color}`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 热门作品 ─── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">热门推荐</h2>
          <button
            onClick={() => navigate('/category?sort=popular')}
            className="text-xs text-gray-400 active:text-gray-600"
          >
            查看更多 ›
          </button>
        </div>

        {/* 加载中：骨架屏 */}
        {hotLoading && (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-4/3 bg-gray-200 animate-pulse" />
                <div className="p-2.5 space-y-2">
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 加载失败 */}
        {!hotLoading && hotError && (
          <div className="text-center py-8" onClick={loadData}>
            <span className="text-gray-400 text-sm">加载失败，点击重试</span>
          </div>
        )}

        {/* 热门作品列表 */}
        {!hotLoading && !hotError && (
          <>
            {hotWorks.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {hotWorks.map((work) => (
                  <WorkCard key={work.id} work={work} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-3xl">📭</span>
                <p className="text-sm text-gray-400 mt-2">暂无热门作品</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
