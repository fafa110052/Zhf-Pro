const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // 按外键依赖逆序清空（从叶子表到根表）
  await knex('construction_phase_logs').del();
  await knex('construction_phases').del();
  await knex('material_order_logs').del();
  await knex('material_order_items').del();
  await knex('material_orders').del();
  await knex('case_images').del();
  await knex('cases').del();
  await knex('image_library').del();
  await knex('homepage_config').del();
  await knex('materials').del();
  await knex('material_categories').del();
  await knex('designers').del();        // designers.owner_property_id → properties
  await knex('properties').del();
  await knex('categories').del();

  // ══════════════════════════════════════
  // 1. 管理员 + 设计师
  // ══════════════════════════════════════
  const passwordHash = await bcrypt.hash('admin123', 10);
  const designerHash = await bcrypt.hash('test123', 10);

  const [adminRow] = await knex('designers').insert({
    username: 'admin', password_hash: passwordHash, name: '系统管理员',
    phone: '13800000000', role: 'admin', status: 'active', personnel_type: 'designer',
  }).returning('id');
  const adminId = adminRow.id;

  const [liRow] = await knex('designers').insert({
    username: 'designer_li', password_hash: designerHash, name: '李工',
    phone: '13877776666', role: 'designer', status: 'active', personnel_type: 'designer',
    employee_id: 'D001', years_of_exp: 8, bio: '从业8年，擅长现代简约与新中式风格设计',
  }).returning('id');
  const liId = liRow.id;

  const [chenRow] = await knex('designers').insert({
    username: 'designer_chen', password_hash: designerHash, name: '陈设计师',
    phone: '13666665555', role: 'designer', status: 'active', personnel_type: 'designer',
    employee_id: 'D002', years_of_exp: 5, bio: '专注北欧与日式风格，注重空间利用率',
  }).returning('id');
  const chenId = chenRow.id;

  const [zhangRow] = await knex('designers').insert({
    username: 'designer_zhang', password_hash: designerHash, name: '张设计师',
    phone: '13555554444', role: 'designer', status: 'active', personnel_type: 'designer',
    employee_id: 'D003', years_of_exp: 10, bio: '十年从业经验，擅长轻奢与美式风格，大宅设计经验丰富',
  }).returning('id');
  const zhangId = zhangRow.id;

  // ══════════════════════════════════════
  // 2. 分类字典
  // ══════════════════════════════════════

  // 户型：按顺序插入后记录 ID
  const houseTypeNames = ['一室', '两室', '三室', '四室及以上', '复式跃层', '别墅'];
  const houseTypeIds = [];
  for (let i = 0; i < houseTypeNames.length; i++) {
    const [row] = await knex('categories').insert({
      type: 'house_type', name: houseTypeNames[i], sort_order: i + 1,
    }).returning('id');
    houseTypeIds.push(row.id);
  }

  // 装修部位
  const areaNames = ['客厅', '卧室', '厨房', '卫生间', '阳台', '书房', '玄关', '餐厅', '儿童房', '全屋'];
  const areaIds = [];
  for (let i = 0; i < areaNames.length; i++) {
    const [row] = await knex('categories').insert({
      type: 'area', name: areaNames[i], sort_order: i + 1,
    }).returning('id');
    areaIds.push(row.id);
  }

  // 风格
  const styleNames = ['现代简约', '北欧', '新中式', '日式', '美式', '工业风', '轻奢', '地中海', '混搭', '法式', '侘寂风'];
  const styleIds = [];
  for (let i = 0; i < styleNames.length; i++) {
    const [row] = await knex('categories').insert({
      type: 'style', name: styleNames[i], sort_order: i + 1,
    }).returning('id');
    styleIds.push(row.id);
  }

  // 快捷取 ID 的辅助函数（基于 0-index）
  const HT  = (i) => houseTypeIds[i];
  const AR  = (i) => areaIds[i];
  const ST  = (i) => styleIds[i];

  // ══════════════════════════════════════
  // 3. 首页 Banner
  // ══════════════════════════════════════
  const B = (id) => `/api/v1/placeholder/${id}/750/400`;
  await knex('homepage_config').insert([
    { config_type: 'banner', config_value: JSON.stringify({ image_url: B(30), title: '精选设计案例 · 一站式装修展示', link: '' }), sort_order: 1 },
    { config_type: 'banner', config_value: JSON.stringify({ image_url: B(55), title: '现代简约 · 轻奢 · 新中式 · 北欧', link: '' }), sort_order: 2 },
    { config_type: 'banner', config_value: JSON.stringify({ image_url: B(100), title: '优选设计师 · 品质生活从这里开始', link: '' }), sort_order: 3 },
    { config_type: 'banner', config_value: JSON.stringify({ image_url: B(142), title: '看案例找灵感 · 风格随心选', link: '' }), sort_order: 4 },
  ]);

  // ══════════════════════════════════════
  // 4. 装修作品（16 组）
  //    designer: liId(李工), chenId(陈), zhangId(张)
  //    reviewed_by: adminId
  // ══════════════════════════════════════

  const D = { li: liId, chen: chenId, zhang: zhangId };
  const coverIds = [15, 32, 48, 65, 78, 92, 108, 120, 135, 150, 167, 180, 195, 210, 225, 240];

  // 每个索引对应：{ designer, houseType(0-5), area(0-9), style(0-10), sqm, budgetMin, budgetMax }
  const works = [
    // —— 全屋整装 ——
    { title: '碧桂园翡翠湾 · 现代简约三居', description: '120㎡现代简约风，全屋定制柜体+无主灯设计，打造通透大气的居住空间。客厅采用岩板电视墙，卧室通铺实木地板。', designer: D.li, houseType: 2, area: 9, style: 0, area_sqm: 120, budget_min: 120000, budget_max: 150000 },
    { title: '彰泰城玫瑰园 · 新中式雅居', description: '140㎡新中式风格，实木家具搭配水墨意境墙面，彰显东方韵味。入户玄关设圆形镂空隔断，营造中式园林意境。', designer: D.li, houseType: 3, area: 9, style: 2, area_sqm: 140, budget_min: 180000, budget_max: 220000 },
    { title: '丽港华府 · 北欧风小三居', description: '89㎡北欧风，白+原木配色，开放式厨房+岛台设计。全屋通铺浅木色地板，墙面留白搭配绿植点缀。', designer: D.chen, houseType: 1, area: 9, style: 1, area_sqm: 89, budget_min: 80000, budget_max: 100000 },
    { title: '恒大绿洲 · 轻奢大平层', description: '180㎡轻奢风，大理石地面+金属线条+智能家居系统。客厅挑高设计，水晶吊灯搭配整面落地窗。', designer: D.zhang, houseType: 4, area: 9, style: 6, area_sqm: 180, budget_min: 280000, budget_max: 350000 },
    { title: '万达广场 · 日式原木风', description: '95㎡日式原木风，榻榻米书房+枯山水阳台小景。全屋采用障子纸推拉门，营造日式禅意氛围。', designer: D.chen, houseType: 2, area: 9, style: 3, area_sqm: 95, budget_min: 90000, budget_max: 110000 },
    { title: '海骏达花园 · 法式轻奢四居', description: '160㎡法式轻奢风，石膏线条+人字拼地板+大理石壁炉造型。主卧套房设计，衣帽间+双台盆卫生间。', designer: D.zhang, houseType: 3, area: 9, style: 9, area_sqm: 160, budget_min: 220000, budget_max: 280000 },
    { title: '阳光100 · 侘寂风两居', description: '78㎡侘寂风，微水泥墙面+原木+亚麻材质，回归自然本质。全屋无主灯，以柔和间接光营造静谧氛围。', designer: D.chen, houseType: 1, area: 9, style: 10, area_sqm: 78, budget_min: 100000, budget_max: 130000 },
    { title: '半山一品 · 现代别墅', description: '280㎡现代风格别墅，挑高客厅+全景落地窗+下沉式庭院。室内外空间自然过渡，泳池与客厅仅一窗之隔。', designer: D.zhang, houseType: 5, area: 9, style: 0, area_sqm: 280, budget_min: 500000, budget_max: 650000 },

    // —— 局部空间 ——
    { title: '丽港华府 · 开放式厨房改造', description: '打通原有封闭厨房，U型布局+中岛台设计。白色烤漆柜门配石英石台面，嵌入式洗碗机+蒸烤一体机。', designer: D.li, houseType: 2, area: 2, style: 0, area_sqm: 18, budget_min: 35000, budget_max: 50000 },
    { title: '碧桂园 · 主卧套房设计', description: '25㎡主卧+衣帽间套房，床头硬包背景+线性灯带。步入式衣帽间U型布局，长虹玻璃柜门。', designer: D.chen, houseType: 2, area: 1, style: 6, area_sqm: 25, budget_min: 45000, budget_max: 60000 },
    { title: '恒大绿洲 · 新中式书房', description: '15㎡独立书房，整墙实木书柜+茶台设计。博古架展示收藏品，窗外绿植成荫，品茗读书两相宜。', designer: D.li, houseType: 3, area: 5, style: 2, area_sqm: 15, budget_min: 25000, budget_max: 35000 },
    { title: '万达广场 · 工业风客厅', description: '40㎡客厅改造，裸露砖墙+铁艺+皮革沙发。电视墙采用清水混凝土质感，轨道射灯营造氛围。', designer: D.chen, houseType: 2, area: 0, style: 5, area_sqm: 40, budget_min: 40000, budget_max: 55000 },
    { title: '彰泰城 · 少女风儿童房', description: '16㎡女孩房设计，粉白色调+城堡造型床+星星灯。墙面手绘童话场景，收纳与趣味兼得。', designer: D.zhang, houseType: 2, area: 8, style: 1, area_sqm: 16, budget_min: 18000, budget_max: 25000 },
    { title: '半山一品 · 地中海卫生间', description: '10㎡主卫，蓝色马赛克+白色洁具+拱形镜面。干湿分离设计，独立浴缸靠窗而置。', designer: D.zhang, houseType: 3, area: 3, style: 7, area_sqm: 10, budget_min: 28000, budget_max: 38000 },
    { title: '海骏达 · 美式玄关设计', description: '8㎡入户玄关，实木鞋柜+换鞋凳+穿衣镜一体化设计。地面拼花瓷砖区分玄关区域，仪式感十足。', designer: D.li, houseType: 3, area: 6, style: 4, area_sqm: 8, budget_min: 12000, budget_max: 18000 },
    { title: '丽港华府 · 混搭风餐厅', description: '20㎡餐厅设计，大理石餐桌+丝绒餐椅+黄铜吊灯。餐边柜嵌入式恒温酒柜，北欧+轻奢元素碰撞。', designer: D.chen, houseType: 2, area: 7, style: 8, area_sqm: 20, budget_min: 20000, budget_max: 30000 },
  ];

  // 每件作品 5 张详情图
  const ciGroups = [
    [40, 42, 55, 60, 64], [70, 73, 78, 82, 88], [95, 100, 105, 110, 115],
    [125, 130, 135, 140, 148], [155, 160, 165, 170, 178], [185, 190, 195, 200, 208],
    [215, 220, 225, 230, 238], [245, 250, 255, 260, 268],
    [275, 280, 285, 290, 298], [305, 310, 315, 320, 328],
    [335, 340, 345, 350, 358], [365, 370, 375, 380, 388],
    [395, 400, 405, 410, 418], [425, 430, 435, 440, 448],
    [455, 460, 465, 470, 478], [485, 490, 495, 500, 508],
  ];

  const C = (id) => `/api/v1/placeholder/${id}/600/400`;

  for (let wi = 0; wi < works.length; wi++) {
    const w = works[wi];
    const isHot = w.budget_min > 120000 ? 1 : 0;
    const viewCount = Math.floor(Math.random() * 3500) + 200;

    const [caseRow] = await knex('cases').insert({
      title: w.title,
      description: w.description,
      designer_id: w.designer,
      house_type_id: HT(w.houseType),
      area_category_id: AR(w.area),
      style_category_id: ST(w.style),
      area_sqm: w.area_sqm,
      budget_min: w.budget_min,
      budget_max: w.budget_max,
      cover_image: C(coverIds[wi]),
      review_status: 'approved',
      reviewed_by: adminId,
      reviewed_at: knex.fn.now(),
      is_hot: isHot,
      view_count: viewCount,
      completion_date: '2026-05-01',
    }).returning('id');
    const caseId = caseRow.id;

    // 每件作品 5 张详情图
    for (let i = 0; i < 5; i++) {
      await knex('case_images').insert({
        case_id: caseId,
        image_url: C(ciGroups[wi][i]),
        sort_order: i,
      });
    }
  }
};
