/**
 * 真实数据种子脚本
 * 插入 ~10 组设计师、作品（带装修图片）到数据库
 *
 * 运行：node scripts/seed_realistic_data.js
 *
 * ⚠️ 会清空现有数据后重新插入（保留分类字典和管理员）
 */
const db = require('../src/db/connection');
const bcrypt = require('bcryptjs');

// ══════════════════════════════════════════
// 模拟装修图片 URL（使用 picsum 固定种子保证一致性）
// ══════════════════════════════════════════
function interiorImg(seed, w = 800, h = 600) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// 每组作品 3-6 张不同图片种子
const IMAGE_SETS = {
  living_room_modern: [
    { seed: 'living-modern-1', label: '客厅全景' },
    { seed: 'living-modern-2', label: '沙发区' },
    { seed: 'living-modern-3', label: '电视墙' },
    { seed: 'living-modern-4', label: '茶几细节' },
    { seed: 'living-modern-5', label: '灯具特写' },
  ],
  bedroom_nordic: [
    { seed: 'bed-nordic-1', label: '卧室全景' },
    { seed: 'bed-nordic-2', label: '床头柜' },
    { seed: 'bed-nordic-3', label: '衣柜' },
    { seed: 'bed-nordic-4', label: '窗帘' },
  ],
  kitchen_style: [
    { seed: 'kitchen-1', label: '厨房全景' },
    { seed: 'kitchen-2', label: '操作台' },
    { seed: 'kitchen-3', label: '橱柜' },
    { seed: 'kitchen-4', label: '岛台' },
  ],
  bathroom: [
    { seed: 'bath-1', label: '卫生间全景' },
    { seed: 'bath-2', label: '洗手台' },
    { seed: 'bath-3', label: '淋浴区' },
  ],
  full_house: [
    { seed: 'full-1', label: '客厅' },
    { seed: 'full-2', label: '主卧' },
    { seed: 'full-3', label: '次卧' },
    { seed: 'full-4', label: '厨房' },
    { seed: 'full-5', label: '卫生间' },
    { seed: 'full-6', label: '阳台' },
  ],
  study: [
    { seed: 'study-1', label: '书房全景' },
    { seed: 'study-2', label: '书架' },
    { seed: 'study-3', label: '书桌' },
  ],
  dining: [
    { seed: 'dining-1', label: '餐厅全景' },
    { seed: 'dining-2', label: '餐桌' },
    { seed: 'dining-3', label: '餐边柜' },
    { seed: 'dining-4', label: '吊灯' },
  ],
  balcony: [
    { seed: 'balcony-1', label: '阳台全景' },
    { seed: 'balcony-2', label: '绿植区' },
    { seed: 'balcony-3', label: '休闲椅' },
  ],
  new_chinese: [
    { seed: 'nchinese-1', label: '客厅' },
    { seed: 'nchinese-2', label: '茶室' },
    { seed: 'nchinese-3', label: '屏风' },
    { seed: 'nchinese-4', label: '博古架' },
    { seed: 'nchinese-5', label: '卧室' },
  ],
  industrial: [
    { seed: 'indust-1', label: '开放空间' },
    { seed: 'indust-2', label: '铁艺楼梯' },
    { seed: 'indust-3', label: '水泥墙面' },
    { seed: 'indust-4', label: '复古灯具' },
  ],
};

