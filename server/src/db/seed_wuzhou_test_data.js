/**
 * 梧州测试数据种子脚本
 *
 * 用途：为测试环境添加梧州范围内真实楼盘 + 选材数据
 * 运行：cd server && node src/db/seed_wuzhou_test_data.js
 */
const knex = require('knex')({
  client: 'better-sqlite3',
  connection: { filename: './data/database.sqlite' },
  useNullAsDefault: true,
});

// ═══ 材料分类（全局共享）═══
const categories = [
  { name: '地板',   sort_order: 1 },
  { name: '墙面',   sort_order: 2 },
  { name: '卫浴',   sort_order: 3 },
  { name: '橱柜',   sort_order: 4 },
  { name: '门窗',   sort_order: 5 },
  { name: '瓷砖',   sort_order: 6 },
  { name: '涂料',   sort_order: 7 },
  { name: '灯具',   sort_order: 8 },
];

// ═══ 梧州真实楼盘 ═══
const properties = [
  { name: '彰泰玫瑰园',   address: '梧州市长洲区新兴三路18号',          property_code: '01' },
  { name: '恒大绿洲',     address: '梧州市龙圩区苍海路6号',             property_code: '02' },
  { name: '碧桂园凤凰台', address: '梧州市万秀区文澜路55号',           property_code: '03' },
  { name: '万达滨江城',   address: '梧州市长洲区滨江大道88号',         property_code: '04' },
  { name: '龙湖湾',       address: '梧州市龙圩区龙湖路168号',           property_code: '05' },
  { name: '天誉半岛',     address: '梧州市长洲区西堤三路66号',         property_code: '06' },
];

// ═══ 材料模板：每个分类 → 品牌+材料列表 ═══
const materialTemplates = {
  '地板': [
    { name: '强化复合地板 · 橡木浅色', brand: '圣象地板',   unit_price: 128.00, price_unit: '/㎡', description: 'F4星环保 耐磨转数6000+ AC4级' },
    { name: '实木多层地板 · 胡桃木',   brand: '大自然地板', unit_price: 268.00, price_unit: '/㎡', description: '三层实木复合 地暖适用 防潮处理' },
    { name: 'SPC石塑地板 · 浅灰系',    brand: '德尔地板',   unit_price: 88.00,  price_unit: '/㎡', description: '防水防潮 零甲醛 4.0mm加厚' },
    { name: '实木地板 · 柚木原木色',   brand: '菲林格尔',   unit_price: 458.00, price_unit: '/㎡', description: '印尼柚木 纯实木 原木本色' },
  ],
  '墙面': [
    { name: '净味全效墙面漆',         brand: '立邦',       unit_price: 280.00, price_unit: '/桶', description: '竹炭净味 5合1 18L装' },
    { name: '抗甲醛五合一墙面漆',     brand: '多乐士',     unit_price: 328.00, price_unit: '/桶', description: '森呼吸系列 净味除醛 15L装' },
    { name: '净味防霉墙面漆',         brand: '三棵树',     unit_price: 198.00, price_unit: '/桶', description: '抗菌防霉 高遮盖力 18L装' },
  ],
  '卫浴': [
    { name: '一体式智能马桶',         brand: '恒洁卫浴',   unit_price: 2980.00, price_unit: '/件', description: '即热式 自动翻盖 离座冲水' },
    { name: '恒温花洒淋浴柱',         brand: '箭牌卫浴',   unit_price: 1580.00, price_unit: '/件', description: '三出水 38℃恒温 空气注入' },
    { name: '陶瓷台下盆+浴室柜组合',  brand: '科勒',       unit_price: 3280.00, price_unit: '/套', description: '80cm 橡木柜体 石英石台面' },
  ],
  '橱柜': [
    { name: '定制整体橱柜 · 现代简约', brand: '欧派家居',   unit_price: 1580.00, price_unit: '/延米', description: '双饰面板 石英石台面 含拉篮' },
    { name: '定制衣柜 · 推拉门',       brand: '索菲亚',     unit_price: 1080.00, price_unit: '/㎡',   description: 'E0级实木颗粒板 静音轨 2.4m高' },
    { name: '定制橱柜 · 模压门板',     brand: '金牌橱柜',   unit_price: 1880.00, price_unit: '/延米', description: '模压高光 石英石台面 欧式' },
  ],
  '门窗': [
    { name: '断桥铝平开窗',           brand: '皇派门窗',   unit_price: 780.00,  price_unit: '/㎡', description: '70系 双层中空钢化 断桥隔热' },
    { name: '推拉门 · 重型三轨',       brand: '派雅门窗',   unit_price: 1280.00, price_unit: '/㎡', description: '2.0mm型材 双玻中空 带纱网' },
    { name: '室内烤漆木门',           brand: '新豪轩门窗', unit_price: 1680.00, price_unit: '/扇', description: '实木复合 静音磁吸 含门套' },
  ],
  '瓷砖': [
    { name: '全抛釉地砖 · 灰色系',    brand: '马可波罗',   unit_price: 98.00,   price_unit: '/㎡', description: '800×800mm 柔光面 防滑系数R10' },
    { name: '通体大理石瓷砖',         brand: '东鹏瓷砖',   unit_price: 138.00,  price_unit: '/㎡', description: '600×1200mm 亮光面 一石多面' },
    { name: '釉面内墙砖 · 白色亮光',  brand: '蒙娜丽莎',   unit_price: 58.00,   price_unit: '/㎡', description: '300×600mm 光滑面 厨卫专用' },
    { name: '仿古砖 · 暖黄系',        brand: '诺贝尔瓷砖', unit_price: 118.00,  price_unit: '/㎡', description: '600×600mm 哑光面 花园阳台适用' },
  ],
  '涂料': [
    { name: '净味多功能水性漆',       brand: '立邦',       unit_price: 180.00, price_unit: '/桶', description: '抗碱底漆 室内通用 15L' },
    { name: '硅藻泥墙面涂料',         brand: '嘉宝莉',     unit_price: 398.00, price_unit: '/桶', description: '吸醛净味 环保 10kg装' },
  ],
  '灯具': [
    { name: 'LED吸顶灯 · 三色调光',    brand: '欧普照明',   unit_price: 358.00, price_unit: '/件', description: '60cm圆形 36W 遥控调光调色' },
    { name: '筒灯 · 嵌入式',           brand: '雷士照明',   unit_price: 48.00,  price_unit: '/件', description: '7W LED 白光/暖光 开孔75mm' },
    { name: '客厅吊灯 · 现代简约',     brand: '欧普照明',   unit_price: 1280.00, price_unit: '/件', description: '8头 LED 三色变光 铁艺灯体' },
  ],
};

