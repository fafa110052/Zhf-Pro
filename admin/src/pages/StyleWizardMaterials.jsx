import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useToast } from '../components/Toast';

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const SELECT_CLS = `${INPUT_CLS} bg-white`;

const SCOPE_OPTIONS = ['定制柜柜体', '定制柜柜门', '橱柜柜体', '橱柜柜门'];

const EMPTY_FORM = {
  subcategory_id: '', name: '', model: '', brand: '', brand_logo: '', image_url: '',
  original_price: '', discount_price: '', specs: '', sort_order: 0,
  has_chaise: false, old_code: '', new_code: '', applicable_scopes: [], style_ids: [],
  attr_values: {}, attr_raw: '',
  mirror_cabinet: '', main_cabinet: '', countertop: '',
  drainage_method: '', wall_distance: '',
};

/** 品类颜色标签：按名称哈希分配，同一品类颜色稳定 */
const CAT_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8' },  // 蓝
  { bg: '#f0fdf4', text: '#15803d' },  // 绿
  { bg: '#fef3c7', text: '#b45309' },  // 琥珀
  { bg: '#fce7f3', text: '#be185d' },  // 粉
  { bg: '#ede9fe', text: '#6d28d9' },  // 紫
  { bg: '#fff7ed', text: '#c2410c' },  // 橙
  { bg: '#ecfeff', text: '#0e7490' },  // 青
  { bg: '#f1f5f9', text: '#475569' },  // 灰
];
function categoryColor(name) {
  if (!name) return CAT_COLORS[7]; // 灰色兜底
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CAT_COLORS[Math.abs(hash) % CAT_COLORS.length];
}

/** 解析子品类的属性模板：{ keys: string[]|null, invalid: boolean } */
function parseTemplate(sub) {
  if (!sub?.attribute_template) return { keys: null, invalid: false };
  try {
    const parsed = JSON.parse(sub.attribute_template);
    if (Array.isArray(parsed) && parsed.length > 0) return { keys: parsed.map(String), invalid: false };
    return { keys: null, invalid: !Array.isArray(parsed) };
  } catch { return { keys: null, invalid: true }; }
}

