const db = require('../db/connection');

/**
 * 仪表盘统计业务逻辑（B端管理后台）
 */
const dashboardService = {
  // ==========================================
  // 概览卡片数据
  // ==========================================
  async overview() {
    const [worksCount] = await db('cases')
      .where('review_status', 'approved')
      .count('* as total');

    const [designersCount] = await db('designers')
      .where('role', 'designer')
      .where('status', 'active')
      .count('* as total');

    const [viewsTotal] = await db('cases')
      .where('review_status', 'approved')
      .sum('view_count as total');

    const [pendingCount] = await db('cases')
      .where('review_status', 'pending')
      .count('* as total');

    const [categoriesCount] = await db('categories')
      .where('is_active', 1)
      .count('* as total');

    // 最近 5 个审核通过的作品
    const recentWorks = await db('cases')
      .select('id', 'title', 'cover_image', 'view_count', 'created_at')
      .where('review_status', 'approved')
      .orderBy('created_at', 'desc')
      .limit(5);

    return {
      total_works: worksCount.total,
      total_designers: designersCount.total,
      total_views: viewsTotal.total || 0,
      pending_reviews: pendingCount.total,
      total_categories: categoriesCount.total,
      recent_works: recentWorks,
    };
  },

  // ==========================================
  // 趋势数据（按月统计）
  // ==========================================
  async trends(months = 12) {
    const limit = Math.min(24, Math.max(1, parseInt(months) || 12));

    // 作品按月新增量
    const worksByMonth = await db('cases')
      .select(db.raw("strftime('%Y-%m', created_at) as month"))
      .count('* as count')
      .groupBy('month')
      .orderBy('month', 'asc')
      .limit(limit);

    // 浏览量按月总计（基于 created_at 时间段内的浏览）
    const viewsByMonth = await db('cases')
      .select(db.raw("strftime('%Y-%m', created_at) as month"))
      .sum('view_count as total')
      .groupBy('month')
      .orderBy('month', 'asc')
      .limit(limit);

    return {
      works_by_month: worksByMonth,
      views_by_month: viewsByMonth,
    };
  },

  // ==========================================
  // 分类分布数据（饼图用）
  // ==========================================
  async distribution() {
    // 按户型分布
    const byHouseType = await db('cases')
      .select('categories.name', db.raw('COUNT(*) as count'))
      .join('categories', 'cases.house_type_id', 'categories.id')
      .where('cases.review_status', 'approved')
      .groupBy('cases.house_type_id')
      .orderBy('count', 'desc');

    // 按装修空间分布
    const byArea = await db('cases')
      .select('categories.name', db.raw('COUNT(*) as count'))
      .join('categories', 'cases.area_category_id', 'categories.id')
      .where('cases.review_status', 'approved')
      .groupBy('cases.area_category_id')
      .orderBy('count', 'desc');

    // 按风格分布
    const byStyle = await db('cases')
      .select('categories.name', db.raw('COUNT(*) as count'))
      .join('categories', 'cases.style_category_id', 'categories.id')
      .where('cases.review_status', 'approved')
      .groupBy('cases.style_category_id')
      .orderBy('count', 'desc');

    return {
      by_house_type: byHouseType,
      by_area: byArea,
      by_style: byStyle,
    };
  },
};

module.exports = dashboardService;
