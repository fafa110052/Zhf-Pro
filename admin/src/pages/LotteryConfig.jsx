import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

// ── 图片位定义（含尺寸标注）──
const IMAGE_SLOTS = [
  { key: 'banner_1', label: '轮播图 1', size: '640×400', ratio: '8:5（宽高比 1.6）' },
  { key: 'banner_2', label: '轮播图 2', size: '640×400', ratio: '8:5（宽高比 1.6）' },
  { key: 'banner_3', label: '轮播图 3', size: '640×400', ratio: '8:5（宽高比 1.6）' },
  { key: 'prize_show', label: '奖品展示图', size: '640×1386', ratio: '≈1:2.2（竖长图）' },
  { key: 'gallery_1', label: '图库 1', size: '750×1334', ratio: '9:16（手机全屏）' },
  { key: 'gallery_2', label: '图库 2', size: '750×1334', ratio: '9:16（手机全屏）' },
  { key: 'gallery_3', label: '图库 3', size: '750×1334', ratio: '9:16（手机全屏）' },
  { key: 'info_nav', label: '导航信息卡', size: '640×320', ratio: '2:1' },
  { key: 'info_phone', label: '电话信息卡', size: '640×320', ratio: '2:1（参考 info_nav）' },
  { key: 'ad_popup', label: '开屏广告', size: '750×1334', ratio: '9:16（手机全屏）' },
  { key: 'share_ad', label: '分享广告图', size: '500×400', ratio: '5:4' },
  { key: 'share_logo', label: '分享 Logo', size: '200×200', ratio: '1:1（正方形）' },
  { key: 'card_1', label: '集卡图 1', size: '532×101', ratio: '≈5:1（横条）' },
  { key: 'card_2', label: '集卡图 2', size: '532×91', ratio: '≈6:1（横条）' },
  { key: 'card_3', label: '集卡图 3', size: '532×86', ratio: '≈6:1（横条）' },
  { key: 'vip_prize', label: 'VIP 奖品图', size: '640×320', ratio: '2:1' },
];

// ── Tab 定义 ──
const TABS = [
  { id: 'basic', label: '基础信息' },
  { id: 'prizes', label: '奖品管理' },
  { id: 'records', label: '中奖记录' },
  { id: 'users', label: '用户列表' },
  { id: 'images', label: '图片素材' },
  { id: 'consultant', label: '顾问信息' },
];

const STATUS_MAP = {
  0: { label: '未领取', cls: 'bg-yellow-100 text-yellow-700' },
  1: { label: '已领取', cls: 'bg-green-100 text-green-700' },
  2: { label: '已失效', cls: 'bg-gray-100 text-gray-500' },
};

const PRIZE_TYPE_MAP = {
  physical: { label: '实物', cls: 'bg-blue-100 text-blue-700' },
  virtual: { label: '虚拟', cls: 'bg-purple-100 text-purple-700' },
  thanks: { label: '谢谢参与', cls: 'bg-gray-100 text-gray-500' },
};

const EMPTY_PRIZE = { name: '', image: '', prize_type: 'physical', probability: '', total_stock: '', is_vip: 0 };