// ══════════════════════════════════════════
// 设计师数据
// ══════════════════════════════════════════
const DESIGNERS = [
  { name: '张明远', phone: '13900000101', years_of_exp: 12, bio: '资深室内设计师，擅长现代简约与新中式风格，曾获亚太室内设计大奖赛银奖。坚信好的设计应该让生活更简单。', openid: 'seed_designer_01', role: 'designer' },
  { name: '李雨桐', phone: '13900000102', years_of_exp: 8,  bio: '北欧风格研究专家，留学丹麦哥本哈根设计学院。注重空间的功能性与舒适度，擅长小户型空间最大化利用。', openid: 'seed_designer_02', role: 'designer' },
  { name: '王思涵', phone: '13900000103', years_of_exp: 5,  bio: '95后新锐设计师，擅长日式与极简风格。追求「少即是多」的设计理念，注重材质与光影的对话。', openid: 'seed_designer_03', role: 'designer' },
  { name: '陈建国', phone: '13900000104', years_of_exp: 15, bio: '从业15年的老牌设计师，工装家装双栖。擅长美式、工业风，对旧房改造有独到见解，已服务超过500个家庭。', openid: 'seed_designer_04', role: 'designer' },
  { name: '赵雪莹', phone: '13900000105', years_of_exp: 6,  bio: '轻奢风格代言人，专注高端住宅设计。擅长运用大理石、黄铜、丝绒等材质打造精致生活空间。', openid: 'seed_designer_05', role: 'designer' },
  { name: '刘浩然', phone: '13900000106', years_of_exp: 10, bio: '建筑设计出身，后转入室内设计。擅长复式、别墅等大宅设计，注重空间结构优化与动线规划。', openid: 'seed_designer_06', role: 'designer' },
  { name: '周雅文', phone: '13900000107', years_of_exp: 7,  bio: '软装搭配专家，擅长混搭风格。善于用软装饰品和色彩组合打造个性化空间，让每个家都有独特的温度。', openid: 'seed_designer_07', role: 'designer' },
  { name: '吴俊杰', phone: '13900000108', years_of_exp: 3,  bio: '新生代设计师，专注小户型改造。擅长用设计解决收纳难题，让50㎡住出80㎡的感觉。', openid: 'seed_designer_08', role: 'designer' },
  { name: '林美琪', phone: '13900000109', years_of_exp: 9,  bio: '地中海与田园风格爱好者，作品充满温馨与浪漫气息。相信家是避风港，设计应该让人感到放松和愉悦。', openid: 'seed_designer_09', role: 'designer' },
  { name: '黄志强', phone: '13900000110', years_of_exp: 11, bio: '跨界设计师，将酒店设计经验带入住宅领域。擅长打造酒店式公寓和精品住宅，追求品质与舒适并重。', openid: 'seed_designer_10', role: 'designer' },
];

