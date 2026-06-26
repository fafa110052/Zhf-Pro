import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoryTabs, { DIMENSION_TABS } from '../components/CategoryTabs';
import FilterBar from '../components/FilterBar';
import WorkCard from '../components/WorkCard';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getCategories, getWorks } from '../api/works';

// 维度 key → API 参数名
const DIMENSION_PARAM_MAP = {
  house_type: 'house_type_id',
  area: 'area_category_id',
  style: 'style_category_id',
};

// 维度显示信息
const DIMENSION_META = [
  { paramKey: 'house_type_id', catKey: 'house_type', label: '户型' },
  { paramKey: 'area_category_id', catKey: 'area', label: '空间' },
  { paramKey: 'style_category_id', catKey: 'style', label: '风格' },
];

export default function Category() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── 从 URL 读取预设参数（一次性消费） ──
  const [paramsConsumed, setParamsConsumed] = useState(false);

  // ── 状态 ──
  const [activeTabKey, setActiveTabKey] = useState('house_type');
  const [categoryMap, setCategoryMap] = useState({});
  const [categoryError, setCategoryError] = useState(false);
  const [selected, setSelected] = useState({
    house_type_id: null,
    area_category_id: null,
    style_category_id: null,
  });
  const [sortBy, setSortBy] = useState('newest');
  const [keyword, setKeyword] = useState('');

  const [works, setWorks] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // 用 ref 存最新值，避免 loadWorks 的 useCallback 依赖变化
  const selectedRef = useRef(selected);
  const sortByRef = useRef(sortBy);
  const keywordRef = useRef(keyword);
  selectedRef.current = selected;
  sortByRef.current = sortBy;
  keywordRef.current = keyword;

  // ── 消费 URL 预设参数（仅一次） ──
  useEffect(() => {
    if (paramsConsumed) return;
    const tab = searchParams.get('tab');
    const sort = searchParams.get('sort');
    const kw = searchParams.get('keyword') || searchParams.get('q');

    let changed = false;
    if (tab && DIMENSION_TABS.find((t) => t.key === tab)) {
      setActiveTabKey(tab);
      changed = true;
    }
    if (sort === 'newest' || sort === 'popular') {
      setSortBy(sort);
      changed = true;
    }
    if (kw) {
      setKeyword(kw);
      setSearchInput(kw);
      changed = true;
    }

    // 清除 URL 参数（一次性消费）
    if (changed) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tab');
      newParams.delete('sort');
      newParams.delete('keyword');
      newParams.delete('q');
      setSearchParams(newParams, { replace: true });
    }
    setParamsConsumed(true);
  }, [searchParams, paramsConsumed, setSearchParams]);

  // ── 加载分类 ──
  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      if (!data || Object.keys(data).length === 0) {
        throw new Error('分类数据为空');
      }
      setCategoryMap(data);
      setCategoryError(false);
      return data;
    } catch (err) {
      console.error('加载分类失败:', err);
      setCategoryError(true);
      return null;
    }
  }, []);

  // ── 加载作品 ──
  const loadWorks = useCallback(
    async (reset, overrideParams = {}) => {
      const s = overrideParams.selected ?? selectedRef.current;
      const sort = overrideParams.sortBy ?? sortByRef.current;
      const kw = overrideParams.keyword ?? keywordRef.current;

      const currentPage = reset ? 1 : page;

      if (reset) {
        setLoading(true);
        setWorks([]);
        setPage(1);
        setError(false);
      }

      try {
        const params = {
          page: currentPage,
          page_size: 12,
          sort_by: sort,
        };

        if (kw) params.keyword = kw;
        if (s.house_type_id) params.house_type_id = s.house_type_id;
        if (s.area_category_id) params.area_category_id = s.area_category_id;
        if (s.style_category_id) params.style_category_id = s.style_category_id;

        const result = await getWorks(params);
        const list = result.list || [];
        const pagination = result.pagination || {};

        if (reset) {
          setWorks(list);
          setPage(pagination.page || 1);
          setTotalPages(pagination.total_pages || 1);
          setTotalCount(pagination.total ?? null);
          setLoading(false);
          setHasMore((pagination.page || 1) < (pagination.total_pages || 1));
        } else {
          setWorks((prev) => [...prev, ...list]);
          setPage(pagination.page || currentPage);
          setTotalPages(pagination.total_pages || 1);
          setTotalCount(pagination.total ?? null);
          setLoadingMore(false);
          setHasMore((pagination.page || currentPage) < (pagination.total_pages || 1));
        }
      } catch (err) {
        console.error('加载作品失败:', err);
        if (reset) {
          setLoading(false);
          setError(true);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [page]
  );

  // ── 初始加载 ──
  useEffect(() => {
    if (!paramsConsumed) return;
    const init = async () => {
      await loadCategories();
      loadWorks(true);
    };
    init();
  }, [paramsConsumed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 无限滚动 ──
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [loadingMore, hasMore]);

  // loadMore 触发后 page 变化 → 调用 loadWorks(false)
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (page > 1 && page !== prevPageRef.current) {
      prevPageRef.current = page;
      loadWorks(false);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const sentinelRef = useInfiniteScroll(loadMore, { hasMore, loading: loadingMore });

  // ── 交互处理 ──

  // 切换维度 Tab
  const handleTabChange = (key) => {
    if (key === activeTabKey) return;
    setActiveTabKey(key);
  };

  // 点击标签
  const handleTagTap = (tagId) => {
    const paramKey = DIMENSION_PARAM_MAP[activeTabKey];
    const newSelected = { ...selectedRef.current };
    if (newSelected[paramKey] === tagId) {
      newSelected[paramKey] = null;
    } else {
      newSelected[paramKey] = tagId;
    }
    setSelected(newSelected);
    loadWorks(true, { selected: newSelected });
  };

  // 切换排序
  const handleSortChange = (sort) => {
    if (sort === sortBy) return;
    setSortBy(sort);
    loadWorks(true, { sortBy: sort });
  };

  // 移除单个筛选
  const handleRemoveFilter = (paramKey) => {
    const newSelected = { ...selectedRef.current };
    newSelected[paramKey] = null;
    setSelected(newSelected);
    loadWorks(true, { selected: newSelected });
  };

  // 清除搜索
  const handleClearKeyword = () => {
    setKeyword('');
    setSearchInput('');
    loadWorks(true, { keyword: '' });
  };

  // 清除全部
  const handleClearAll = () => {
    const empty = { house_type_id: null, area_category_id: null, style_category_id: null };
    setSelected(empty);
    setSortBy('newest');
    setKeyword('');
    setSearchInput('');
    loadWorks(true, { selected: empty, sortBy: 'newest', keyword: '' });
  };

  // 搜索提交 — 同步到 URL 参数
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const kw = searchInput.trim();
    setKeyword(kw);

    // 更新浏览器地址栏（不刷新页面）
    const newParams = new URLSearchParams(searchParams);
    if (kw) {
      newParams.set('q', kw);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams, { replace: true });

    loadWorks(true, { keyword: kw });
  };

  // 重试
  const handleRetry = () => {
    setError(false);
    setLoading(true);
    loadWorks(true);
  };

  // ── 计算当前标签列表 ──
  const paramKey = DIMENSION_PARAM_MAP[activeTabKey];
  const rawTags = categoryMap[activeTabKey] || [];
  const activeTags = rawTags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    selected: selected[paramKey] === tag.id,
  }));

  // ── 计算已选筛选条件 ──
  const selectedFilters = DIMENSION_META
    .filter((dim) => selected[dim.paramKey])
    .map((dim) => {
      const cats = categoryMap[dim.catKey] || [];
      const found = cats.find((c) => c.id === selected[dim.paramKey]);
      return {
        paramKey: dim.paramKey,
        catKey: dim.catKey,
        name: found ? found.name : String(selected[dim.paramKey]),
        dimLabel: dim.label,
      };
    });

  return (
    <div className="flex flex-col min-h-full">
      {/* ── 搜索栏 ── */}
      <form onSubmit={handleSearchSubmit} className="px-4 pt-3 pb-2">
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
              onClick={() => {
                setSearchInput('');
                if (keyword) handleClearKeyword();
              }}
              className="text-gray-300 active:text-gray-500"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* ── 维度 Tab ── */}
      <CategoryTabs activeKey={activeTabKey} onChange={handleTabChange} />

      {/* ── 筛选条 ── */}
      <FilterBar
        keyword={keyword}
        selectedFilters={selectedFilters}
        sortBy={sortBy}
        totalCount={totalCount}
        onSortChange={handleSortChange}
        onRemoveFilter={handleRemoveFilter}
        onClearKeyword={handleClearKeyword}
        onClearAll={handleClearAll}
      />

      {/* ── 标签云 ── */}
      {!categoryError && rawTags.length > 0 && (
        <div className="flex overflow-x-auto gap-2 px-4 py-2.5 bg-white border-b border-gray-50 no-scrollbar">
          {activeTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagTap(tag.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                tag.selected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* ── 作品列表 ── */}
      <div className="flex-1 px-4 pt-3 pb-4">
        {/* 首次加载中 */}
        {loading && (
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
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16" onClick={handleRetry}>
            <span className="text-4xl">⚠️</span>
            <p className="text-sm text-gray-400 mt-3">加载失败</p>
            <p className="text-xs text-gray-300 mt-1">点击重试</p>
          </div>
        )}

        {/* 作品网格 */}
        {!loading && !error && (
          <>
            {works.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {works.map((work) => (
                    <WorkCard key={work.id} work={work} />
                  ))}
                </div>

                {/* 加载更多中 */}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <span className="text-xs text-gray-400">加载中...</span>
                  </div>
                )}

                {/* 到底了 */}
                {!hasMore && (
                  <p className="text-center text-xs text-gray-300 py-6">
                    已经到底了
                  </p>
                )}

                {/* 无限滚动哨兵 */}
                <div ref={sentinelRef} className="h-1" />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="text-4xl">🔍</span>
                <p className="text-sm text-gray-400 mt-3">暂无作品</p>
                <p className="text-xs text-gray-300 mt-1">换个筛选条件试试</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
