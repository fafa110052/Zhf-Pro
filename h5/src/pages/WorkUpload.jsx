import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategories } from '../api/works';
import { getMyWorkDetail, createWork, updateWork, uploadImage } from '../api/designer';

const MAX_IMAGES = 9;

export default function WorkUpload() {
  const navigate = useNavigate();
  const { id: editId } = useParams(); // 编辑模式有 id
  const fileInputRef = useRef(null);

  // 表单
  const [form, setForm] = useState({
    title: '',
    description: '',
    house_type_id: '',
    area_category_id: '',
    style_category_id: '',
    area_sqm: '',
    budget_min: '',
    budget_max: '',
  });
  const [errors, setErrors] = useState({});

  // 分类
  const [categories, setCategories] = useState(null);

  // 图片
  const [serverImages, setServerImages] = useState([]); // 已有的服务端图片
  const [localImages, setLocalImages] = useState([]);   // 新选的本地文件 { file, preview }
  const [coverIndex, setCoverIndex] = useState(0);       // 封面在全部图片中的索引
  const [removedImageIds, setRemovedImageIds] = useState([]); // 编辑时被删的已有图片ID

  // 状态
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // 总图片数 = 服务器剩余 + 本地新选
  const totalImages = (serverImages.length - removedImageIds.length) + localImages.length;

  // 加载分类 & 编辑数据
  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch {
        // 分类加载失败仍可继续
      }

      if (editId) {
        try {
          const work = await getMyWorkDetail(editId);
          setForm({
            title: work.title || '',
            description: work.description || '',
            house_type_id: work.house_type_id || '',
            area_category_id: work.area_category_id || '',
            style_category_id: work.style_category_id || '',
            area_sqm: work.area_sqm || '',
            budget_min: work.budget_min || '',
            budget_max: work.budget_max || '',
          });
          const imgs = (work.images || []).map((img, i) => ({
            id: img.id,
            image_url: img.image_url,
            thumb_url: img.thumb_url,
          }));
          setServerImages(imgs);
          // 找封面图索引
          const coverUrl = work.cover_image;
          const ci = imgs.findIndex((img) => img.image_url === coverUrl);
          setCoverIndex(ci >= 0 ? ci : 0);
        } catch {
          setFetchError(true);
        }
      }
      setLoading(false);
    })();
  }, [editId]);

  // ─── 表单更新 ───
  const updateField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  // ─── 图片操作 ───
  const handleChooseImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - totalImages;
    if (remaining <= 0) return;

    const selected = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setLocalImages((prev) => [...prev, ...selected]);

    // 如果是第一张图，自动设为封面
    if (coverIndex < 0 && totalImages === 0 && selected.length > 0) {
      setCoverIndex(0);
    }

    // 重置 input 以便重复选同一文件
    e.target.value = '';
  };

  const handleRemoveLocal = (index) => {
    const removed = localImages[index];
    if (removed) URL.revokeObjectURL(removed.preview);
    setLocalImages((prev) => prev.filter((_, i) => i !== index));

    // 调整封面索引
    const globalIdx = (serverImages.length - removedImageIds.length) + index;
    if (coverIndex === globalIdx) {
      setCoverIndex(0);
    } else if (coverIndex > globalIdx) {
      setCoverIndex((c) => c - 1);
    }
  };

  const handleRemoveServer = (index) => {
    const img = serverImages[index];
    setRemovedImageIds((prev) => [...prev, img.id]);

    // 调整封面索引
    if (coverIndex === index) {
      setCoverIndex(0);
    } else if (coverIndex > index) {
      setCoverIndex((c) => c - 1);
    }
  };

  // ─── 校验 ───
  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = '请输入作品标题';
    if (!form.house_type_id) errs.house_type_id = '请选择户型';
    if (!form.area_category_id) errs.area_category_id = '请选择装修部位';
    if (!form.style_category_id) errs.style_category_id = '请选择装修风格';
    if (totalImages === 0) errs.images = '请至少上传一张图片';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── 提交 ───
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      // 1. 上传本地图片
      const uploadedIds = [];
      for (const img of localImages) {
        try {
          const result = await uploadImage(img.file);
          uploadedIds.push(result.id);
        } catch (err) {
          alert(`图片上传失败: ${err?.message || '未知错误'}`);
          setSubmitting(false);
          return;
        }
      }

      // 2. 收集所有图片 ID（未删除的已有 + 新上传的）
      const remainingServer = serverImages
        .filter((img) => !removedImageIds.includes(img.id))
        .map((img) => img.id);
      const allImageIds = [...remainingServer, ...uploadedIds];

      // 3. 确定封面
      const activeServerImages = serverImages.filter((img) => !removedImageIds.includes(img.id));
      let coverImageUrl = '';
      if (coverIndex < activeServerImages.length) {
        coverImageUrl = activeServerImages[coverIndex]?.image_url || '';
      }

      // 4. 构建提交数据
      const data = {
        title: form.title.trim(),
        description: form.description.trim(),
        house_type_id: Number(form.house_type_id),
        area_category_id: Number(form.area_category_id),
        style_category_id: Number(form.style_category_id),
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        images: allImageIds.map((id) => ({ id })),
        cover_image: coverImageUrl,
      };

      // 5. 创建或更新
      if (editId) {
        await updateWork(editId, data);
      } else {
        await createWork(data);
      }

      navigate('/work-manage', { replace: true });
    } catch (err) {
      alert(err?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 渲染选择器选项 ───
  const renderSelect = (key, label, list) => {
    const value = form[key];
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label} <span className="text-red-400">*</span></label>
        <select
          value={value}
          onChange={(e) => updateField(key, e.target.value)}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent appearance-none bg-white ${
            errors[key] ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">请选择{label}</option>
          {(list || []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors[key] && <p className="text-xs text-red-400 mt-0.5">{errors[key]}</p>}
      </div>
    );
  };

  // ─── 渲染 ───
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <span className="w-5 h-5 border-2 border-gray-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-400 text-sm mb-3">加载作品数据失败</p>
        <button onClick={() => navigate('/work-manage')} className="px-4 py-2 bg-slate-900 text-white text-xs rounded-lg">返回</button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-10 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 active:text-gray-600">
          取消
        </button>
        <h2 className="text-sm font-semibold text-gray-900">{editId ? '编辑作品' : '上传作品'}</h2>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-sm font-medium text-slate-900 disabled:opacity-30 active:text-slate-600"
        >
          {submitting ? '提交中...' : '保存'}
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* 图片上传区 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">
            作品图片 <span className="text-red-400">*</span>
            <span className="text-gray-300 ml-1">({totalImages}/{MAX_IMAGES})</span>
          </p>
          {errors.images && <p className="text-xs text-red-400 mb-2">{errors.images}</p>}

          <div className="grid grid-cols-3 gap-2">
            {/* 已有图片 */}
            {serverImages.map((img, i) => {
              if (removedImageIds.includes(img.id)) return null;
              const isCover = coverIndex === i;
              return (
                <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={img.thumb_url || img.image_url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveServer(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full text-[10px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                  {isCover && (
                    <span className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-white text-[10px] text-center py-0.5">
                      封面
                    </span>
                  )}
                  {!isCover && (
                    <button
                      onClick={() => setCoverIndex(i)}
                      className="absolute bottom-0 left-0 right-0 bg-black/30 text-white text-[10px] text-center py-0.5 opacity-0 hover:opacity-100 active:opacity-100"
                    >
                      设为封面
                    </button>
                  )}
                </div>
              );
            })}

            {/* 新选的图片 */}
            {localImages.map((img, i) => {
              const globalIdx = (serverImages.length - removedImageIds.length) + i;
              const isCover = coverIndex === globalIdx;
              return (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveLocal(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full text-[10px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                  {isCover && (
                    <span className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-white text-[10px] text-center py-0.5">
                      封面
                    </span>
                  )}
                  {!isCover && (
                    <button
                      onClick={() => setCoverIndex(globalIdx)}
                      className="absolute bottom-0 left-0 right-0 bg-black/30 text-white text-[10px] text-center py-0.5 opacity-0 hover:opacity-100 active:opacity-100"
                    >
                      设为封面
                    </button>
                  )}
                </div>
              );
            })}

            {/* 添加按钮 */}
            {totalImages < MAX_IMAGES && (
              <button
                onClick={handleChooseImage}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center active:bg-gray-50"
              >
                <span className="text-2xl text-gray-300">+</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* 表单 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">作品标题 <span className="text-red-400">*</span></label>
            <input
              type="text"
              maxLength={50}
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="输入作品标题"
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <span className="text-[10px] text-gray-300 mt-0.5 block text-right">{form.title.length}/50</span>
            {errors.title && <p className="text-xs text-red-400 mt-0.5">{errors.title}</p>}
          </div>

          {/* 分类选择 */}
          {renderSelect('house_type_id', '户型', categories?.house_type)}
          {renderSelect('area_category_id', '装修部位', categories?.area)}
          {renderSelect('style_category_id', '装修风格', categories?.style)}

          {/* 面积 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">面积（㎡）</label>
            <input
              type="number"
              value={form.area_sqm}
              onChange={(e) => updateField('area_sqm', e.target.value)}
              placeholder="如 90"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* 预算 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">最低预算（万元）</label>
              <input
                type="number"
                value={form.budget_min}
                onChange={(e) => updateField('budget_min', e.target.value)}
                placeholder="如 3"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">最高预算（万元）</label>
              <input
                type="number"
                value={form.budget_max}
                onChange={(e) => updateField('budget_max', e.target.value)}
                placeholder="如 10"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">作品描述</label>
            <textarea
              maxLength={500}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="描述一下这个作品…"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
            />
            <span className="text-[10px] text-gray-300 mt-0.5 block text-right">{form.description.length}/500</span>
          </div>
        </div>
      </div>
    </div>
  );
}