// ══════════════════════════════════════════
// 作品数据（10 组）
// ══════════════════════════════════════════
// 注意：以下是数据库中实际的分类 ID
// house_type: 1=一室 2=两室 3=三室 4=四室及以上 5=复式跃层 6=别墅
// area:      7=客厅 8=卧室 9=厨房 10=卫生间 11=阳台 12=书房 13=玄关 14=餐厅 15=地板 16=墙壁 17=全屋
// style:    18=现代简约 19=北欧 20=新中式 21=日式 22=美式 23=工业风 24=轻奢 25=地中海 26=混搭
const WORKS = [
  {
    designerIdx: 0,
    title: '现代简约 — 朝阳公园三居室',
    description: '本案为朝阳公园旁 138㎡ 三居室改造。业主是一对年轻夫妻，希望打造一个明亮通透、简洁实用的居住空间。\n\n设计亮点：\n• 打通客厅与阳台，形成 42㎡ 超大公共区域\n• 全屋无主灯设计，用轨道灯 + 灯带营造层次感\n• 电视墙采用岩板 + 格栅拼接，简约不失质感\n• 主卧做整排嵌入式衣柜，收纳量翻倍\n• 厨房 U 型布局，操作动线流畅',
    house_type_id: 3, area_category_id: 17, style_category_id: 18,
    area_sqm: 138, budget_min: 25, budget_max: 35,
    imgSet: 'full_house', review_status: 'approved', is_hot: 1, view_count: 2847,
  },
  {
    designerIdx: 1,
    title: '北欧风情 — 华贸城温馨两居',
    description: '华贸城 89㎡ 两居室，打造温暖治愈的北欧风小家。\n\n设计思路：\n• 大面积白色 + 原木色打底，营造明亮温暖的基调\n• 客厅采用鱼骨拼木地板，视觉延伸感强\n• 沙发背景墙用莫兰迪绿做跳色，增添活力\n• 餐厅区域定制卡座，兼顾收纳与美观\n• 儿童房做榻榻米设计，空间利用率最大化',
    house_type_id: 2, area_category_id: 17, style_category_id: 19,
    area_sqm: 89, budget_min: 15, budget_max: 22,
    imgSet: 'bedroom_nordic', review_status: 'approved', is_hot: 1, view_count: 5621,
  },
  {
    designerIdx: 2,
    title: '日式极简 — 一居室小户型改造',
    description: '52㎡ 一居室小户型，用日式极简设计让空间翻倍。\n\n设计要点：\n• 玄关下沉式设计，自然分隔内外空间\n• 厨房与客厅之间用半高吧台过渡，保持通透感\n• 主卧做地台床 + 整墙衣柜，收纳功能强大\n• 卫生间干湿三分离，洗漱/如厕/淋浴互不干扰\n• 阳台改造成日式茶室，榻榻米 + 矮桌组合',
    house_type_id: 1, area_category_id: 17, style_category_id: 21,
    area_sqm: 52, budget_min: 8, budget_max: 14,
    imgSet: 'study', review_status: 'approved', is_hot: 1, view_count: 3892,
  },
  {
    designerIdx: 3,
    title: '工业风 LOFT — 798 艺术区复式',
    description: '798 艺术区旁 120㎡ LOFT 复式，完美诠释工业风美学。\n\n设计手法：\n• 保留原始混凝土墙面与裸露管道，强化工业基因\n• 黑色铁艺楼梯 + 玻璃扶手，通透不压抑\n• 一层全开放式布局，客厅/餐厅/厨房无隔断\n• 二层主卧用玻璃隔断，引入更多自然光\n• 软装搭配皮质沙发 + 金属灯具，硬朗中见精致',
    house_type_id: 5, area_category_id: 17, style_category_id: 23,
    area_sqm: 120, budget_min: 30, budget_max: 45,
    imgSet: 'industrial', review_status: 'approved', is_hot: 1, view_count: 2156,
  },
  {
    designerIdx: 4,
    title: '轻奢大理石 — 星河湾大平层',
    description: '星河湾 210㎡ 大平层，现代轻奢风格典范之作。\n\n材质运用：\n• 地面通铺卡拉卡塔白大理石，纹理优雅大气\n• 电视背景墙用潘多拉岩板 + 黄铜收边条\n• 餐厅整面墙做烤漆护墙板，内嵌酒柜\n• 主卧套间含衣帽间 + 四件套卫生间\n• 全屋智能灯光系统，场景模式一键切换',
    house_type_id: 4, area_category_id: 17, style_category_id: 24,
    area_sqm: 210, budget_min: 50, budget_max: 80,
    imgSet: 'living_room_modern', review_status: 'approved', is_hot: 1, view_count: 4230,
  },
  {
    designerIdx: 5,
    title: '新中式雅居 — 西山别墅',
    description: '西山脚下 350㎡ 独栋别墅，新中式风格的诗意栖居。\n\n设计手法：\n• 入户玄关设圆形镂空屏风，取「天圆地方」之意\n• 客厅挑高 6 米，整面水墨山水画背景墙\n• 茶室独立设计，榻榻米升降桌 + 博古架陈列\n• 书房用花梨木定制书柜，配官帽椅\n• 主卧做步入式衣帽间，卫生间干湿分离配浴缸\n• 庭院造景以枯山水为主题，禅意十足',
    house_type_id: 6, area_category_id: 17, style_category_id: 20,
    area_sqm: 350, budget_min: 120, budget_max: 200,
    imgSet: 'new_chinese', review_status: 'approved', is_hot: 1, view_count: 8912,
  },
  {
    designerIdx: 6,
    title: '混搭波西米亚 — 自由浪漫三居',
    description: '110㎡ 三居室，用混搭手法打造充满异域风情的波西米亚之家。\n\n搭配技巧：\n• 客厅铺摩洛哥手工地毯，搭配藤编吊椅\n• 墙面用植物标本 + 旅行照片打造回忆墙\n• 主卧用民族风床品 + 流苏挂毯做装饰\n• 阳台变身小型植物园，20+ 种绿植错落有致\n• 全屋配色大胆 — 芥末黄 + 孔雀蓝 + 陶土红',
    house_type_id: 3, area_category_id: 17, style_category_id: 26,
    area_sqm: 110, budget_min: 18, budget_max: 28,
    imgSet: 'dining', review_status: 'approved', is_hot: 0, view_count: 1756,
  },
  {
    designerIdx: 7,
    title: '小户型魔术 — 38㎡ 一居改两居',
    description: '38㎡ 老破小爆改，让一居室变两居室的神奇改造。\n\n改造策略：\n• 原客厅用玻璃推拉门隔出次卧，白天打开保持通透\n• 定制多功能家具 — 沙发床 + 折叠餐桌 + 隐藏书桌\n• 厨房做 U 型窄柜，60cm 深变 40cm 照样好用\n• 卫生间做壁龛收纳，不占地面面积\n• 全屋收纳空间高达 12m³，相当于 300 个登机箱',
    house_type_id: 1, area_category_id: 17, style_category_id: 18,
    area_sqm: 38, budget_min: 6, budget_max: 10,
    imgSet: 'bathroom', review_status: 'approved', is_hot: 0, view_count: 12450,
  },
  {
    designerIdx: 8,
    title: '地中海阳光 — 三亚度假公寓',
    description: '三亚海棠湾 95㎡ 度假公寓，地中海风格带来海风般清爽感受。\n\n设计元素：\n• 白墙 + 蓝门窗框，经典地中海配色\n• 地面铺仿古地砖，做旧质感\n• 拱形门洞连接各功能区，柔和通透\n• 阳台做吧台设计，面朝大海小酌一杯\n• 卧室用纱幔蚊帐 + 藤编家具，度假感十足',
    house_type_id: 2, area_category_id: 17, style_category_id: 25,
    area_sqm: 95, budget_min: 12, budget_max: 20,
    imgSet: 'balcony', review_status: 'approved', is_hot: 0, view_count: 3210,
  },
  {
    designerIdx: 9,
    title: '美式经典 — 顺义中央别墅区',
    description: '顺义 280㎡ 别墅，美式经典风格的沉稳与优雅。\n\n空间规划：\n• 一层：挑高客厅 + 正式餐厅 + 开放式厨房 + 书房\n• 二层：三间套房卧室 + 家庭活动室\n• 地下室：影音室 + 台球室 + 酒窖\n• 客厅壁炉 + 实木护墙板 + 水晶吊灯，仪式感满满\n• 厨房中岛台 + 早餐区，美式家庭生活的核心\n• 主卧做双开门设计，配独立起居室',
    house_type_id: 6, area_category_id: 17, style_category_id: 22,
    area_sqm: 280, budget_min: 80, budget_max: 120,
    imgSet: 'kitchen_style', review_status: 'approved', is_hot: 0, view_count: 5678,
  },
];

