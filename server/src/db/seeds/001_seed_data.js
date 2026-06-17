const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // 按外键依赖逆序清空
  await knex('case_images').del();
  await knex('image_library').del();
  await knex('cases').del();
  await knex('homepage_config').del();
  await knex('categories').del();
  await knex('designers').del();

  // ══════════════════════════════════════
  // 1. 管理员 + 示例设计师/监理
  // ══════════════════════════════════════
  const passwordHash = await bcrypt.hash('admin123', 10);
  const designerHash = await bcrypt.hash('test123', 10);

  await knex('designers').insert([
    {
      username: 'admin',
      password_hash: passwordHash,
      name: '系统管理员',
      phone: '13800000000',
      role: 'admin',
      status: 'active',
      personnel_type: 'designer',
    },
    {
      username: 'designer_li',
      password_hash: designerHash,
      name: '李工',
      phone: '13877776666',
      role: 'designer',
      status: 'active',
      personnel_type: 'designer',
      employee_id: 'D001',
      years_of_exp: 8,
      bio: '从业8年，擅长现代简约与新中式风格设计',
    },
    {
      username: 'supervisor_wang',
      password_hash: designerHash,
      name: '王监理',
      phone: '13988887777',
      role: 'designer',
      status: 'active',
      personnel_type: 'supervisor',
      employee_id: 'S001',
      years_of_exp: 12,
      bio: '12年工程监理经验，持一级建造师证书',
    },
    {
      username: 'designer_chen',
      password_hash: designerHash,
      name: '陈设计师',
      phone: '13666665555',
      role: 'designer',
      status: 'active',
      personnel_type: 'designer',
      employee_id: 'D002',
      years_of_exp: 5,
      bio: '专注北欧与日式风格，注重空间利用率',
    },
  ]);

  // ══════════════════════════════════════
  // 2. 分类字典（初始默认值）
  // ══════════════════════════════════════
  await knex('categories').insert([
    // —— 户型 ——
    { type: 'house_type', name: '一室', sort_order: 1 },
    { type: 'house_type', name: '两室', sort_order: 2 },
    { type: 'house_type', name: '三室', sort_order: 3 },
    { type: 'house_type', name: '四室及以上', sort_order: 4 },
    { type: 'house_type', name: '复式跃层', sort_order: 5 },
    { type: 'house_type', name: '别墅', sort_order: 6 },

    // —— 装修部位 ——
    { type: 'area', name: '客厅', sort_order: 1 },
    { type: 'area', name: '卧室', sort_order: 2 },
    { type: 'area', name: '厨房', sort_order: 3 },
    { type: 'area', name: '卫生间', sort_order: 4 },
    { type: 'area', name: '阳台', sort_order: 5 },
    { type: 'area', name: '书房', sort_order: 6 },
    { type: 'area', name: '玄关', sort_order: 7 },
    { type: 'area', name: '餐厅', sort_order: 8 },
    { type: 'area', name: '地板', sort_order: 9 },
    { type: 'area', name: '墙壁', sort_order: 10 },
    { type: 'area', name: '全屋', sort_order: 11 },

    // —— 风格 ——
    { type: 'style', name: '现代简约', sort_order: 1 },
    { type: 'style', name: '北欧', sort_order: 2 },
    { type: 'style', name: '新中式', sort_order: 3 },
    { type: 'style', name: '日式', sort_order: 4 },
    { type: 'style', name: '美式', sort_order: 5 },
    { type: 'style', name: '工业风', sort_order: 6 },
    { type: 'style', name: '轻奢', sort_order: 7 },
    { type: 'style', name: '地中海', sort_order: 8 },
    { type: 'style', name: '混搭', sort_order: 9 },
  ]);

  // ══════════════════════════════════════
  // 3. 首页 Banner 配置 — 真实照片
  // ══════════════════════════════════════
  const B = (id) => `https://picsum.photos/id/${id}/750/400`;
  await knex('homepage_config').insert([
    { config_type: 'banner', config_value: JSON.stringify({ image_url: B(15), title: '住好房装修展示平台', link: '' }), sort_order: 1 },
    { config_type: 'banner', config_value: JSON.stringify({ image_url: B(165), title: '在线选材 — 楼盘专属硬装方案', link: '/pages/material-properties/index' }), sort_order: 2 },
    { config_type: 'banner', config_value: JSON.stringify({ image_url: B(315), title: '精选设计案例', link: '' }), sort_order: 3 },
  ]);

  // ══════════════════════════════════════
  // 4. 梧州装修案例（10 组通过审核的作品）— 真实装修照片
  //    designer_id: 2=李工, 4=陈设计师
  //    category FK → house_type(1-6), area(7-17), style(18-26)
  // ══════════════════════════════════════
  const C = (id) => `https://picsum.photos/id/${id}/600/400`;
  const caseIds = [21, 72, 123, 174, 225, 276, 327, 378, 429, 480];

  const works = [
    { title: '碧桂园翡翠湾 · 现代简约三居', description: '120㎡现代简约风，全屋定制柜体+无主灯设计，打造通透大气的居住空间', designer_id: 2, house_type_id: 3, area_category_id: 11, style_category_id: 18, area_sqm: 120, budget_min: 120000, budget_max: 150000 },
    { title: '彰泰城玫瑰园 · 新中式雅居', description: '140㎡新中式风格，实木家具搭配水墨意境墙面，彰显东方韵味', designer_id: 2, house_type_id: 4, area_category_id: 11, style_category_id: 20, area_sqm: 140, budget_min: 180000, budget_max: 220000 },
    { title: '丽港华府 · 北欧风小三居', description: '89㎡北欧风，白+原木配色，开放式厨房+岛台设计', designer_id: 4, house_type_id: 2, area_category_id: 11, style_category_id: 19, area_sqm: 89, budget_min: 80000, budget_max: 100000 },
    { title: '恒大绿洲 · 轻奢大平层', description: '180㎡轻奢风，大理石+金属线条+智能家居系统', designer_id: 2, house_type_id: 5, area_category_id: 11, style_category_id: 24, area_sqm: 180, budget_min: 280000, budget_max: 350000 },
    { title: '万达广场 · 日式原木风', description: '95㎡日式原木风，榻榻米书房+枯山水阳台小景', designer_id: 4, house_type_id: 3, area_category_id: 11, style_category_id: 21, area_sqm: 95, budget_min: 90000, budget_max: 110000 },
    { title: '海骏达花园 · 美式复古四居', description: '160㎡美式复古风，实木护墙板+复古地砖+壁炉造型', designer_id: 2, house_type_id: 4, area_category_id: 11, style_category_id: 22, area_sqm: 160, budget_min: 200000, budget_max: 260000 },
    { title: '灏景尚都 · 工业风LOFT', description: '75㎡工业风LOFT，裸露砖墙+铁艺+轨道灯，年轻个性之选', designer_id: 4, house_type_id: 1, area_category_id: 11, style_category_id: 23, area_sqm: 75, budget_min: 60000, budget_max: 80000 },
    { title: '半山一品 · 地中海别墅', description: '280㎡地中海风格别墅，拱门+蓝白配色+庭院景观', designer_id: 2, house_type_id: 6, area_category_id: 11, style_category_id: 25, area_sqm: 280, budget_min: 500000, budget_max: 650000 },
    { title: '金色港湾 · 混搭风两居', description: '88㎡混搭风，北欧+工业元素碰撞，打造个性化小空间', designer_id: 4, house_type_id: 2, area_category_id: 11, style_category_id: 26, area_sqm: 88, budget_min: 70000, budget_max: 90000 },
    { title: '阳光100 · 现代简约厨房改造', description: '厨房+卫生间局部改造，面积45㎡，现代简约', designer_id: 2, house_type_id: 1, area_category_id: 10, style_category_id: 18, area_sqm: 45, budget_min: 35000, budget_max: 50000 },
  ];

  // 作品详情图 ID（每个案例 3 张，共 30 张，真实照片）
  const ciBase = [
    [31, 41, 53], [63, 75, 85], [96, 106, 117], [127, 138, 148], [159, 169, 180],
    [190, 206, 216], [227, 237, 248], [258, 269, 279], [290, 300, 311], [321, 332, 342],
  ];

  for (let wi = 0; wi < works.length; wi++) {
    const w = works[wi];
    const [caseId] = await knex('cases').insert({
      ...w,
      cover_image: C(caseIds[wi]),
      review_status: 'approved',
      reviewed_by: 1,
      reviewed_at: knex.fn.now(),
      is_hot: w.budget_min > 150000 ? 1 : 0,
      view_count: Math.floor(Math.random() * 2000) + 100,
      completion_date: '2026-05-01',
    });

    // 每个案例 3 张真实详情图
    for (let i = 0; i < 3; i++) {
      await knex('case_images').insert({
        case_id: caseId,
        image_url: C(ciBase[wi][i]),
        sort_order: i,
      });
    }
  }
};
