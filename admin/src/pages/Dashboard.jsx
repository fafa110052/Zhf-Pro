import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import client from '../api/client';
import ErrorState from '../components/ErrorState';

// ─── Chart.js 注册 ───
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ─── 图表配色 ───
const COLORS = {
  blue: 'rgba(59, 130, 246, 0.8)',
  green: 'rgba(34, 197, 94, 0.8)',
  purple: 'rgba(139, 92, 246, 0.8)',
  orange: 'rgba(251, 146, 60, 0.8)',
  teal: 'rgba(45, 212, 191, 0.8)',
  pink: 'rgba(236, 72, 153, 0.8)',
  border: 'rgba(148, 163, 184, 0.3)',
};

const DISTRIBUTION_COLORS = [
  COLORS.blue, COLORS.green, COLORS.purple,
  COLORS.orange, COLORS.teal, COLORS.pink,
  'rgba(99, 102, 241, 0.8)',
  'rgba(245, 158, 11, 0.8)',
  'rgba(14, 165, 233, 0.8)',
  'rgba(239, 68, 68, 0.8)',
];

// ─── 图表通用配置 ───
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
  },
};

// ─── 空数据占位 ───
function EmptyChart({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-300">
      <span className="text-5xl mb-3">{icon}</span>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

// ─── 加载骨架屏 ───
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-6 bg-gray-200 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [avatarPending, setAvatarPending] = useState(0);
  const [constructionCount, setConstructionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [distTab, setDistTab] = useState('by_house_type');

  const distTabs = [
    { key: 'by_house_type', label: '户型' },
    { key: 'by_area', label: '面积' },
    { key: 'by_style', label: '风格' },
  ];

  // ─── 加载数据 ───
  const loadData = useCallback(async () => {
    try {
      const [ovRes, trRes, distRes, avRes, conRes] = await Promise.all([
        client.get('/admin/dashboard/overview'),
        client.get('/admin/dashboard/trends?months=12'),
        client.get('/admin/dashboard/distribution'),
        client.get('/admin/avatar-reviews?page_size=1').catch(() => ({ data: { pagination: { total: 0 } } })),
        client.get('/admin/material-orders', { params: { construction_status: 'in_progress', page_size: 1 } }).catch(() => ({ data: { pagination: { total: 0 } } })),
      ]);
      setOverview(ovRes.data);
      setTrends(trRes.data);
      setDistribution(distRes.data);
      setAvatarPending(avRes.data.pagination.total);
      setConstructionCount(conRes.data.pagination.total);
    } catch (err) {
      setError(err?.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── 错误态 ───
  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={() => { setError(''); setLoading(true); loadData(); }} />
        </div>
      </div>
    );
  }

  // ─── 加载态 ───
  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
              <div className="h-64 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = overview || {};
  const hasTrends = trends?.works_by_month?.length > 0;
  const hasDistribution = distribution?.by_house_type?.length > 0
    || distribution?.by_area?.length > 0
    || distribution?.by_style?.length > 0;

  // ─── 趋势柱状图数据 ───
  const trendChartData = hasTrends ? {
    labels: trends.works_by_month.map((m) => m.month),
    datasets: [
      {
        label: '新增作品',
        data: trends.works_by_month.map((m) => m.count),
        backgroundColor: COLORS.blue,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: '浏览量',
        data: trends.views_by_month.map((m) => m.views || 0),
        backgroundColor: COLORS.purple,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  } : null;

  // ─── 分布饼图数据 ───
  const distData = distribution?.[distTab] || [];
  const pieChartData = distData.length > 0 ? {
    labels: distData.map((d) => d.name),
    datasets: [{
      data: distData.map((d) => d.count),
      backgroundColor: DISTRIBUTION_COLORS.slice(0, distData.length),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  } : null;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ═══ 概览卡片 ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: '作品总数', value: stats.total_works, icon: '📋', color: 'bg-blue-50 text-blue-600' },
          { label: '设计师', value: stats.total_designers, icon: '👤', color: 'bg-green-50 text-green-600' },
          { label: '总浏览量', value: stats.total_views, icon: '👁️', color: 'bg-purple-50 text-purple-600' },
          { label: '施工中', value: constructionCount, icon: '🏗️', color: 'bg-amber-50 text-amber-600' },
          { label: '待审核', value: stats.pending_reviews, icon: '⏳', color: stats.pending_reviews > 0 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center space-x-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0 ${card.color}`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 truncate">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800 tabular-nums">
                {stats.total_works !== undefined ? card.value : '—'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ 图表区 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 月度趋势 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">
            📈 月度趋势
            <span className="ml-2 text-xs text-gray-400 font-normal">（近12个月）</span>
          </h3>
          <div className="h-72">
            {hasTrends ? (
              <Bar
                data={trendChartData}
                options={{
                  ...chartOptions,
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } }, grid: { color: '#f1f5f9' } },
                  },
                  interaction: { intersect: false, mode: 'index' },
                }}
              />
            ) : (
              <EmptyChart icon="📊" text="暂无趋势数据" />
            )}
          </div>
        </div>

        {/* 分类分布 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">
              🥧 分类分布
            </h3>
            {/* 维度 Tab */}
            <div className="flex p-0.5 bg-gray-100 rounded-lg">
              {distTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDistTab(tab.key)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    distTab === tab.key
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 flex items-center justify-center">
            {pieChartData ? (
              <Pie
                data={pieChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                          const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                          return ` ${ctx.label}: ${ctx.parsed} 个 (${pct}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            ) : (
              <EmptyChart icon="🥧" text="暂无分类数据" />
            )}
          </div>
        </div>
      </div>

      {/* ═══ 底部：最近作品 + 待审核 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 最近作品 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            🆕 最近发布
          </h3>
          {stats.recent_works?.length > 0 ? (
            <ul className="space-y-2">
              {stats.recent_works.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{w.title}</p>
                    <p className="text-xs text-gray-400">{w.designer_name || '未知'} · {w.created_at?.slice(0, 10)}</p>
                  </div>
                  <span className="text-xs text-gray-500">{w.view_count || 0} 次浏览</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyChart icon="📭" text="暂无作品" />
          )}
        </div>

        {/* 系统概况 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            📊 系统概况
          </h3>
          <div className="space-y-3">
            {[
              { label: '作品分类数', value: stats.total_categories },
              { label: '待审核头像', value: avatarPending, highlight: avatarPending > 0 },
              { label: '待审核作品', value: stats.pending_reviews, highlight: stats.pending_reviews > 0 },
              { label: '作品总数', value: stats.total_works },
              { label: '活跃设计师', value: stats.total_designers },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className={`text-sm font-semibold tabular-nums ${
                  item.highlight ? 'text-red-600' : 'text-gray-800'
                }`}>
                  {item.value ?? '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              数据更新时间：{new Date().toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