// ══════════════════════════════════════════
// 主流程
// ══════════════════════════════════════════
async function seed() {
  console.log('🌱 开始插入真实测试数据...\n');

  // ── 1. 清空数据（保留分类字典和管理员） ──
  console.log('  清空数据表...');
  await db('case_images').del();
  await db('cases').del();
  await db('image_library').del();
  await db('homepage_config').del();
  await db('designers').whereNot('role', 'admin').del();
  console.log('  ✅ 旧数据已清除\n');

  // ── 2. 创建设计师 ──
  console.log('  创建设计师...');
  const designerIds = [];
  for (const d of DESIGNERS) {
    const [id] = await db('designers').insert({
      openid: d.openid,
      name: d.name,
      phone: d.phone,
      years_of_exp: d.years_of_exp,
      bio: d.bio,
      role: d.role,
      status: 'active',
      is_bound: 1,
    });
    designerIds.push(id);
    console.log(`    👤 ${d.name} (${d.years_of_exp}年经验) — id=${id}`);
  }
  console.log();

  // ── 3. 为每个作品创建图片库记录 ──
  console.log('  创建图片库记录...');

  // 为每部作品预分配 image_library 记录
  const workImages = []; // workImages[workIdx] = [{id, url, thumb_url}]
  for (let wi = 0; wi < WORKS.length; wi++) {
    const imgSet = IMAGE_SETS[WORKS[wi].imgSet];
    const imgs = [];
    for (let ii = 0; ii < imgSet.length; ii++) {
      const seed = imgSet[ii].seed;
      const url = interiorImg(seed);
      const [id] = await db('image_library').insert({
        image_url: url,
        thumb_url: interiorImg(seed, 400, 300),
        original_name: `${seed}.jpg`,
        file_size: 0,
        uploaded_by: designerIds[WORKS[wi].designerIdx],
      });
      imgs.push({ id, url, thumb_url: interiorImg(seed, 400, 300) });
    }
    workImages.push(imgs);
    console.log(`    🖼️  "${WORKS[wi].title}" — ${imgs.length} 张图片`);
  }
  console.log();

  // ── 4. 创建作品 + 关联图片 ──
  console.log('  创建作品...');
  const workIds = [];
  for (let wi = 0; wi < WORKS.length; wi++) {
    const w = WORKS[wi];
    const designerId = designerIds[w.designerIdx];
    const imgs = workImages[wi];
    const coverUrl = imgs[0].url;

    const [caseId] = await db('cases').insert({
      title: w.title,
      description: w.description,
      house_type_id: w.house_type_id,
      area_category_id: w.area_category_id,
      style_category_id: w.style_category_id,
      area_sqm: w.area_sqm,
      budget_min: w.budget_min,
      budget_max: w.budget_max,
      designer_id: designerId,
      cover_image: coverUrl,
      review_status: w.review_status,
      is_hot: w.is_hot,
      view_count: w.view_count,
      created_at: randomDate(30),
      updated_at: randomDate(7),
    });
    workIds.push(caseId);

    // 关联图片到 case_images
    const caseImageRows = imgs.map((img, idx) => ({
      case_id: caseId,
      library_image_id: img.id,
      image_url: img.url,
      thumb_url: img.thumb_url,
      sort_order: idx,
    }));
    await db('case_images').insert(caseImageRows);

    const designerName = DESIGNERS[w.designerIdx].name;
    console.log(`    📐 #${caseId} "${w.title}" — ${w.area_sqm}㎡ — ${imgs.length}张图 — by ${designerName} (${w.review_status})`);
  }

  // ── 5. 首页配置（轮播图 + 热门推荐）── 使用实际作品 ID
  console.log('\n  创建首页配置...');
  // 轮播图：第 5 个作品（轻奢大理石，index=4）、第 8 个作品（小户型魔术，index=7）
  const banners = [
    {
      config_type: 'banner',
      config_value: JSON.stringify({
        image_url: 'https://picsum.photos/seed/banner-decoration-1/800/400',
        title: '2026 夏季装修节 — 全屋定制低至 7 折',
        link: '/pages/category/index',
      }),
      sort_order: 0,
    },
    {
      config_type: 'banner',
      config_value: JSON.stringify({
        image_url: 'https://picsum.photos/seed/banner-decoration-2/800/400',
        title: '轻奢风格特辑 — 精选 50 套大理石案例',
        link: String(workIds[4]), // 轻奢大理石大平层
      }),
      sort_order: 1,
    },
    {
      config_type: 'banner',
      config_value: JSON.stringify({
        image_url: 'https://picsum.photos/seed/banner-decoration-3/800/400',
        title: '小户型改造王 — 38㎡ 变两居的魔术',
        link: String(workIds[7]), // 小户型魔术
      }),
      sort_order: 2,
    },
  ];
  for (const b of banners) {
    await db('homepage_config').insert(b);
    const cv = JSON.parse(b.config_value);
    console.log(`    📱 轮播图: ${cv.title}`);
  }
  // 热门推荐：前 6 个作品
  const hotWorkIds = workIds.slice(0, 6);
  await db('homepage_config').insert({
    config_type: 'hot_works',
    config_value: JSON.stringify({
      title: '🔥 本周精选案例',
      work_ids: hotWorkIds,
    }),
    sort_order: 0,
  });
  console.log(`    🔥 热门推荐: 本周精选案例 — 作品 ${hotWorkIds.join(', ')}`);

  // ── 6. 更新管理员密码（确保可登录）──
  const adminHash = await bcrypt.hash('admin123', 10);
  await db('designers').where('username', 'admin').update({ password_hash: adminHash });

  // ── 7. 汇总 ──
  console.log('\n═══════════════════════════════════════');
  console.log('  🎉 种子数据插入完成！');
  console.log('═══════════════════════════════════════');
  console.log(`  设计师: ${designerIds.length} 人`);
  console.log(`  作品:   ${workIds.length} 个`);
  console.log(`  图片:   ${workImages.reduce((s, imgs) => s + imgs.length, 0)} 张`);
  console.log(`  轮播图: ${banners.length} 张`);
  console.log(`  热门推荐: 1 组`);
  console.log('\n  管理员登录: admin / admin123');
  console.log('  设计师手机号: 13900000101 ~ 13900000110');
  console.log('═══════════════════════════════════════\n');

  process.exit(0);
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 24));
  d.setMinutes(Math.floor(Math.random() * 60));
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

seed().catch((err) => {
  console.error('❌ 种子数据插入失败:', err);
  process.exit(1);
});