function Pagination({ page, totalPages, total, onPage }) {
  if (total === 0) return null;
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>共 {total} 条</span>
      <div className="flex items-center space-x-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">上一页</button>
        {pages.map((p, i) => p === '...'
          ? <span key={`dot-${i}`} className="px-1 text-gray-300">...</span>
          : <button key={p} onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{p}</button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">下一页</button>
      </div>
    </div>
  );
}

/**
 * 风格选材 — 材料管理（级联筛选 + 动态属性表单 + 风格关联）
 */
export default function StyleWizardMaterials() {
  const toast = useToast();
  const { categoryId } = useParams();
  const lockedCategory = categoryId || '';

  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);

  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 筛选 — 若 URL 带品类参数则锁定
  const [filterCategory, setFilterCategory] = useState(lockedCategory);
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [keyword, setKeyword] = useState('');

  // 弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalLoading, setModalLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // 图片本地上传（外链图床常有防盗链，自己服务器的图才稳定）
  const [uploadingField, setUploadingField] = useState('');
  const logoFileRef = useRef(null);
  const imageFileRef = useRef(null);

  const handleFileUpload = async (e, field, ref) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { toast.error('仅支持 JPG/PNG/GIF/WebP 格式'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('图片大小不能超过 10MB'); return; }
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/v1/upload?category=materials', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, [field]: data.data.image_url }));
        toast.success('图片上传成功');
      } else {
        toast.error(data.error?.message || '上传失败');
      }
    } catch (err) { toast.error('图片上传失败，请检查网络'); }
    finally {
      setUploadingField('');
      if (ref.current) ref.current.value = '';
    }
  };

  const fetchList = useCallback(async (params) => {
    setLoading(true); setError('');
    try {
      const res = await client.get('/admin/style-materials', { params });
      setList(res.data.list || []);
      setPagination(res.data.pagination || { page: 1, page_size: 20, total: 0, total_pages: 0 });
    } catch (err) { setError(err?.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  const buildParams = (page, over = {}) => {
    const f = {
      category_id: filterCategory, subcategory_id: filterSubcategory,
      keyword: keyword.trim(), ...over,
    };
    const params = { page, page_size: pagination.page_size };
    if (f.category_id) params.category_id = f.category_id;
    if (f.subcategory_id) params.subcategory_id = f.subcategory_id;
    if (f.keyword) params.keyword = f.keyword;
    return params;
  };

  useEffect(() => {
    const params = { page: 1, page_size: 20 };
    if (lockedCategory) params.category_id = Number(lockedCategory);
    fetchList(params);
    // 室内木门（page_number=2）由「门系列管理」维护，材料管理不展示，避免两处入口冲突
    client.get('/admin/style-categories').then((res) => setCategories((res.data || []).filter((c) => c.page_number !== 2))).catch(() => {});
    client.get('/admin/styles').then((res) => setStyles(res.data || [])).catch(() => {});
  }, [fetchList, lockedCategory]);

  // 品类间切换：同步 URL 参数到筛选状态
  useEffect(() => {
    if (lockedCategory) {
      setFilterCategory(lockedCategory);
      setFilterSubcategory('');
    }
  }, [lockedCategory]);

  const handleCategoryChange = (val) => {
    setFilterCategory(val); setFilterSubcategory('');
    fetchList(buildParams(1, { category_id: val, subcategory_id: '' }));
  };
  const handleSubcategoryChange = (val) => {
    setFilterSubcategory(val);
    fetchList(buildParams(1, { subcategory_id: val }));
  };
  const handleSearch = (e) => { e.preventDefault(); fetchList(buildParams(1)); };
  const goPage = (p) => {
    if (p < 1 || p > pagination.total_pages) return;
    fetchList(buildParams(p));
  };
  const refresh = () => fetchList(buildParams(pagination.page));

  // ─── 表单派生 ───
  const findSub = (subId) => {
    for (const cat of categories) {
      const sub = (cat.subcategories || []).find((s) => String(s.id) === String(subId));
      if (sub) return { cat, sub };
    }
    return { cat: null, sub: null };
  };
  const { cat: selectedCat, sub: selectedSub } = findSub(form.subcategory_id);
  const tpl = parseTemplate(selectedSub);
  const isSofa = !!selectedSub?.name?.includes('沙发');
  const isDecoration = selectedCat?.name === '装饰定制';
  const isTile = selectedCat?.page_number === 1; // 瓷砖选材：标题行显示品牌+logo，名称非必填
  // 页面级判断：URL 锁定到瓷砖品类时，列表和表单都隐藏价格字段
  const isTilePage = !!lockedCategory && categories.some((c) => String(c.id) === String(lockedCategory) && c.page_number === 1);
  // 卫浴（page_number=3）：表单以型号为主标题，额外显示镜柜/主柜/台面，隐藏价格
  const isBath = selectedCat?.page_number === 3;
  const isBathPage = !!lockedCategory && categories.some((c) => String(c.id) === String(lockedCategory) && c.page_number === 3);
  const subName = selectedSub?.name || '';
  const isBathCabinet = subName.includes('浴室柜');
  const isToilet = subName.includes('马桶');
  const isSquatToilet = subName.includes('蹲厕');
  const isWaterTank = subName.includes('水箱');
  const isShower = subName.includes('花洒');
  const isFaucet = subName.includes('水龙头');
  // 非浴室柜的卫浴子品类（马桶/蹲厕/水箱/花洒/水龙头）
  const isBathOther = isBath && !isBathCabinet;

  const openAdd = () => {
    setModalMode('add'); setEditingId(null);
    setForm({ ...EMPTY_FORM, subcategory_id: filterSubcategory || '' });
    setFormErrors({}); setModalOpen(true);
  };

  const openEdit = async (row) => {
    setModalMode('edit'); setEditingId(row.id);
    setForm(EMPTY_FORM); setFormErrors({});
    setModalOpen(true); setModalLoading(true);
    try {
      const res = await client.get(`/admin/style-materials/${row.id}`);
      const m = res.data;
      let attrValues = {}; let attrRaw = '';
      if (m.attributes) {
        try {
          const parsed = JSON.parse(m.attributes);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) attrValues = parsed;
          attrRaw = m.attributes;
        } catch { attrRaw = m.attributes; }
      }
      let scopes = [];
      if (m.applicable_scopes) {
        try { const s = JSON.parse(m.applicable_scopes); if (Array.isArray(s)) scopes = s; } catch { /* 忽略脏数据 */ }
      }
      setForm({
        subcategory_id: String(m.subcategory_id),
        name: m.name || '', model: m.model || '', brand: m.brand || '',
        brand_logo: m.brand_logo || '', image_url: m.image_url || '',
        original_price: m.original_price ?? '', discount_price: m.discount_price ?? '',
        specs: m.specs || '', sort_order: m.sort_order ?? 0,
        has_chaise: !!m.has_chaise, old_code: m.old_code || '', new_code: m.new_code || '',
        applicable_scopes: scopes,
        style_ids: (m.styles || []).map((s) => s.id),
        attr_values: attrValues, attr_raw: attrRaw,
        mirror_cabinet: attrValues['镜柜'] || '',
        main_cabinet: attrValues['主柜'] || '',
        countertop: attrValues['台面'] || '',
      });
    } catch (err) {
      toast.error(err?.message || '加载材料详情失败');
      setModalOpen(false);
    } finally { setModalLoading(false); }
  };

  const closeModal = () => { setModalOpen(false); setSubmitting(false); };

  const toggleInArray = (arr, val) => (arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const validateForm = () => {
    const errs = {};
    if (!form.subcategory_id) errs.subcategory_id = '请选择子品类';
    if (isTile) {
      // 瓷砖：小程序标题行 = 品牌logo + 品牌名，品牌/logo/型号/规格必填，无名称与价格
      if (!form.brand.trim()) errs.brand = '请输入品牌';
      if (!form.brand_logo.trim()) errs.brand_logo = '请上传品牌 Logo';
      if (!form.model.trim()) errs.model = '请输入型号';
      if (!form.specs.trim()) errs.specs = '请输入规格';
    } else if (isBathCabinet) {
      // 浴室柜组合：保持现有逻辑
      if (!form.model.trim()) errs.model = '请输入型号';
      if (!form.mirror_cabinet.trim()) errs.mirror_cabinet = '请输入镜柜规格';
      if (!form.main_cabinet.trim()) errs.main_cabinet = '请输入主柜规格';
      if (!form.countertop.trim()) errs.countertop = '请输入台面规格';
    } else if (isToilet) {
      if (!form.model.trim()) errs.model = '请输入型号';
      if (!form.specs.trim()) errs.specs = '请输入规格';
      if (!form.drainage_method.trim()) errs.drainage_method = '请输入排水方式';
    } else if (isSquatToilet) {
      if (!form.model.trim()) errs.model = '请输入型号';
      if (!form.specs.trim()) errs.specs = '请输入规格';
      if (!form.wall_distance.trim()) errs.wall_distance = '请输入前出水墙距';
    } else if (isWaterTank) {
      if (!form.model.trim()) errs.model = '请输入型号';
      if (!form.specs.trim()) errs.specs = '请输入规格';
    } else if (isShower) {
      if (!form.name.trim()) errs.name = '请输入标题';
      if (!form.model.trim()) errs.model = '请输入型号';
    } else if (isFaucet) {
      if (!form.name.trim()) errs.name = '请输入标题';
      if (!form.model.trim()) errs.model = '请输入型号';
    } else if (!form.name.trim()) {
      errs.name = '请输入材料名称';
    }
    if (!form.image_url.trim()) errs.image_url = '请上传图片'; // 选材卡片以图为主，无图即破卡
    if (!tpl.keys && tpl.invalid && form.attr_raw.trim()) {
      try {
        const parsed = JSON.parse(form.attr_raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) errs.attr_raw = '必须是 JSON 对象，如 {"功率":"36W"}';
      } catch { errs.attr_raw = 'JSON 格式不正确'; }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        subcategory_id: Number(form.subcategory_id),
        name: (isTile || isBath || isBathPage) ? '' : form.name.trim(), // 瓷砖/卫浴无名称
        model: form.model.trim() || null,
        brand: form.brand.trim() || null,
        brand_logo: form.brand_logo.trim() || null,
        image_url: form.image_url.trim() || null,
        original_price: (isTilePage || isTile || isBathPage || isBath) || form.original_price === '' || form.original_price === null ? null : Number(form.original_price),
        discount_price: (isTilePage || isTile || isBathPage || isBath) || form.discount_price === '' || form.discount_price === null ? null : Number(form.discount_price),
        specs: form.specs.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        has_chaise: isSofa && form.has_chaise ? 1 : 0,
        style_ids: form.style_ids,
      };
      if (isBath || isBathPage) {
        // 卫浴：镜柜/主柜/台面存入 attributes JSON，不由子品类模板驱动
        payload.attributes = {
          '镜柜': form.mirror_cabinet.trim(),
          '主柜': form.main_cabinet.trim(),
          '台面': form.countertop.trim(),
        };
      } else if (tpl.keys) {
        const attrs = {};
        tpl.keys.forEach((k) => {
          const v = (form.attr_values[k] ?? '').toString().trim();
          if (v) attrs[k] = v;
        });
        payload.attributes = attrs;
      } else if (tpl.invalid) {
        payload.attributes = form.attr_raw.trim() ? JSON.parse(form.attr_raw) : {};
      }
      if (isDecoration) {
        payload.old_code = form.old_code.trim() || null;
        payload.new_code = form.new_code.trim() || null;
        payload.applicable_scopes = form.applicable_scopes;
      }
      if (modalMode === 'add') {
        await client.post('/admin/style-materials', payload);
        toast.success('材料添加成功');
      } else {
        await client.put(`/admin/style-materials/${editingId}`, payload);
        toast.success('材料更新成功');
      }
      closeModal();
      refresh();
    } catch (err) { toast.error(err?.message || '保存失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (row) => {
    setConfirmAction({
      title: '删除材料',
      message: `确定要删除材料「${row.name || row.brand || row.model || '—'}」吗？删除后其风格关联也会一并移除，不可恢复。`,
      variant: 'danger', confirmText: '确认删除',
      action: async () => {
        setConfirmLoading(true);
        try {
          await client.delete(`/admin/style-materials/${row.id}`);
          toast.success('材料已删除');
          setConfirmOpen(false); setConfirmAction(null);
          refresh();
        } catch (err) { toast.error(err?.message || '删除失败'); setConfirmOpen(false); }
        finally { setConfirmLoading(false); }
      },
    });
    setConfirmOpen(true);
  };

  const filterSubOptions = categories.find((c) => String(c.id) === String(filterCategory))?.subcategories || [];

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ─── 顶部操作栏 + 筛选 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{lockedCategory ? `${categories.find((c) => String(c.id) === String(lockedCategory))?.name || ''}材料` : '材料管理'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{lockedCategory ? '管理当前品类下的材料/产品，可关联多个风格' : '管理选材向导各品类下的材料/产品，可关联多个风格'}</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加材料
          </button>
        </div>
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 mt-4">
          {lockedCategory ? (
            <span className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
              {categories.find((c) => String(c.id) === String(lockedCategory))?.name || '加载中...'}
            </span>
          ) : (
            <select value={filterCategory} onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">全部品类</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select value={filterSubcategory} onChange={(e) => handleSubcategoryChange(e.target.value)} disabled={!filterCategory}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400">
            <option value="">全部子品类</option>
            {filterSubOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索名称/品牌"
            className="w-52 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <button type="submit" className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">搜索</button>
        </form>
      </div>

      {/* ─── 错误提示 ─── */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      {/* ─── 数据表格 ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon="🧱" title="暂无材料" description="点击右上角按钮添加材料" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {(isBathPage
                      ? ['图片', '型号', '镜柜', '主柜', '台面', '品类', '子品类', '排序', '操作']
                      : ['图片', '名称', '品牌', '型号', '品类', '子品类', ...(isTilePage ? [] : ['原价', '优惠价']), '排序', '操作']
                    ).map((h) => (
                      <th key={h} className={`${h === '排序' ? 'text-center' : 'text-left'} ${h === '操作' ? 'text-right' : ''} px-4 py-3 text-gray-500 font-medium text-xs whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((m) => {
                    const bathAttrs = (() => {
                      if (!isBathPage) return {};
                      try {
                        const a = typeof m.attributes === 'string' ? JSON.parse(m.attributes) : (m.attributes || {});
                        return a && typeof a === 'object' && !Array.isArray(a) ? a : {};
                      } catch { return {}; }
                    })();
                    return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                          {m.image_url
                            ? <img src={m.image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300">🧱</div>}
                        </div>
                      </td>
                      {isBathPage ? (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.model || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{bathAttrs['镜柜'] || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{bathAttrs['主柜'] || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{bathAttrs['台面'] || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.name || m.brand || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.brand || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.model || '—'}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.category_name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{(() => { const c = categoryColor(m.subcategory_name); return <span style={{background:c.bg,color:c.text,padding:'2px 8px',borderRadius:'4px',fontSize:'12px'}}>{m.subcategory_name || '—'}</span>; })()}</td>
                      {!isTilePage && !isBathPage && <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.original_price != null ? `¥${m.original_price}` : '—'}</td>}
                      {!isTilePage && !isBathPage && <td className="px-4 py-3 text-red-600 font-medium whitespace-nowrap">{m.discount_price != null ? `¥${m.discount_price}` : '—'}</td>}
                      <td className="px-4 py-3 text-center text-gray-500">{m.sort_order}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button onClick={() => openEdit(m)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">编辑</button>
                          <button onClick={() => handleDelete(m)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} onPage={goPage} />
          </>
        )}
      </div>

      {/* ─── 新增/编辑弹窗 ─── */}
      {modalOpen && (
        <Modal open={modalOpen} size="lg" title={modalMode === 'add' ? '添加材料' : '编辑材料'} onClose={closeModal}>
          {modalLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 基础字段 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">子品类<span className="text-red-500"> *</span></label>
                  <select value={form.subcategory_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })} className={SELECT_CLS}>
                    <option value="">请选择子品类</option>
                    {(lockedCategory ? categories.filter((c) => String(c.id) === String(lockedCategory)) : categories).map((cat) => (
                      <optgroup key={cat.id} label={cat.name}>
                        {(cat.subcategories || []).map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {formErrors.subcategory_id && <p className="text-red-500 text-xs mt-1">{formErrors.subcategory_id}</p>}
                </div>
                {/* 瓷砖标题行 = 品牌，卫浴标题行 = 型号，均无需名称，字段整体隐藏 */}
                {!(isTile || (isBath && !isShower && !isFaucet) || (isBathPage && !isShower && !isFaucet)) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">材料名称<span className="text-red-500"> *</span></label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder="如：原木风三人沙发" />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                )}
                {/* 卫浴不展示品牌/品牌Logo，标题行用型号 */}
                {!(isBath || isBathPage) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">品牌{isTile && <span className="text-red-500"> *</span>}</label>
                    <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={INPUT_CLS} maxLength={64} />
                    {formErrors.brand && <p className="text-red-500 text-xs mt-1">{formErrors.brand}</p>}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">型号{(isTile || isBath || isBathPage) && <span className="text-red-500"> *</span>}</label>
                  <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder={isTile ? '如：TB6023' : ''} />
                  {formErrors.model && <p className="text-red-500 text-xs mt-1">{formErrors.model}</p>}
                </div>
                {!(isBath || isBathPage) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">品牌 Logo{isTile && <span className="text-red-500"> *</span>}</label>
                    <div className="flex gap-2">
                      <input value={form.brand_logo} onChange={(e) => setForm({ ...form, brand_logo: e.target.value })} className={`${INPUT_CLS} flex-1`} placeholder="点击右侧按钮上传" />
                      <button type="button" onClick={() => logoFileRef.current?.click()} disabled={uploadingField === 'brand_logo'}
                        className="px-3 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap">
                        {uploadingField === 'brand_logo' ? '上传中...' : '本地上传'}
                      </button>
                      <input ref={logoFileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => handleFileUpload(e, 'brand_logo', logoFileRef)} />
                    </div>
                    {formErrors.brand_logo && <p className="text-red-500 text-xs mt-1">{formErrors.brand_logo}</p>}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">图片 URL<span className="text-red-500"> *</span></label>
                  <div className="flex gap-2">
                    <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={`${INPUT_CLS} flex-1`} placeholder="点击右侧按钮上传" />
                    <button type="button" onClick={() => imageFileRef.current?.click()} disabled={uploadingField === 'image_url'}
                      className="px-3 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap">
                      {uploadingField === 'image_url' ? '上传中...' : '本地上传'}
                    </button>
                    <input ref={imageFileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => handleFileUpload(e, 'image_url', imageFileRef)} />
                  </div>
                  {formErrors.image_url && <p className="text-red-500 text-xs mt-1">{formErrors.image_url}</p>}
                </div>
                {/* 瓷砖/卫浴不展示价格 */}
                {!(isTilePage || isTile || isBathPage || isBath) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">原价（元）</label>
                      <input type="number" step="0.01" min="0" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">优惠价（元）</label>
                      <input type="number" step="0.01" min="0" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} className={INPUT_CLS} />
                    </div>
                  </>
                )}
              </div>
              {/* 卫浴仅马桶/蹲厕/水箱显示规格，花洒/水龙头/浴室柜隐藏 */}
              {!((isBath || isBathPage) && !isToilet && !isSquatToilet && !isWaterTank) && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">规格说明{(isTile || (isBath && (isToilet || isSquatToilet || isWaterTank)) || (isBathPage && (isToilet || isSquatToilet || isWaterTank))) && <span className="text-red-500"> *</span>}</label>
                    <textarea rows={2} value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} className={`${INPUT_CLS} resize-none`} placeholder={isTile ? '如：200X800' : '如：2400×950×850mm'} />
                    {formErrors.specs && <p className="text-red-500 text-xs mt-1">{formErrors.specs}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                    <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
                  </div>
                </div>
              )}

              {/* 浴室柜：镜柜 / 主柜 / 台面 */}
              {isBathCabinet && (
                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-3">
                  <p className="text-sm font-medium text-gray-700">卫浴规格</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">镜柜<span className="text-red-500"> *</span></label>
                      <input value={form.mirror_cabinet} onChange={(e) => setForm({ ...form, mirror_cabinet: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder="如：800×650mm" />
                      {formErrors.mirror_cabinet && <p className="text-red-500 text-xs mt-1">{formErrors.mirror_cabinet}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">主柜<span className="text-red-500"> *</span></label>
                      <input value={form.main_cabinet} onChange={(e) => setForm({ ...form, main_cabinet: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder="如：800×500mm" />
                      {formErrors.main_cabinet && <p className="text-red-500 text-xs mt-1">{formErrors.main_cabinet}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">台面<span className="text-red-500"> *</span></label>
                      <input value={form.countertop} onChange={(e) => setForm({ ...form, countertop: e.target.value })} className={INPUT_CLS} maxLength={128} placeholder="如：石英石" />
                      {formErrors.countertop && <p className="text-red-500 text-xs mt-1">{formErrors.countertop}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                      <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                </div>
              )}

              {/* 马桶：型号 + 规格 + 排水方式 */}
              {isToilet && (
                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-3">
                  <p className="text-sm font-medium text-gray-700">马桶规格</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排水方式<span className="text-red-500"> *</span></label>
                      <input value={form.drainage_method} onChange={(e) => setForm({ ...form, drainage_method: e.target.value })} className={INPUT_CLS} maxLength={64} placeholder="如：地排" />
                      {formErrors.drainage_method && <p className="text-red-500 text-xs mt-1">{formErrors.drainage_method}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                      <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                </div>
              )}

              {/* 蹲厕：前出水墙距 */}
              {isSquatToilet && (
                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-3">
                  <p className="text-sm font-medium text-gray-700">蹲厕规格</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">前出水墙距<span className="text-red-500"> *</span></label>
                      <input value={form.wall_distance} onChange={(e) => setForm({ ...form, wall_distance: e.target.value })} className={INPUT_CLS} maxLength={64} placeholder="如：300mm" />
                      {formErrors.wall_distance && <p className="text-red-500 text-xs mt-1">{formErrors.wall_distance}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                      <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
                    </div>
                  </div>
                </div>
              )}

              {/* 水箱：仅排序号（型号+规格已在基础字段区） */}
              {isWaterTank && (
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                    <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
                  </div>
                </div>
              )}

              {/* 花洒 / 水龙头：仅排序号（标题+型号已在基础字段区，无 specs） */}
              {(isShower || isFaucet) && (
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
                    <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={INPUT_CLS} />
                  </div>
                </div>
              )}

              {/* 动态属性区（卫浴由专用字段接管，跳过模板渲染） */}
              {!(isBath || isBathPage) && tpl.keys && (
                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  <p className="text-sm font-medium text-gray-700 mb-2">产品属性</p>
                  <div className="grid grid-cols-2 gap-3">
                    {tpl.keys.map((key) => (
                      <div key={key}>
                        <label className="block text-xs text-gray-500 mb-1">{key}</label>
                        <input value={form.attr_values[key] ?? ''}
                          onChange={(e) => setForm({ ...form, attr_values: { ...form.attr_values, [key]: e.target.value } })}
                          className={INPUT_CLS} placeholder={`填写${key}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!(isBath || isBathPage) && !tpl.keys && tpl.invalid && (
                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  <p className="text-sm font-medium text-gray-700 mb-2">产品属性（JSON）</p>
                  <textarea rows={3} value={form.attr_raw} onChange={(e) => setForm({ ...form, attr_raw: e.target.value })}
                    className={`${INPUT_CLS} font-mono resize-none`} placeholder='{"功率":"36W","色温":"三色"}' />
                  {formErrors.attr_raw
                    ? <p className="text-red-500 text-xs mt-1">{formErrors.attr_raw}</p>
                    : <p className="text-xs text-gray-400 mt-1">该子品类的属性模板解析失败，请直接编辑属性 JSON 对象</p>}
                </div>
              )}

              {/* 沙发专属 */}
              {isSofa && (
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.has_chaise} onChange={(e) => setForm({ ...form, has_chaise: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-blue-500" />
                  有贵妃（带贵妃榻）
                </label>
              )}

              {/* 装饰定制专属 */}
              {isDecoration && (
                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-3">
                  <p className="text-sm font-medium text-gray-700">装饰定制信息</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">旧编码</label>
                      <input value={form.old_code} onChange={(e) => setForm({ ...form, old_code: e.target.value })} className={INPUT_CLS} maxLength={64} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">新编码</label>
                      <input value={form.new_code} onChange={(e) => setForm({ ...form, new_code: e.target.value })} className={INPUT_CLS} maxLength={64} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">适用范围</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {SCOPE_OPTIONS.map((scope) => (
                        <label key={scope} className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <input type="checkbox" checked={form.applicable_scopes.includes(scope)}
                            onChange={() => setForm({ ...form, applicable_scopes: toggleInArray(form.applicable_scopes, scope) })}
                            className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-blue-500" />
                          {scope}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 风格关联 */}
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-700 mb-2">关联风格</p>
                {styles.length === 0 ? (
                  <p className="text-xs text-gray-400">暂无风格，请先在「风格管理」中添加</p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {styles.map((s) => (
                      <label key={s.id} className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <input type="checkbox" checked={form.style_ids.includes(s.id)}
                          onChange={() => setForm({ ...form, style_ids: toggleInArray(form.style_ids, s.id) })}
                          className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-blue-500" />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{submitting ? '保存中...' : '保存'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ─── 删除确认 ─── */}
      {confirmOpen && confirmAction && (
        <ConfirmDialog open={confirmOpen} title={confirmAction.title} message={confirmAction.message} variant={confirmAction.variant} confirmText={confirmAction.confirmText}
          loading={confirmLoading} onConfirm={confirmAction.action} onClose={() => { setConfirmOpen(false); setConfirmAction(null); }} />
      )}
    </div>
  );
}
