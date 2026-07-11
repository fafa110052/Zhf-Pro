import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

/**
 * 运营数据 — 首页展示的经营数字与价值主张
 *
 * 复用 homepage_config 的 stats 类型（config_value: { families, works, slogan }）。
 * 小程序首页读取此配置渲染「服务业主 / 设计案例 / 价值主张」三项。
 */

// 无配置时的默认展示值
const DEFAULTS = { families: '500+', works: '1200+', slogan: '匠心工艺·品质交付' };

export default function OperationData() {
  const toast = useToast();

  const [statId, setStatId] = useState(null);
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/settings', { params: { type: 'stats' } });
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        const cfg = list[0].config_value || {};
        setStatId(list[0].id);
        setForm({
          families: cfg.families ?? DEFAULTS.families,
          works: cfg.works ?? DEFAULTS.works,
          slogan: cfg.slogan ?? DEFAULTS.slogan,
        });
      } else {
        setStatId(null);
        setForm(DEFAULTS);
      }
    } catch (err) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.families.trim() || !form.works.trim() || !form.slogan.trim()) {
      toast.error('三项内容都不能为空');
      return;
    }
    setSaving(true);
    try {
      const config_value = {
        families: form.families.trim(),
        works: form.works.trim(),
        slogan: form.slogan.trim(),
      };
      if (statId) {
        await client.put(`/admin/settings/${statId}`, { config_value });
      } else {
        const res = await client.post('/admin/settings', { config_type: 'stats', config_value });
        if (res.data?.id) setStatId(res.data.id);
      }
      toast.success('运营数据已保存');
      fetchData();
    } catch (err) {
      toast.error(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 页头 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-lg font-bold text-gray-900">运营数据</h2>
        <p className="text-sm text-gray-500 mt-0.5">配置小程序首页展示的经营数字与价值主张</p>
      </div>

      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      )}

      {/* ─── 编辑卡片 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            {/* 合规提示 */}
            <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 rounded-lg text-xs text-blue-700 leading-relaxed">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>请填写真实、可举证的经营数据，避免使用"最""第一""100%好评"等无法核实的绝对化表述，以符合《广告法》与平台审核要求。</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">累计服务业主</label>
                <input value={form.families} onChange={(e) => setForm({ ...form, families: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={16} placeholder="如：500+" />
                <p className="text-xs text-gray-400 mt-1">首页展示为「{form.families || '—'} 服务业主」</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设计案例</label>
                <input value={form.works} onChange={(e) => setForm({ ...form, works: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={16} placeholder="如：1200+" />
                <p className="text-xs text-gray-400 mt-1">首页展示为「{form.works || '—'} 设计案例」</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">价值主张</label>
              <input value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={24} placeholder="如：匠心工艺·品质交付" />
              <p className="text-xs text-gray-400 mt-1">第三项展示一句价值主张短语，替代量化的好评率承诺</p>
            </div>

            {/* 预览 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">首页效果预览</label>
              <div className="flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100">
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-700">{form.families || '—'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">服务业主</div>
                </div>
                <div className="text-amber-200">·</div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-700">{form.works || '—'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">设计案例</div>
                </div>
                <div className="text-amber-200">·</div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-amber-700 max-w-32">{form.slogan || '—'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
