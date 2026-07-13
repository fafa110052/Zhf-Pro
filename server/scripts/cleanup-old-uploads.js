/**
 * 清理迁移后遗留的旧副本 —— 只删「数据库里已无任何引用」的文件，绝不误删。
 *
 * 用法：
 *   node scripts/cleanup-old-uploads.js --dry-run   # 只统计，不删
 *   node scripts/cleanup-old-uploads.js             # 实际删除
 *
 * 机制：扫描所有含图片路径的列（含 JSON），用正则抽出全部被引用的 /uploads/ 路径，
 *       构成"引用集合"。只删 originals/ 与 thumbnails/ 里【不在引用集合】的文件。
 *       仍被引用的文件（如未进 image_library 的设计团队头像）自动保留。
 */
const path = require('path');
const fs = require('fs');
const db = require('../src/db/connection');

const DRY = process.argv.includes('--dry-run');
const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const CLEAN_DIRS = ['originals', 'thumbnails'];

// 所有可能含 /uploads 路径的 表.列
const COLS = [
  ['image_library', 'image_url'], ['image_library', 'thumb_url'],
  ['cases', 'cover_image'], ['case_images', 'image_url'],
  ['designers', 'avatar_url'], ['designers', 'pending_avatar_url'],
  ['design_team', 'avatar_url'], ['properties', 'cover_image'], ['materials', 'image_url'],
  ['construction_phases', 'design_images'], ['construction_phases', 'construction_images'],
  ['construction_phases', 'dispute_images'], ['construction_phases', 'owner_design_dispute_images'],
  ['homepage_config', 'config_value'],
];

async function main() {
  console.log(DRY ? '═══ DRY RUN（只统计，不删）═══' : '═══ 清理旧副本 ═══');

  // 构建"被引用的 /uploads 路径"集合（正则同时兼容纯字符串与 JSON 文本）
  const referenced = new Set();
  for (const [t, c] of COLS) {
    const rows = await db(t).select(c);
    for (const r of rows) {
      const v = r[c];
      if (typeof v !== 'string') continue;
      const m = v.match(/\/uploads\/[^"'\s,\]]+/g);
      if (m) m.forEach((p) => referenced.add(p));
    }
  }
  console.log(`引用集合：${referenced.size} 条 /uploads 路径`);

  let del = 0, keep = 0, freed = 0;
  const kept = [];
  for (const dir of CLEAN_DIRS) {
    const abs = path.join(UPLOAD_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs)) {
      const full = path.join(abs, file);
      if (!fs.statSync(full).isFile()) continue;
      const urlPath = `/uploads/${dir}/${file}`;
      if (referenced.has(urlPath)) { keep++; kept.push(urlPath); continue; }
      freed += fs.statSync(full).size;
      if (!DRY) fs.unlinkSync(full);
      del++;
    }
  }

  console.log(`\n─── 结果 ───`);
  console.log(`${DRY ? '将删除' : '已删除'}：${del} 个文件，释放 ${(freed / 1024 / 1024).toFixed(1)} MB`);
  console.log(`保留（仍被引用）：${keep} 个`);
  kept.forEach((p) => console.log(`  ✔ 保留 ${p}`));
  if (DRY) console.log('\n(预演，未删除。去掉 --dry-run 才实际执行。)');
}

main().catch((e) => { console.error('出错:', e); process.exitCode = 1; }).finally(() => db.destroy());
