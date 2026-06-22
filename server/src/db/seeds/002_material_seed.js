exports.seed = async function (knex) {
  await knex('material_order_logs').del();
  await knex('material_order_items').del();
  await knex('material_orders').del();
  await knex('materials').del();
  await knex('material_categories').del();
  await knex('properties').del();

  // Lorem Picsum — Unsplash 真实照片的稳定缓存，Cloudflare CDN 全球可访问
  const P = (id, w, h) => `/api/v1/placeholder/${id}/${w}/${h}`;

  // ==========================================
  // 1. Material categories (7 built-in)
  // ==========================================
  await knex('material_categories').insert([
    { name: '地板',   sort_order: 1 },
    { name: '墙面',   sort_order: 2 },
    { name: '天花板', sort_order: 3 },
    { name: '瓷砖',   sort_order: 4 },
    { name: '卫浴',   sort_order: 5 },
    { name: '橱柜',   sort_order: 6 },
    { name: '门窗',   sort_order: 7 },
  ]);

  // ==========================================
  // 2. 梧州 10 个真实楼盘 — 封面用真实建筑照片
  // ==========================================
  const propIds = [1, 51, 101, 151, 201, 251, 301, 351, 401, 451];
  await knex('properties').insert([
    { name: '碧桂园·翡翠湾',     address: '梧州市长洲区新兴三路88号',        property_code: '01', cover_image: P(propIds[0], 600, 400), material_enabled: 1 },
    { name: '彰泰城·玫瑰园',     address: '梧州市万秀区西堤三路66号',        property_code: '02', cover_image: P(propIds[1], 600, 400), material_enabled: 1 },
    { name: '丽港华府',          address: '梧州市长洲区西堤路28号',          property_code: '03', cover_image: P(propIds[2], 600, 400), material_enabled: 1 },
    { name: '恒大绿洲',          address: '梧州市龙圩区苍梧大道南段',        property_code: '04', cover_image: P(propIds[3], 600, 400), material_enabled: 1 },
    { name: '万达广场',          address: '梧州市万秀区大学路36号',          property_code: '05', cover_image: P(propIds[4], 600, 400), material_enabled: 1 },
    { name: '海骏达花园',        address: '梧州市长洲区新兴二路100号',       property_code: '06', cover_image: P(propIds[5], 600, 400), material_enabled: 1 },
    { name: '灏景尚都',          address: '梧州市长洲区新兴三路55号',        property_code: '07', cover_image: P(propIds[6], 600, 400), material_enabled: 1 },
    { name: '阳光100城市广场',   address: '梧州市长洲区西环路18号',          property_code: '08', cover_image: P(propIds[7], 600, 400), material_enabled: 1 },
    { name: '丰业·半山一品',     address: '梧州市万秀区蝶山路8号',           property_code: '09', cover_image: P(propIds[8], 600, 400), material_enabled: 1 },
    { name: '汇洋·金色港湾',     address: '梧州市长洲区西堤路6号',           property_code: '10', cover_image: P(propIds[9], 600, 400), material_enabled: 1 },
  ]);

  // ==========================================
  // 3. 示例材料（分布于各楼盘）— 真实照片
  // ==========================================
  // 材料图片 ID 分配
  const M = [
    11, 22, 33, 44, 55, 66,   // 地板 6张
    71, 82, 93, 104,           // 墙面 4张
    111, 122, 133,              // 天花板 3张
    141, 152, 163, 174,        // 瓷砖 4张
    181, 192, 203, 214,        // 卫浴 4张
    221, 232, 243,              // 橱柜 3张
    251, 262, 273, 284,        // 门窗 4张
  ];

  await knex('materials').insert([
    // ---- 地板 (cat 1) ----
    { category_id: 1, property_id: 1,  name: '实木复合地板 · 橡木色', brand: '大自然', image_url: P(M[0], 400, 400), unit_price: 128,  price_unit: '/㎡', description: 'E0级环保，适用地暖，耐磨等级 AC4' },
    { category_id: 1, property_id: 2,  name: '实木地板 · 柚木本色',   brand: '安信',   image_url: P(M[1], 400, 400), unit_price: 268,  price_unit: '/㎡', description: '缅甸柚木，稳定性好，防潮防虫' },
    { category_id: 1, property_id: 3,  name: '多层实木 · 胡桃木色',   brand: '生活家', image_url: P(M[2], 400, 400), unit_price: 198,  price_unit: '/㎡', description: '手刮仿古工艺，适合中式风格' },
    { category_id: 1, property_id: 4,  name: 'SPC石塑地板 · 浅木纹',  brand: '肯帝亚', image_url: P(M[3], 400, 400), unit_price: 68,   price_unit: '/㎡', description: '防水防滑，零甲醛，即装即住' },
    { category_id: 1, property_id: 5,  name: '强化地板 · 浅灰',       brand: '圣象',   image_url: P(M[4], 400, 400), unit_price: 89,   price_unit: '/㎡', description: '耐污易清洁，适合客厅卧室' },
    { category_id: 1, property_id: 6,  name: '竹地板 · 碳化平压',     brand: '永裕',   image_url: P(M[5], 400, 400), unit_price: 158,  price_unit: '/㎡', description: '高密度重组竹，低碳环保' },

    // ---- 墙面 (cat 2) ----
    { category_id: 2, property_id: 1,  name: '乳胶漆 · 净味系列',     brand: '立邦',   image_url: P(M[6],  400, 400), unit_price: 35,   price_unit: '/㎡', description: '净味技术，抗菌防霉，可调色' },
    { category_id: 2, property_id: 3,  name: '无缝墙布 · 素色',       brand: '欧雅',   image_url: P(M[7],  400, 400), unit_price: 78,   price_unit: '/㎡', description: '无缝拼接，透气防霉，可擦洗' },
    { category_id: 2, property_id: 5,  name: '艺术涂料 · 微水泥效果', brand: '多乐士', image_url: P(M[8],  400, 400), unit_price: 156,  price_unit: '/㎡', description: '极简风格，无缝一体，耐污耐擦洗' },
    { category_id: 2, property_id: 7,  name: '硅藻泥 · 弹涂工艺',     brand: '兰舍',   image_url: P(M[9],  400, 400), unit_price: 98,   price_unit: '/㎡', description: '吸附甲醛，调节湿度' },

    // ---- 天花板 (cat 3) ----
    { category_id: 3, property_id: 1,  name: '铝扣板吊顶 · 白色',     brand: '友邦', image_url: P(M[10], 400, 400), unit_price: 95,  price_unit: '/㎡', description: '防潮防锈，适用于厨卫阳台' },
    { category_id: 3, property_id: 4,  name: '石膏板吊顶 · 平顶',     brand: '龙牌', image_url: P(M[11], 400, 400), unit_price: 65,  price_unit: '/㎡', description: '净醛石膏板，可做造型' },
    { category_id: 3, property_id: 8,  name: '集成吊顶 · 暖白',       brand: '奥普', image_url: P(M[12], 400, 400), unit_price: 120, price_unit: '/㎡', description: '含LED平板灯+通风口，一体安装' },

    // ---- 瓷砖 (cat 4) ----
    { category_id: 4, property_id: 1,  name: '通体大理石瓷砖 · 灰纹', brand: '马可波罗', image_url: P(M[13], 400, 400), unit_price: 168, price_unit: '/㎡', description: '800×800mm，通体材质，耐磨耐污' },
    { category_id: 4, property_id: 2,  name: '仿古砖 · 暖黄',         brand: '东鹏',     image_url: P(M[14], 400, 400), unit_price: 89,  price_unit: '/㎡', description: '600×600mm，防滑 R10，适合阳台' },
    { category_id: 4, property_id: 6,  name: '岩板 · 白色卡拉拉',     brand: '诺贝尔',   image_url: P(M[15], 400, 400), unit_price: 328, price_unit: '/㎡', description: '1200×600mm，莫氏硬度 7，耐高温' },
    { category_id: 4, property_id: 9,  name: '木纹砖 · 浅橡木',       brand: '冠珠',     image_url: P(M[16], 400, 400), unit_price: 112, price_unit: '/㎡', description: '150×900mm，木纹质感，防潮不变形' },

    // ---- 卫浴 (cat 5) ----
    { category_id: 5, property_id: 2,  name: '智能马桶一体机',        brand: '九牧', image_url: P(M[17], 400, 400), unit_price: 2999, price_unit: '/件', description: '即热式，自动翻盖，臀洗烘干' },
    { category_id: 5, property_id: 5,  name: '恒温花洒套装',          brand: '箭牌', image_url: P(M[18], 400, 400), unit_price: 899,  price_unit: '/件', description: '38℃恒温，三出水，空气注入' },
    { category_id: 5, property_id: 7,  name: '浴室柜组合 · 80cm',     brand: '恒洁', image_url: P(M[19], 400, 400), unit_price: 1880, price_unit: '/件', description: '实木多层板+陶瓷盆，含镜柜' },
    { category_id: 5, property_id: 10, name: '淋浴房 · 钻石型',       brand: '朗斯', image_url: P(M[20], 400, 400), unit_price: 2580, price_unit: '/件', description: '900×900mm，3C钢化玻璃' },

    // ---- 橱柜 (cat 6) ----
    { category_id: 6, property_id: 3,  name: '整体橱柜 · U型',        brand: '欧派',     image_url: P(M[21], 400, 400), unit_price: 6800, price_unit: '/件', description: 'E1级环保板材+石英石台面' },
    { category_id: 6, property_id: 6,  name: '定制橱柜 · L型',        brand: '尚品宅配', image_url: P(M[22], 400, 400), unit_price: 5200, price_unit: '/件', description: '颗粒板+吸塑门板+不锈钢台面' },
    { category_id: 6, property_id: 9,  name: '不锈钢橱柜',            brand: '科勒',     image_url: P(M[23], 400, 400), unit_price: 9800, price_unit: '/件', description: '304不锈钢柜体，防火防潮' },

    // ---- 门窗 (cat 7) ----
    { category_id: 7, property_id: 2,  name: '断桥铝窗户 · 70系列',    brand: '凤铝', image_url: P(M[24], 400, 400), unit_price: 680,  price_unit: '/㎡',  description: '1.8mm壁厚，PA66隔热条，双层中空钢化' },
    { category_id: 7, property_id: 4,  name: '实木复合门 · 白色',      brand: 'TATA', image_url: P(M[25], 400, 400), unit_price: 1580, price_unit: '/件', description: '静音磁吸锁，45mm厚度，含门套' },
    { category_id: 7, property_id: 8,  name: '推拉门 · 极窄边框',      brand: '皇派', image_url: P(M[26], 400, 400), unit_price: 1280, price_unit: '/件', description: '1.6mm钛镁铝合金，8mm钢化玻璃' },
    { category_id: 7, property_id: 10, name: '防盗门 · 甲级',          brand: '盼盼', image_url: P(M[27], 400, 400), unit_price: 3200, price_unit: '/件', description: '甲级防盗，C级锁芯，智能指纹锁' },
  ]);
};
