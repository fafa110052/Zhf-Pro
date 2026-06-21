import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ImageSwiper from '../components/ImageSwiper';
import WorkInfo from '../components/WorkInfo';
import DesignerCard from '../components/DesignerCard';
import { getWorkDetail } from '../api/works';
import { formatArea, formatBudgetRange, formatTime } from '../utils/format';

export default function WorkDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [work, setWork] = useState(null);
  const [images, setImages] = useState([]);
  const [designer, setDesigner] = useState(null);
  const [currentSwiper, setCurrentSwiper] = useState(0);

  const loadDetail = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(false);

    try {
      const data = await getWorkDetail(Number(id));

      // 格式化图片列表
      const imgList = (data.images || []).map((img) => ({
        id: img.id,
        image_url: img.image_url,
        thumb_url: img.thumb_url || img.image_url,
      }));

      // 提取设计师信息
      const designerData = {
        id: data.designer_id,
        name: data.designer_name || '未知设计师',
        avatar_url: data.designer_avatar || '',
        phone: data.designer_phone || '',
        years_of_exp: data.designer_years || 0,
        bio: data.designer_bio || '',
      };

      // 格式化作品信息
      const workData = {
        title: data.title,
        description: data.description || '',
        house_type_name: data.house_type_name || '',
        area_category_name: data.area_category_name || '',
        style_category_name: data.style_category_name || '',
        area_text: formatArea(data.area_sqm),
        budget_text: formatBudgetRange(data.budget_min, data.budget_max),
        view_count: data.view_count || 0,
        created_at_text: formatTime(data.created_at, 'date'),
        cover_image: data.cover_image || '',
      };

      // 更新 document.title
      if (data.title) {
        document.title = data.title;
      }

      setImages(imgList);
      setDesigner(designerData);
      setWork(workData);
      setLoading(false);
    } catch (err) {
      console.error('作品详情加载失败:', err);
      setLoading(false);
      setError(true);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
    // 卸载时恢复标题
    return () => {
      document.title = '住好房 · 装修展示';
    };
  }, [loadDetail]);

  // ── 加载中 ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-400 mt-4">加载中...</span>
      </div>
    );
  }

  // ── 加载失败 ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20" onClick={loadDetail}>
        <span className="text-4xl">⚠️</span>
        <p className="text-sm text-gray-400 mt-3">加载失败</p>
        <p className="text-xs text-gray-300 mt-1">点击重试</p>
      </div>
    );
  }

  // ── 内容 ──
  if (!work) return null;

  return (
    <div className="space-y-3 pb-6">
      {/* 图片轮播 */}
      <ImageSwiper
        images={images}
        currentIndex={currentSwiper}
        onIndexChange={setCurrentSwiper}
        coverImage={work.cover_image}
      />

      {/* 作品信息 */}
      <div className="px-3">
        <WorkInfo work={work} />
      </div>

      {/* 设计师 */}
      <div className="px-3">
        <DesignerCard designer={designer} />
      </div>

      {/* 底部安全区 */}
      <div className="h-4" />
    </div>
  );
}
