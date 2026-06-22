/**
 * 全量图片更新脚本
 * 将所有 placehold.co 和失效的 Unsplash 图片替换为 Lorem Picsum 真实照片
 * Picsum 是 Unsplash 照片的稳定缓存，Cloudflare CDN 全球可访问
 *
 * 用法: node src/db/fix_all_images.js
 */
const db = require('./connection');

// picsum.photos — 真实照片，每个 ID 对应一张固定的 Unsplash 照片
const P = (id, w = 400, h = 400) => `/api/v1/placeholder/${id}/${w}/${h}`;

// 精选 ID 分布，确保照片多样性
const IMG_IDS = {
  // 楼盘封面 (10 张) — 大幅横图 600×400
  properties: [1, 51, 101, 151, 201, 251, 301, 351, 401, 451],

  // 材料图片 (28 张) — 方图 400×400
  materials: [
    11, 22, 33, 44, 55, 66,   // 地板 6张
    71, 82, 93, 104,           // 墙面 4张
    111, 122, 133,              // 天花板 3张
    141, 152, 163, 174,        // 瓷砖 4张
    181, 192, 203, 214,        // 卫浴 4张
    221, 232, 243,              // 橱柜 3张
    251, 262, 273, 284,        // 门窗 4张
  ],

  // 作品封面 (10 张) — 大图 600×400
  cases: [21, 72, 123, 174, 225, 276, 327, 378, 429, 480],

  // 作品详情图 (30 张) — 每案例 3 张，600×400
  caseImages: [
    31, 41, 53, 63, 75, 85, 96, 106, 117, 127,
    138, 148, 159, 169, 180, 190, 206, 216, 227, 237,
    248, 258, 269, 279, 290, 300, 311, 321, 332, 342,
  ],

  // 首页 Banner (3 张) — 宽幅 750×400
  banners: [15, 165, 315],
};

async function fixAllImages() {
  console.log('🖼️  全量替换为真实照片 (Lorem Picsum)\n');

  // ═══ 1. 材料图片 ═══
  console.log('─── 材料 ───');
  const materials = await db('materials').orderBy('id', 'asc');
  for (let i = 0; i < materials.length; i++) {
    const imgId = IMG_IDS.materials[i % IMG_IDS.materials.length];
    const url = P(imgId, 400, 400);
    await db('materials').where('id', materials[i].id).update({ image_url: url });
    console.log('  [' + materials[i].id + '] ' + materials[i].name.substring(0, 25) + ' → picsum:' + imgId);
  }

  // ═══ 2. 楼盘封面 ═══
  console.log('\n─── 楼盘 ───');
  const properties = await db('properties').orderBy('id', 'asc');
  for (let i = 0; i < properties.length; i++) {
    const imgId = IMG_IDS.properties[i % IMG_IDS.properties.length];
    const url = P(imgId, 600, 400);
    await db('properties').where('id', properties[i].id).update({ cover_image: url });
    console.log('  [' + properties[i].id + '] ' + properties[i].name + ' → picsum:' + imgId);
  }

  // ═══ 3. 作品封面 ═══
  console.log('\n─── 作品封面 ───');
  const cases = await db('cases').orderBy('id', 'asc');
  for (let i = 0; i < cases.length; i++) {
    const imgId = IMG_IDS.cases[i % IMG_IDS.cases.length];
    const url = P(imgId, 600, 400);
    await db('cases').where('id', cases[i].id).update({ cover_image: url });
    console.log('  [' + cases[i].id + '] ' + cases[i].title.substring(0, 25) + ' → picsum:' + imgId);
  }

  // ═══ 4. 作品详情图 ═══
  console.log('\n─── 作品详情图 ───');
  const caseImgs = await db('case_images').orderBy('id', 'asc');
  for (let i = 0; i < caseImgs.length; i++) {
    const imgId = IMG_IDS.caseImages[i % IMG_IDS.caseImages.length];
    const url = P(imgId, 600, 400);
    await db('case_images').where('id', caseImgs[i].id).update({ image_url: url });
  }
  console.log('  已更新 ' + caseImgs.length + ' 张作品详情图');

  // ═══ 5. 首页 Banner ═══
  console.log('\n─── 首页 Banner ───');
  const banners = await db('homepage_config').where('config_type', 'banner').orderBy('id', 'asc');
  for (let i = 0; i < banners.length; i++) {
    const imgId = IMG_IDS.banners[i % IMG_IDS.banners.length];
    const url = P(imgId, 750, 400);
    const configValue = JSON.parse(banners[i].config_value);
    configValue.image_url = url;
    await db('homepage_config').where('id', banners[i].id).update({
      config_value: JSON.stringify(configValue),
    });
    console.log('  Banner ' + (i + 1) + ' → picsum:' + imgId);
  }

  // ═══ 汇总 ═══
  console.log('\n══════════════════════════════════');
  console.log('  全部图片已替换为真实照片');
  console.log('  材料 ' + materials.length + ' | 楼盘 ' + properties.length + ' | 作品 ' + cases.length + ' | 详情图 ' + caseImgs.length + ' | Banner ' + banners.length);
  console.log('══════════════════════════════════');

  await db.destroy();
}

fixAllImages().catch((err) => {
  console.error('失败:', err.message);
  process.exit(1);
});