/**
 * 分配计划：每个楼盘 2~4 个类目
 * 类目覆盖不求全，确保每个楼盘都有数据可测
 */
const propertyCategoryMap = {
  '彰泰玫瑰园':   ['地板', '卫浴', '瓷砖', '灯具'],
  '恒大绿洲':     ['涂料', '橱柜', '门窗'],
  '碧桂园凤凰台': ['地板', '墙面', '卫浴', '橱柜'],
  '万达滨江城':   ['瓷砖', '门窗', '灯具'],
  '龙湖湾':       ['地板', '涂料', '卫浴'],
  '天誉半岛':     ['墙面', '橱柜', '瓷砖', '门窗'],
};

async function seed() {
  console.log('🌱 开始导入梧州测试数据...\n');

  // ── 1. 插入材料分类 ──
  console.log('📁 插入材料分类...');
  const catMap = {}; // name → id
  for (const c of categories) {
    const [row] = await knex('material_categories').insert(c).returning('*');
    catMap[c.name] = row.id || row; // better-sqlite3 returns id directly
    console.log(`  ✓ ${c.name} (id=${catMap[c.name]})`);
  }

  // ── 2. 插入楼盘 ──
  console.log('\n🏠 插入楼盘...');
  const propMap = {}; // name → id
  for (const p of properties) {
    const [row] = await knex('properties').insert({
      name: p.name,
      address: p.address,
      property_code: p.property_code,
      material_enabled: 1,
    }).returning('*');
    propMap[p.name] = row.id || row;
    console.log(`  ✓ ${p.name} (${p.address}) material_enabled=1`);
  }

  // ── 3. 插入材料 ──
  console.log('\n🔨 插入材料...');
  let totalMats = 0;
  for (const [propName, catNames] of Object.entries(propertyCategoryMap)) {
    const propertyId = propMap[propName];
    for (const catName of catNames) {
      const categoryId = catMap[catName];
      const mats = materialTemplates[catName] || [];
      for (const m of mats) {
        await knex('materials').insert({
          category_id: categoryId,
          property_id: propertyId,
          name: m.name,
          brand: m.brand,
          unit_price: m.unit_price,
          price_unit: m.price_unit,
          description: m.description || '',
        });
        totalMats++;
      }
      console.log(`  ${propName} · ${catName}: ${mats.length}种`);
    }
  }

  console.log(`\n✅ 完成！共导入：`);
  console.log(`   ${categories.length} 个材料分类`);
  console.log(`   ${properties.length} 个楼盘`);
  console.log(`   ${totalMats} 条材料数据`);

  await knex.destroy();
}

seed().catch(err => {
  console.error('❌ 执行失败:', err.message);
  process.exit(1);
});
