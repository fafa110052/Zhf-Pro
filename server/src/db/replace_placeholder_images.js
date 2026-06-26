/**
 * 替换占位图为真实图片
 *
 * 用法：在服务器上运行  node server/src/db/replace_placeholder_images.js
 *
 * 功能：
 * 1. 从 Picsum 下载真实照片到 /uploads/cases/
 * 2. 更新 case_images 表，将 placeholder URL 替换为本地文件路径
 * 3. 更新 cases 表的 cover_image
 */

const db = require('./connection');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ========== 配置 ==========
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'uploads', 'cases');
const IMAGE_COUNT = 100; // 从 Picsum 下载 100 张
const IMG_WIDTH = 800;
const IMG_HEIGHT = 600;

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ========== 工具函数 ==========
function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const proto = url.startsWith('https') ? https : http;

    proto.get(url, (response) => {
      // 处理重定向
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return download(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ========== 主流程 ==========
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  替换占位图 → 真实图片');
  console.log('═══════════════════════════════════════\n');

  // ─── 第1步：下载 Picsum 真实照片 ───
  console.log(`📥 第1步：从 Picsum 下载 ${IMAGE_COUNT} 张真实照片...`);

  const downloaded = [];
  for (let i = 0; i < IMAGE_COUNT; i++) {
    const destFile = path.join(OUTPUT_DIR, `picsum_${i}.jpg`);
    const url = `https://picsum.photos/id/${i}/${IMG_WIDTH}/${IMG_HEIGHT}`;

    if (fs.existsSync(destFile)) {
      console.log(`  [${i + 1}/${IMAGE_COUNT}] picsum_${i}.jpg 已存在，跳过`);
      downloaded.push(`/uploads/cases/picsum_${i}.jpg`);
      continue;
    }

    try {
      await download(url, destFile);
      console.log(`  [${i + 1}/${IMAGE_COUNT}] picsum_${i}.jpg ✓`);
      downloaded.push(`/uploads/cases/picsum_${i}.jpg`);
    } catch (err) {
      console.log(`  [${i + 1}/${IMAGE_COUNT}] picsum_${i}.jpg ✗ (${err.message})，跳过`);
    }

    // 小延迟避免被限流
    if (i % 5 === 4) await sleep(200);
  }

  console.log(`\n✅ 成功下载 ${downloaded.length} 张图片\n`);

  if (downloaded.length === 0) {
    console.error('❌ 没有下载到任何图片，退出');
    process.exit(1);
  }

  // ─── 第2步：获取所有作品及其图片 ───
  console.log('📋 第2步：读取作品和图片关联...');

  const works = await db('cases').select('id', 'title').orderBy('id');
  const caseImages = await db('case_images')
    .where('image_url', 'like', '/api/v1/placeholder/%')
    .orderBy('case_id')
    .orderBy('sort_order');

  console.log(`  作品数: ${works.length}`);
  console.log(`  占位图片数: ${caseImages.length}\n`);

  // 打乱图片列表，让每个作品的图片有变化
  const shuffled = [...downloaded].sort(() => Math.random() - 0.5);

  // ─── 第3步：更新 case_images 表 ───
  console.log('🔄 第3步：更新 case_images 表...');

  let imgIdx = 0;
  for (const ci of caseImages) {
    const newUrl = shuffled[imgIdx % shuffled.length];
    await db('case_images').where('id', ci.id).update({
      image_url: newUrl,
    });
    imgIdx++;
  }
  console.log(`  更新了 ${imgIdx} 条记录\n`);

  // ─── 第4步：更新 cases 封面 ───
  console.log('🔄 第4步：更新作品封面...');

  let coverCount = 0;
  for (const work of works) {
    // 获取该作品的第一张图片作为封面
    const firstImg = await db('case_images')
      .where('case_id', work.id)
      .orderBy('sort_order', 'asc')
      .first();

    if (firstImg) {
      await db('cases').where('id', work.id).update({
        cover_image: firstImg.image_url,
      });
      coverCount++;
      console.log(`  [${work.id}] ${work.title} → ${firstImg.image_url}`);
    }
  }
  console.log(`  更新了 ${coverCount} 个封面\n`);

  // ─── 完成 ───
  console.log('═══════════════════════════════════════');
  console.log('  ✅ 全部完成！');
  console.log('═══════════════════════════════════════');
  console.log(`  下载图片: ${downloaded.length} 张`);
  console.log(`  更新关联: ${imgIdx} 条`);
  console.log(`  更新封面: ${coverCount} 个`);
  console.log(`  输出目录: ${OUTPUT_DIR}`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});
