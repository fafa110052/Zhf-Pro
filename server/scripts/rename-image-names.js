/**
 * 重刷图库显示名 original_name —— 一次性，幂等
 *
 * 用法：
 *   node scripts/rename-image-names.js --dry-run   # 只打印，不写库
 *   node scripts/rename-image-names.js             # 实际重刷
 *
 * 新格式：分类-上传人-日期-作品名（无作品名则用序号），永不出现 unknown。
 * original_name 只是图库显示/搜索用的标签，不涉及任何文件路径，重刷零风险。
 * 幂等：已是新格式（以分类中文名开头）的记录自动跳过。
 */
const db = require('../src/db/connection');
const { CATEGORY_LABELS } = require('../src/config/imageCategories');

const DRY = process.argv.includes('--dry-run');
const LABELS = new Set(Object.values(CATEGORY_LABELS)); // 作品/头像/楼盘/材料/施工图/运营/未分类
const clean = (s) => (s || '').replace(/[^a-zA-Z0-9一-鿿_-]/g, '').replace(/\s+/g, '_');

// 从旧名解析上传人与作品名：旧格式 {上传人}-{作品名或unknown}-{YYYYMMDD}.ext
function parseOld(name) {
  const noExt = (name || '').replace(/\.[^.]+$/, '');
  const parts = noExt.split('-');
  if (parts.length < 2) return { uploader: parts[0] || '', work: '' };
  const uploader = parts[0];
  const last = parts[parts.length - 1];
  const mid = /^\d{8}$/.test(last) ? parts.slice(1, -1).join('-') : parts.slice(1).join('-');
  const work = mid && mid !== 'unknown' ? mid : '';
  return { uploader, work };
}

async function main() {
  console.log(DRY ? '═══ DRY RUN（不写库）═══' : '═══ 重刷 original_name ═══');
  const rows = await db('image_library as il')
    .leftJoin('designers as d', 'il.uploaded_by', 'd.id')
    .select('il.id', 'il.category', 'il.original_name', 'il.created_at', 'd.name as uploader_name')
    .orderBy('il.id');

  const seq = {}; // prefix -> 已用序号
  let renamed = 0, skipped = 0;

  for (const row of rows) {
    const old = row.original_name || '';
    // 幂等：已是新格式（首段是分类中文名）则跳过
    if (LABELS.has(old.split('-')[0])) { skipped++; continue; }

    const catLabel = CATEGORY_LABELS[row.category] || '未分类';
    const parsed = parseOld(old);
    let uploader = clean(row.uploader_name || parsed.uploader);
    if (!uploader || uploader === 'unknown') uploader = '用户';
    const work = clean(parsed.work);
    const dateStr = String(row.created_at || '').slice(0, 10).replace(/-/g, '') || '00000000';

    let name;
    if (work) {
      name = `${catLabel}-${uploader}-${dateStr}-${work}`;
    } else {
      const prefix = `${catLabel}-${uploader}-${dateStr}-`;
      seq[prefix] = (seq[prefix] || 0) + 1;
      name = `${prefix}${seq[prefix]}`;
    }

    console.log(`[${row.id}] ${old}  →  ${name}`);
    if (!DRY) await db('image_library').where('id', row.id).update({ original_name: name });
    renamed++;
  }

  console.log(`\n─── 统计 ───\n${DRY ? '预计重刷' : '已重刷'} ${renamed}，跳过(已新格式) ${skipped}`);
  if (DRY) console.log('(预演，未改动。去掉 --dry-run 才实际执行。)');
}

main().catch((e) => { console.error('出错:', e); process.exitCode = 1; }).finally(() => db.destroy());
