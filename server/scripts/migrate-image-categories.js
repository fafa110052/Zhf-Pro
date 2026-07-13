/**
 * 存量图片分类迁移（一次性，幂等）—— Phase 2
 *
 * 用法：
 *   node scripts/migrate-image-categories.js --dry-run   # 只打印计划，不改文件/不写库
 *   node scripts/migrate-image-categories.js             # 实际迁移
 *
 * 做什么：
 *   1. 扫描各业务表，建立「/uploads 路径 → 业务分类」索引。
 *   2. 遍历 image_library 中仍在 /uploads/originals/ 的记录：
 *      - 判定分类（查不到引用则 misc）。
 *      - 复制原图 + 缩略图到 uploads/{分类}/（复制，不移动；旧文件保留兜底）。
 *      - 精确改写所有业务表对旧路径的引用 → 新路径。
 *      - 更新 image_library.image_url / thumb_url / category。
 *   3. 幂等：image_url 已不在 originals/ 的记录自动跳过；可重复执行。
 *
 * 安全性：按精确路径改写全部引用到文件新位置，故分类判断即使不准也不会裂图，
 *         只影响图片库页归到哪个 Tab。旧 originals/、thumbnails/ 一律保留不删。
 */
const path = require('path');
const fs = require('fs');
const db = require('../src/db/connection');
const { normalizeCategory } = require('../src/config/imageCategories');

const DRY = process.argv.includes('--dry-run');
const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const CP_JSON_COLS = ['design_images', 'construction_images', 'dispute_images', 'owner_design_dispute_images'];

const isLocal = (p) => typeof p === 'string' && p.startsWith('/uploads/');
const parseArr = (s) => {
  if (!s) return [];
  try { const a = JSON.parse(s); return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []; }
  catch { return []; }
};

// ── 建立「路径 → 分类」索引（先匹配到的优先）──
async function buildReferenceIndex() {
  const map = new Map();
  const add = (p, cat) => { if (isLocal(p) && !map.has(p)) map.set(p, cat); };

  (await db('cases').select('cover_image')).forEach((r) => add(r.cover_image, 'works'));
  (await db('case_images').select('image_url')).forEach((r) => add(r.image_url, 'works'));
  (await db('designers').select('avatar_url', 'pending_avatar_url')).forEach((r) => { add(r.avatar_url, 'avatars'); add(r.pending_avatar_url, 'avatars'); });
  (await db('design_team').select('avatar_url')).forEach((r) => add(r.avatar_url, 'avatars'));
  (await db('properties').select('cover_image')).forEach((r) => add(r.cover_image, 'properties'));
  (await db('materials').select('image_url')).forEach((r) => add(r.image_url, 'materials'));
  (await db('construction_phases').select(...CP_JSON_COLS)).forEach((r) => {
    CP_JSON_COLS.forEach((c) => parseArr(r[c]).forEach((p) => add(p, 'construction')));
  });
  (await db('homepage_config').select('config_value')).forEach((r) => {
    let v; try { v = JSON.parse(r.config_value); } catch { return; }
    const fix = (o) => o && typeof o === 'object' && add(o.image_url, 'banners');
    Array.isArray(v) ? v.forEach(fix) : fix(v);
  });
  return map;
}

// ── 精确改写所有业务表对 oldPath 的引用为 newPath，返回改动行数 ──
async function rewriteRefs(trx, oldPath, newPath) {
  let n = 0;
  n += await trx('cases').where('cover_image', oldPath).update({ cover_image: newPath });
  n += await trx('case_images').where('image_url', oldPath).update({ image_url: newPath });
  n += await trx('designers').where('avatar_url', oldPath).update({ avatar_url: newPath });
  n += await trx('designers').where('pending_avatar_url', oldPath).update({ pending_avatar_url: newPath });
  n += await trx('design_team').where('avatar_url', oldPath).update({ avatar_url: newPath });
  n += await trx('properties').where('cover_image', oldPath).update({ cover_image: newPath });
  n += await trx('materials').where('image_url', oldPath).update({ image_url: newPath });

  for (const row of await trx('construction_phases').select('id', ...CP_JSON_COLS)) {
    const upd = {};
    for (const c of CP_JSON_COLS) {
      const arr = parseArr(row[c]);
      if (arr.includes(oldPath)) upd[c] = JSON.stringify(arr.map((p) => (p === oldPath ? newPath : p)));
    }
    if (Object.keys(upd).length) { await trx('construction_phases').where('id', row.id).update(upd); n++; }
  }

  for (const row of await trx('homepage_config').select('id', 'config_value')) {
    let v; try { v = JSON.parse(row.config_value); } catch { continue; }
    let changed = false;
    const fix = (o) => { if (o && typeof o === 'object' && o.image_url === oldPath) { o.image_url = newPath; changed = true; } };
    Array.isArray(v) ? v.forEach(fix) : fix(v);
    if (changed) { await trx('homepage_config').where('id', row.id).update({ config_value: JSON.stringify(v) }); n++; }
  }
  return n;
}