export default function LotteryConfig() {
  const toast = useToast();

  // ── 通用状态 ──
  const [tab, setTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Tab 1：基础信息 ──
  const [textConfigs, setTextConfigs] = useState({});
  const [savingText, setSavingText] = useState(false);

  // ── Tab 2：奖品管理 ──
  const [prizes, setPrizes] = useState([]);
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [prizeModalMode, setPrizeModalMode] = useState('add');
  const [prizeForm, setPrizeForm] = useState(EMPTY_PRIZE);
  const [prizeSubmitting, setPrizeSubmitting] = useState(false);
  const [prizeConfirm, setPrizeConfirm] = useState({ open: false, id: null });

  // ── Tab 3：中奖记录 ──
  const [records, setRecords] = useState([]);
  const [recPagination, setRecPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [recLoading, setRecLoading] = useState(false);
  const [recStatus, setRecStatus] = useState('');
  const [recKeyword, setRecKeyword] = useState('');
  const [recStartDate, setRecStartDate] = useState('');
  const [recEndDate, setRecEndDate] = useState('');

  // ── Tab 4：用户列表 ──
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [userLoading, setUserLoading] = useState(false);
  const [userKeyword, setUserKeyword] = useState('');

  // ── Tab 5：图片素材 ──
  const [imageConfigs, setImageConfigs] = useState({});
  const [uploadingKey, setUploadingKey] = useState('');

  // ── Tab 6：顾问信息 ──
  const [consultant, setConsultant] = useState({ name: '', phone: '', avatar: '', qrcode: '', contact_qr: '' });
  const [consultantSaving, setConsultantSaving] = useState(false);

  // ── 统计卡片 ──
  const [stats, setStats] = useState({ today_users: 0, today_wins: 0, total_wins: 0, total_users: 0, remaining_stock: 0 });

  // ========================================================
  // 数据加载
  // ========================================================

  const fetchStats = useCallback(async () => {
    try {
      const res = await client.get('/admin/lottery/stats');
      setStats(res.data);
    } catch { /* 忽略 */ }
  }, []);

  const fetchTextConfigs = useCallback(async () => {
    try {
      const res = await client.get('/admin/lottery/config', { params: { category: 'business' } });
      const map = {};
      for (const item of res.data) {
        map[item.config_key] = item.config_value;
      }
      setTextConfigs(map);
    } catch (err) {
      setError(err?.message || '加载失败');
    }
  }, []);

  const fetchPrizes = useCallback(async () => {
    try {
      const res = await client.get('/admin/lottery/prizes');
      setPrizes(res.data);
    } catch { /* 忽略 */ }
  }, []);

  const fetchImageConfigs = useCallback(async () => {
    try {
      const res = await client.get('/admin/lottery/config');
      const grouped = res.data || {};
      const map = {};
      const all = [...(grouped.banner || []), ...(grouped.prize || []), ...(grouped.gallery || []),
        ...(grouped.info || []), ...(grouped.ad || []), ...(grouped.share || []),
        ...(grouped.cards || []), ...(grouped.consultant || [])];
      for (const item of all) {
        map[item.config_key] = item.config_value;
      }
      setImageConfigs(map);

      // 顾问信息
      const cFields = {};
      for (const item of all) {
        if (item.config_key === 'consultant_avatar') cFields.avatar = item.config_value;
        if (item.config_key === 'consultant_qrcode') cFields.qrcode = item.config_value;
        if (item.config_key === 'contact_qr') cFields.contact_qr = item.config_value;
      }
      setConsultant(prev => ({
        ...prev,
        avatar: cFields.avatar || prev.avatar,
        qrcode: cFields.qrcode || prev.qrcode,
        contact_qr: cFields.contact_qr || prev.contact_qr,
      }));

      // 顾问文本信息
      const bizRes = await client.get('/admin/lottery/config', { params: { category: 'business' } });
      for (const item of bizRes.data) {
        if (item.config_key === 'consultant_name') setConsultant(prev => ({ ...prev, name: item.config_value || '' }));
        if (item.config_key === 'consultant_phone') setConsultant(prev => ({ ...prev, phone: item.config_value || '' }));
      }
    } catch { /* 忽略 */ }
  }, []);

  const fetchRecords = useCallback(async (params = {}) => {
    setRecLoading(true);
    try {
      const p = { ...params };
      if (recStatus !== '') p.status = recStatus;
      if (recKeyword) p.keyword = recKeyword;
      if (recStartDate) p.startDate = recStartDate;
      if (recEndDate) p.endDate = recEndDate;
      p.page = p.page || 1;
      p.pageSize = 20;
      const res = await client.get('/admin/lottery/records', { params: p });
      setRecords(res.list);
      setRecPagination(res.pagination);
    } catch (err) {
      toast.error(err?.message || '加载中奖记录失败');
    } finally {
      setRecLoading(false);
    }
  }, [recStatus, recKeyword, recStartDate, recEndDate, toast]);

  const fetchUsers = useCallback(async (params = {}) => {
    setUserLoading(true);
    try {
      const p = { ...params };
      if (userKeyword) p.keyword = userKeyword;
      p.page = p.page || 1;
      p.pageSize = 20;
      const res = await client.get('/admin/lottery/users', { params: p });
      setUsers(res.list);
      setUserPagination(res.pagination);
    } catch (err) {
      toast.error(err?.message || '加载用户列表失败');
    } finally {
      setUserLoading(false);
    }
  }, [userKeyword, toast]);

  // 初始化加载
  useEffect(() => {
    Promise.all([fetchStats(), fetchTextConfigs(), fetchPrizes(), fetchImageConfigs()])
      .finally(() => setLoading(false));
  }, [fetchStats, fetchTextConfigs, fetchPrizes, fetchImageConfigs]);

  // 切换 Tab 时加载对应数据
  useEffect(() => {
    if (tab === 'records') fetchRecords();
    if (tab === 'users') fetchUsers();
  }, [tab, fetchRecords, fetchUsers]);

  // ========================================================
  // Tab 1：基础信息 — 保存
  // ========================================================
  const handleTextSave = async (configKey, value) => {
    setSavingText(true);
    try {
      await client.put(`/admin/lottery/config/${configKey}`, { config_value: value });
      setTextConfigs(prev => ({ ...prev, [configKey]: value }));
      toast.success('保存成功');
    } catch (err) {
      toast.error(err?.message || '保存失败');
    } finally {
      setSavingText(false);
    }
  };

  // ========================================================
  // Tab 2：奖品管理
  // ========================================================
  const openPrizeModal = (mode, prize) => {
    setPrizeModalMode(mode);
    if (mode === 'edit' && prize) {
      setPrizeForm({
        name: prize.name || '',
        image: prize.image || '',
        prize_type: prize.prize_type || 'physical',
        probability: prize.probability != null ? String(prize.probability) : '',
        total_stock: prize.total_stock != null ? String(prize.total_stock) : '',
        is_vip: prize.is_vip || 0,
      });
    } else {
      setPrizeForm(EMPTY_PRIZE);
    }
    setPrizeModalOpen(true);
  };

  const handlePrizeSubmit = async () => {
    if (!prizeForm.name.trim()) return toast.error('请输入奖品名称');
    setPrizeSubmitting(true);
    try {
      const body = {
        ...prizeForm,
        probability: prizeForm.probability ? parseFloat(prizeForm.probability) : 0,
        total_stock: prizeForm.total_stock ? parseInt(prizeForm.total_stock) : 0,
      };
      if (prizeModalMode === 'add') {
        await client.post('/admin/lottery/prizes', body);
        toast.success('添加成功');
      } else {
        await client.put(`/admin/lottery/prizes/${prizeForm.id}`, body);
        toast.success('保存成功');
      }
      setPrizeModalOpen(false);
      fetchPrizes();
    } catch (err) {
      toast.error(err?.message || '操作失败');
    } finally {
      setPrizeSubmitting(false);
    }
  };

  const handlePrizeDelete = async () => {
    if (!prizeConfirm.id) return;
    try {
      await client.delete(`/admin/lottery/prizes/${prizeConfirm.id}`);
      toast.success('删除成功');
      setPrizeConfirm({ open: false, id: null });
      fetchPrizes();
    } catch (err) {
      toast.error(err?.message || '删除失败');
    }
  };

  // ========================================================
  // Tab 3：中奖记录
  // ========================================================
  const handleRecordStatus = async (id, status) => {
    try {
      await client.put(`/admin/lottery/records/${id}/status`, { status });
      toast.success(status === 1 ? '已标记为已领取' : '已标记为已失效');
      fetchRecords();
    } catch (err) {
      toast.error(err?.message || '操作失败');
    }
  };

  // ========================================================
  // Tab 5：图片上传
  // ========================================================
  const handleImageUpload = async (configKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(configKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/v1/admin/lottery/upload/${configKey}`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setImageConfigs(prev => ({ ...prev, [configKey]: result.data.config_value }));
        toast.success('上传成功');
      } else {
        toast.error(result.message || '上传失败');
      }
    } catch (err) {
      toast.error(err?.message || '上传失败');
    } finally {
      setUploadingKey('');
    }
  };

  // ========================================================
  // Tab 6：顾问信息
  // ========================================================
  const handleConsultantSave = async () => {
    setConsultantSaving(true);
    try {
      await client.put('/admin/lottery/config/consultant_name', { config_value: consultant.name });
      await client.put('/admin/lottery/config/consultant_phone', { config_value: consultant.phone });
      toast.success('顾问信息保存成功');
    } catch (err) {
      toast.error(err?.message || '保存失败');
    } finally {
      setConsultantSaving(false);
    }
  };

  const handleConsultantUpload = async (configKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(configKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/v1/admin/lottery/upload/${configKey}`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setConsultant(prev => ({ ...prev, [configKey === 'consultant_avatar' ? 'avatar' : configKey === 'consultant_qrcode' ? 'qrcode' : 'contact_qr']: result.data.config_value }));
        toast.success('上传成功');
      } else {
        toast.error(result.message || '上传失败');
      }
    } catch (err) {
      toast.error(err?.message || '上传失败');
    } finally {
      setUploadingKey('');
    }
  };

  // ========================================================
  // 渲染
  // ========================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <ErrorState message={error} onRetry={() => { setError(''); setLoading(true); Promise.all([fetchStats(), fetchTextConfigs(), fetchPrizes(), fetchImageConfigs()]).finally(() => setLoading(false)); }} />
        </div>
      </div>
    );
  }

  // ── 概率校验 ──
  const activePrizes = prizes.filter(p => p.is_active);
  const totalProbability = activePrizes.reduce((sum, p) => sum + parseFloat(p.probability || 0), 0);
  const probWarning = Math.abs(totalProbability - 100) > 0.01;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ── 页面标题 ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">摇一摇抽奖配置</h2>
      </div>

      {/* ── 统计卡片 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: '今日参与人数', value: stats.today_users, color: 'text-blue-600' },
          { label: '今日中奖数', value: stats.today_wins, color: 'text-green-600' },
          { label: '累计中奖数', value: stats.total_wins, color: 'text-orange-600' },
          { label: '累计参与人数', value: stats.total_users, color: 'text-purple-600' },
          { label: '剩余库存', value: stats.remaining_stock, color: 'text-slate-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tab 切换 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-2 flex overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-slate-900 border-slate-900'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════
            Tab 1：基础信息
           ═══════════════════════════════════════════ */}
        {tab === 'basic' && (
          <div className="p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">基础信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'activity_start_date', label: '活动开始日期' },
                { key: 'activity_end_date', label: '活动结束日期' },
                { key: 'lottery_start_date', label: '抽奖开始日期' },
                { key: 'prize_start_date', label: '领奖开始日期' },
                { key: 'service_phone', label: '客服电话' },
                { key: 'cooperation_phone', label: '合作电话' },
                { key: 'company_address', label: '公司地址' },
                { key: 'project_id', label: '项目 ID' },
                { key: 'page_title', label: '页面标题' },
                { key: 'share_title', label: '分享标题' },
                { key: 'share_desc', label: '分享描述' },
                { key: 'daily_init_draws', label: '每日初始抽奖次数' },
                { key: 'daily_max_draws', label: '每日最大抽奖次数' },
                { key: 'latitude', label: '纬度' },
                { key: 'longitude', label: '经度' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                  <TextSaveRow
                    configKey={field.key}
                    value={textConfigs[field.key] || ''}
                    onSave={handleTextSave}
                    saving={savingText}
                  />
                </div>
              ))}
            </div>

            {/* 通知 HTML */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-600 mb-1">通知区 HTML（领奖时间调整通知）</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20"
                value={textConfigs.notice_html || ''}
                onChange={e => setTextConfigs(prev => ({ ...prev, notice_html: e.target.value }))}
              />
              <button
                onClick={() => handleTextSave('notice_html', textConfigs.notice_html || '')}
                disabled={savingText}
                className="mt-2 inline-flex items-center px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {savingText ? '保存中...' : '保存通知'}
              </button>
            </div>

            {/* 规则 HTML */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-600 mb-1">规则区 HTML</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-40"
                value={textConfigs.rule_html || ''}
                onChange={e => setTextConfigs(prev => ({ ...prev, rule_html: e.target.value }))}
              />
              <button
                onClick={() => handleTextSave('rule_html', textConfigs.rule_html || '')}
                disabled={savingText}
                className="mt-2 inline-flex items-center px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {savingText ? '保存中...' : '保存规则'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Tab 2：奖品管理
           ═══════════════════════════════════════════ */}
        {tab === 'prizes' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">奖品管理</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  启用奖品概率之和：
                  <span className={probWarning ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                    {totalProbability.toFixed(1)}%
                  </span>
                  {probWarning && <span className="text-red-500 ml-2">（应为 100%）</span>}
                </p>
              </div>
              <button
                onClick={() => openPrizeModal('add')}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                新增奖品
              </button>
            </div>

            {prizes.length === 0 ? (
              <EmptyState icon="🎁" title="暂无奖品" description="点击上方按钮添加第一个奖品" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">名称</th>
                      <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">图片</th>
                      <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">类型</th>
                      <th className="text-right text-gray-500 font-medium text-xs px-3 py-3">概率</th>
                      <th className="text-right text-gray-500 font-medium text-xs px-3 py-3">库存</th>
                      <th className="text-center text-gray-500 font-medium text-xs px-3 py-3">VIP</th>
                      <th className="text-center text-gray-500 font-medium text-xs px-3 py-3">启用</th>
                      <th className="text-right text-gray-500 font-medium text-xs px-3 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizes.map(p => (
                      <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-3 font-medium text-gray-800">{p.name}</td>
                        <td className="px-3 py-3">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">无图</div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(PRIZE_TYPE_MAP[p.prize_type] || PRIZE_TYPE_MAP.physical).cls}`}>
                            {(PRIZE_TYPE_MAP[p.prize_type] || PRIZE_TYPE_MAP.physical).label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">{p.probability}%</td>
                        <td className="px-3 py-3 text-right">
                          {p.total_stock === -1 ? '不限' : `${p.remaining_stock}/${p.total_stock}`}
                        </td>
                        <td className="px-3 py-3 text-center">{p.is_vip ? '✨' : '—'}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={async () => {
                              try {
                                await client.put(`/admin/lottery/prizes/${p.id}`, { is_active: p.is_active ? 0 : 1 });
                                fetchPrizes();
                              } catch (err) { toast.error(err?.message || '操作失败'); }
                            }}
                            className={`w-9 h-5 rounded-full transition-colors relative ${p.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button onClick={() => { setPrizeForm({ ...p, probability: String(p.probability || 0), total_stock: String(p.total_stock || 0) }); openPrizeModal('edit', p); }} className="text-blue-600 hover:text-blue-800 text-xs mr-3">编辑</button>
                          <button onClick={() => setPrizeConfirm({ open: true, id: p.id })} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Tab 3：中奖记录
           ═══════════════════════════════════════════ */}
        {tab === 'records' && (
          <div className="p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">中奖记录</h3>

            {/* 筛选 */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select value={recStatus} onChange={e => { setRecStatus(e.target.value); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">全部状态</option>
                <option value="0">未领取</option>
                <option value="1">已领取</option>
                <option value="2">已失效</option>
              </select>
              <input type="date" value={recStartDate} onChange={e => setRecStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="开始日期" />
              <input type="date" value={recEndDate} onChange={e => setRecEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="结束日期" />
              <input
                type="text"
                placeholder="搜索手机号/奖品名"
                value={recKeyword}
                onChange={e => setRecKeyword(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
              />
              <button onClick={() => fetchRecords()} className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800">搜索</button>
            </div>

            {recLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <EmptyState icon="📋" title="暂无中奖记录" description="活动开始后会显示在这里" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">用户</th>
                        <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">奖品</th>
                        <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">中奖时间</th>
                        <th className="text-center text-gray-500 font-medium text-xs px-3 py-3">状态</th>
                        <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">领取时间</th>
                        <th className="text-right text-gray-500 font-medium text-xs px-3 py-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-3">
                            <span className="text-gray-800">{r.user_name || r.user_phone || '—'}</span>
                            {r.user_phone && <span className="text-gray-400 text-xs ml-1">{r.user_phone.replace(/(\d{3})\d{4}(\d+)/, '$1****$2')}</span>}
                          </td>
                          <td className="px-3 py-3 text-gray-800">{r.prize_name}</td>
                          <td className="px-3 py-3 text-gray-500 text-xs">{r.win_at ? new Date(r.win_at).toLocaleString('zh-CN') : '—'}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(STATUS_MAP[r.status] || STATUS_MAP[0]).cls}`}>
                              {(STATUS_MAP[r.status] || STATUS_MAP[0]).label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-500 text-xs">{r.claimed_at ? new Date(r.claimed_at).toLocaleString('zh-CN') : '—'}</td>
                          <td className="px-3 py-3 text-right">
                            {r.status === 0 && (
                              <>
                                <button onClick={() => handleRecordStatus(r.id, 1)} className="text-green-600 hover:text-green-800 text-xs mr-2">标记已领</button>
                                <button onClick={() => handleRecordStatus(r.id, 2)} className="text-red-600 hover:text-red-800 text-xs">标记失效</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分页 */}
                {recPagination.total_pages > 1 && (
                  <Pagination pagination={recPagination} onChange={page => fetchRecords({ page })} />
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Tab 4：用户列表
           ═══════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">用户列表</h3>

            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="搜索手机号"
                value={userKeyword}
                onChange={e => setUserKeyword(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
              />
              <button onClick={() => fetchUsers()} className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800">搜索</button>
            </div>

            {userLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <EmptyState icon="👥" title="暂无用户" description="活动开始后有用户参与会显示在这里" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">手机号</th>
                        <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">姓名</th>
                        <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">OpenID</th>
                        <th className="text-right text-gray-500 font-medium text-xs px-3 py-3">今日抽奖</th>
                        <th className="text-right text-gray-500 font-medium text-xs px-3 py-3">累计抽奖</th>
                        <th className="text-left text-gray-500 font-medium text-xs px-3 py-3">最近抽奖</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-3 text-gray-800">{u.phone ? u.phone.replace(/(\d{3})\d{4}(\d+)/, '$1****$2') : '—'}</td>
                          <td className="px-3 py-3 text-gray-800">{u.name || '—'}</td>
                          <td className="px-3 py-3 text-gray-500 text-xs font-mono">{u.openid ? u.openid.slice(0, 16) + '…' : '—'}</td>
                          <td className="px-3 py-3 text-right text-gray-800">{u.daily_draws}</td>
                          <td className="px-3 py-3 text-right text-gray-800">{u.total_draws}</td>
                          <td className="px-3 py-3 text-gray-500 text-xs">{u.last_draw_date || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {userPagination.total_pages > 1 && (
                  <Pagination pagination={userPagination} onChange={page => fetchUsers({ page })} />
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Tab 5：图片素材（每行含尺寸标注）
           ═══════════════════════════════════════════ */}
        {tab === 'images' && (
          <div className="p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">图片素材管理</h3>
            <p className="text-sm text-gray-500 mb-4">所有图片通过本地上传替换，每个位置标注了建议尺寸和比例</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {IMAGE_SLOTS.map(slot => (
                <div key={slot.key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700">{slot.label}</span>
                      <span className="ml-2 text-xs text-gray-400">{slot.size}</span>
                    </div>
                    <span className="text-xs text-gray-400">{slot.ratio}</span>
                  </div>

                  {/* 预览 */}
                  <div className="w-full h-32 bg-white rounded border border-gray-200 mb-3 flex items-center justify-center overflow-hidden">
                    {imageConfigs[slot.key] ? (
                      <img src={imageConfigs[slot.key]} alt={slot.label} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-gray-300 text-xs">暂未上传</span>
                    )}
                  </div>

                  {/* 上传按钮 */}
                  <label className={`inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-lg cursor-pointer transition-colors w-full justify-center ${
                    uploadingKey === slot.key
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}>
                    {uploadingKey === slot.key ? (
                      <><div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin mr-1" /> 上传中...</>
                    ) : (
                      <><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v11" /></svg> 本地上传</>
                    )}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingKey === slot.key}
                      onChange={e => handleImageUpload(slot.key, e)} />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Tab 6：顾问信息
           ═══════════════════════════════════════════ */}
        {tab === 'consultant' && (
          <div className="p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">顾问信息</h3>

            {/* 文本字段 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">顾问姓名</label>
                <input
                  type="text"
                  value={consultant.name}
                  onChange={e => setConsultant(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">顾问电话</label>
                <input
                  type="text"
                  value={consultant.phone}
                  onChange={e => setConsultant(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleConsultantSave}
              disabled={consultantSaving}
              className="mb-8 inline-flex items-center px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {consultantSaving ? '保存中...' : '保存文本信息'}
            </button>

            {/* 图片上传 */}
            <h4 className="text-sm font-semibold text-gray-800 mb-4">顾问图片</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'consultant_avatar', label: '顾问头像', size: '750×750', ratio: '1:1 正方形', preview: consultant.avatar },
                { key: 'consultant_qrcode', label: '微信二维码', size: '530×530', ratio: '1:1 正方形', preview: consultant.qrcode },
                { key: 'contact_qr', label: '联系二维码', size: '200×200', ratio: '1:1 正方形', preview: consultant.contact_qr },
              ].map(slot => (
                <div key={slot.key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{slot.label}</span>
                    <span className="text-xs text-gray-400">{slot.size} · {slot.ratio}</span>
                  </div>
                  <div className="w-full h-40 bg-white rounded border border-gray-200 mb-3 flex items-center justify-center overflow-hidden">
                    {slot.preview ? (
                      <img src={slot.preview} alt={slot.label} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-gray-300 text-xs">暂未上传</span>
                    )}
                  </div>
                  <label className={`inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-lg cursor-pointer transition-colors w-full justify-center ${
                    uploadingKey === slot.key
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}>
                    {uploadingKey === slot.key ? (
                      <><div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin mr-1" /> 上传中...</>
                    ) : (
                      <><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v11" /></svg> 本地上传</>
                    )}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingKey === slot.key}
                      onChange={e => handleConsultantUpload(slot.key, e)} />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 奖品编辑弹窗 ── */}
      <Modal
        open={prizeModalOpen}
        onClose={() => setPrizeModalOpen(false)}
        title={prizeModalMode === 'add' ? '新增奖品' : '编辑奖品'}
        footer={
          <>
            <button onClick={() => setPrizeModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              取消
            </button>
            <button onClick={handlePrizeSubmit} disabled={prizeSubmitting}
              className="px-4 py-2 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50">
              {prizeSubmitting ? '保存中...' : '保存'}
            </button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">奖品名称 *</label>
            <input type="text" value={prizeForm.name}
              onChange={e => setPrizeForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="如：华为手机" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">奖品类型</label>
            <select value={prizeForm.prize_type}
              onChange={e => setPrizeForm(prev => ({ ...prev, prize_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="physical">实物</option>
              <option value="virtual">虚拟</option>
              <option value="thanks">谢谢参与</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">中奖概率（%）</label>
            <input type="number" step="0.01" value={prizeForm.probability}
              onChange={e => setPrizeForm(prev => ({ ...prev, probability: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="如：5（表示 5%）" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">总库存（-1=不限）</label>
            <input type="number" value={prizeForm.total_stock}
              onChange={e => setPrizeForm(prev => ({ ...prev, total_stock: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="如：100" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <input type="checkbox" checked={!!prizeForm.is_vip}
                onChange={e => setPrizeForm(prev => ({ ...prev, is_vip: e.target.checked ? 1 : 0 }))}
                className="rounded" />
              高意向奖品（中奖后触发留资弹窗）
            </label>
          </div>
        </div>
      </Modal>

      {/* ── 删除确认 ── */}
      <ConfirmDialog
        open={prizeConfirm.open}
        onClose={() => setPrizeConfirm({ open: false, id: null })}
        onConfirm={handlePrizeDelete}
        title="删除奖品"
        message="确定要删除该奖品吗？删除后不可恢复。"
        confirmText="确认删除"
        variant="danger"
      />
    </div>
  );
}

// ========================================================
// 内联组件：可编辑文本行（点击编辑 → 输入 → 保存）
// ========================================================
function TextSaveRow({ configKey, value, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => { setText(value); }, [value]);

  if (editing) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={() => { onSave(configKey, text); setEditing(false); }}
          disabled={saving}
          className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? '…' : '保存'}
        </button>
        <button
          onClick={() => { setText(value); setEditing(false); }}
          className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="px-3 py-2 border border-transparent rounded-lg text-sm text-gray-800 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors min-h-[38px] flex items-center"
      title="点击编辑"
    >
      {value || <span className="text-gray-300">点击设置</span>}
    </div>
  );
}

// ========================================================
// 内联组件：分页
// ========================================================
function Pagination({ pagination, onChange }) {
  const { page, total_pages } = pagination;

  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(total_pages, page + 2); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ‹
      </button>
      {pages[0] > 1 && <span className="px-1 text-gray-400">…</span>}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1 text-sm rounded ${p === page ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < total_pages && <span className="px-1 text-gray-400">…</span>}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= total_pages}
        className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  );
}