async function main() {
  console.log(DRY ? '═══ DRY RUN（不改文件 / 不写库）═══' : '═══ 实际迁移 ═══');
  const refIndex = await buildReferenceIndex();
  console.log(`引用索引：${refIndex.size} 条 /uploads 路径\n`);

  const rows = await db('image_library').select('id', 'image_url', 'thumb_url', 'category').orderBy('id');
  const stats = {};
  let migrated = 0, skipped = 0, missing = 0, refsRewritten = 0;

  for (const row of rows) {
    const img = row.image_url || '';
    if (!img.includes('/uploads/originals/')) { skipped++; continue; } // 已迁移 / 非本地

    const category = normalizeCategory(refIndex.get(img) || 'misc');
    const oldBase = path.basename(img);
    const newName = `${category}-${oldBase}`;
    const newImg = `/uploads/${category}/${newName}`;
    const oldFsImg = path.join(UPLOAD_ROOT, 'originals', oldBase);
    const fileExists = fs.existsSync(oldFsImg);
    if (!fileExists) missing++;

    // 缩略图（存在才迁，否则保留旧 thumb_url——旧目录不删仍可用）
    let finalThumb = row.thumb_url;
    let oldFsThumb = null, newFsThumb = null;
    if (row.thumb_url && isLocal(row.thumb_url)) {
      oldFsThumb = path.join(UPLOAD_ROOT, 'thumbnails', path.basename(row.thumb_url));
      if (fs.existsSync(oldFsThumb)) {
        const newThumbName = `thumb_${newName}`;
        newFsThumb = path.join(UPLOAD_ROOT, category, newThumbName);
        finalThumb = `/uploads/${category}/${newThumbName}`;
      }
    }

    stats[category] = (stats[category] || 0) + 1;
    console.log(`[${row.id}] → ${category}${fileExists ? '' : ' ⚠原图缺失'}  ${img}`);

    if (DRY) continue;

    fs.mkdirSync(path.join(UPLOAD_ROOT, category), { recursive: true });
    if (fileExists) fs.copyFileSync(oldFsImg, path.join(UPLOAD_ROOT, category, newName));
    if (newFsThumb) fs.copyFileSync(oldFsThumb, newFsThumb);

    await db.transaction(async (trx) => {
      const n = await rewriteRefs(trx, img, newImg);
      refsRewritten += n;
      await trx('image_library').where('id', row.id).update({ image_url: newImg, thumb_url: finalThumb, category });
    });
    migrated++;
  }

  console.log('\n─── 统计 ───');
  console.log('分类分布:', stats);
  console.log(`处理: ${DRY ? '(dry-run 预计) ' : ''}迁移 ${DRY ? stats && Object.values(stats).reduce((a, b) => a + b, 0) : migrated}，跳过(已迁移) ${skipped}，原图缺失 ${missing}`);
  if (!DRY) console.log(`改写业务表引用: ${refsRewritten} 处`);
  console.log(DRY ? '\n(这是预演，未做任何改动。去掉 --dry-run 才实际执行。)' : '\n✅ 迁移完成。旧 originals/、thumbnails/ 已保留兜底。');
}

main()
  .catch((e) => { console.error('迁移出错:', e); process.exitCode = 1; })
  .finally(() => db.destroy());
