# 图片分类存储 + 图片库分类增强 实现计划（Phase 1）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让每次图片上传按业务类型分文件夹存储、命名带分类前缀，并给现有后台「图片库」页加分类 Tab / 角标 / 筛选，全程不影响已上线小程序。

**Architecture:** 上传接口新增 `?category=` query 参数（避开 multipart 字段顺序坑）；multer 按分类分目录、文件名加前缀；`image_library` 加 `category` 列；增强现有 `admin/src/pages/Images.jsx`（非新建）；三端上传调用点各自显式传分类。

**Tech Stack:** Express 5 + Knex + better-sqlite3 + multer + sharp（后端）；React 19 + Tailwind 4 + Vite（admin）；微信原生（miniprogram）；React（h5）。

## Global Constraints

- **绝不移动已有文件、绝不改写已有数据库路径**（存量迁移是 Phase 2，本计划不做）。老图留在 `uploads/originals/`，在图片库归入「未分类」Tab。
- 分类白名单：`works avatars properties materials construction banners`，兜底 `misc`。非白名单一律 `misc`。
- 分类通过 **URL query 参数** `?category=<key>` 传递，不用 form 字段。
- 抽奖上传（`/api/v1/admin/lottery/upload/:configKey`）是独立接口、独立 `uploads/lottery/` 目录，**不在本计划范围**。
- admin 组件契约：`Modal` 必传 `open`；`EmptyState` 用 `description`；`ConfirmDialog` 用 `open/onClose/onConfirm/title/message/confirmText/variant/loading`；`useToast()`。
- 无单元测试框架：验证用 `curl` + 跑起来点通，每个功能端到端走通。
- 每个任务结束 `git add` 前扫描改动，确认不含真实密钥。

---

## 文件结构

**后端（server）**
- 新建 `server/src/config/imageCategories.js` — 分类白名单 + 归一化 + 中文标签（唯一真相源）
- 新建 `server/src/db/migrations/012_add_image_category.js` — image_library 加 category 列
- 改 `server/src/middleware/upload.js` — 按分类分目录 + 文件名前缀 + 建目录
- 改 `server/src/services/uploadService.js` — 缩略图入同目录 + URL 带分类 + 写入 category
- 改 `server/src/routes/upload.js` — 透传 imageCategory，删除旧建目录块
- 改 `server/src/services/imageService.js` — list 加 category 筛选 + keyword + 各类计数
- 改 `server/src/routes/images.js` — 接收 category/keyword query

**前端 admin**
- 改 `admin/src/pages/Images.jsx` — 分类 Tab + 角标 + 筛选 + 上传选分类

**小程序 miniprogram**
- 改 `miniprogram/utils/api.js` — uploadImage/uploadImages 加 category
- 改 6 个调用页 — 各传业务分类

**H5**
- 改 `h5/src/api/designer.js` — uploadImage 加 category
- 改 `h5/src/pages/WorkUpload.jsx` — 传 works

---

## Task 1: 分类白名单模块

**Files:**
- Create: `server/src/config/imageCategories.js`

**Interfaces:**
- Produces:
  - `IMAGE_CATEGORIES: string[]`（6 个业务 key）
  - `DEFAULT_CATEGORY: 'misc'`
  - `ALL_DIRS: string[]`（6 业务 + misc）
  - `normalizeCategory(input: string): string`（白名单内原样返回，否则 'misc'）
  - `CATEGORY_LABELS: Record<string,string>`（key → 中文）

- [ ] **Step 1: 写模块**

```js
// server/src/config/imageCategories.js
// 图片业务分类白名单 —— 后端唯一真相源（middleware / service 共用）
const IMAGE_CATEGORIES = ['works', 'avatars', 'properties', 'materials', 'construction', 'banners'];
const DEFAULT_CATEGORY = 'misc';
const ALL_DIRS = [...IMAGE_CATEGORIES, DEFAULT_CATEGORY];

const CATEGORY_LABELS = {
  works: '作品',
  avatars: '头像',
  properties: '楼盘',
  materials: '材料',
  construction: '施工图',
  banners: '运营',
  misc: '未分类',
};

// 归一化：仅接受白名单值，其余（含空/undefined）归 misc
function normalizeCategory(input) {
  return IMAGE_CATEGORIES.includes(input) ? input : DEFAULT_CATEGORY;
}

module.exports = { IMAGE_CATEGORIES, DEFAULT_CATEGORY, ALL_DIRS, CATEGORY_LABELS, normalizeCategory };
```

- [ ] **Step 2: 验证归一化逻辑**

Run:
```bash
cd server && node -e "const {normalizeCategory}=require('./src/config/imageCategories'); console.log(normalizeCategory('works'), normalizeCategory('xxx'), normalizeCategory(undefined))"
```
Expected 输出：`works misc misc`

- [ ] **Step 3: Commit**

```bash
git add server/src/config/imageCategories.js
git commit -m "feat(server): 新增图片业务分类白名单模块"
```

---

## Task 2: 迁移 012 — image_library 加 category 列

**Files:**
- Create: `server/src/db/migrations/012_add_image_category.js`

**Interfaces:**
- Produces: `image_library.category`（string(24)，非空，默认 'misc'，带索引）

- [ ] **Step 1: 写迁移**

```js
// server/src/db/migrations/012_add_image_category.js
/**
 * 012 — image_library 增加业务分类列
 *
 * 图片按 works/avatars/properties/materials/construction/banners 分类存储；
 * 老数据默认 misc（未分类），Phase 1 不迁移存量。
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('image_library', (table) => {
    table.string('category', 24).notNullable().defaultTo('misc')
      .comment('业务分类：works/avatars/properties/materials/construction/banners/misc');
    table.index('category');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('image_library', (table) => {
    table.dropIndex('category');
    table.dropColumn('category');
  });
};
```

- [ ] **Step 2: 执行迁移**

Run: `cd server && npm run migrate`
Expected: 输出包含 `Batch ... run: 1 migrations` 且含 `012_add_image_category.js`

- [ ] **Step 3: 验证列已存在且老数据为 misc**

Run:
```bash
cd server && node -e "const db=require('./src/db/connection'); db('image_library').select('id','category').limit(3).then(r=>{console.log(r);return db.destroy()})"
```
Expected: 每条记录含 `category: 'misc'`（无数据则打印 `[]`，也算通过）

- [ ] **Step 4: Commit**

```bash
git add server/src/db/migrations/012_add_image_category.js
git commit -m "feat(server): image_library 增加 category 列（默认 misc）"
```

---

## Task 3: 上传中间件按分类分目录 + 命名前缀

**Files:**
- Modify: `server/src/middleware/upload.js`

**Interfaces:**
- Consumes: `normalizeCategory`, `ALL_DIRS`（Task 1）
- Produces: 上传文件落到 `uploads/{category}/`，文件名 `{category}-{设计师名}-{YYYYMMDD}-{8hex}{ext}`；模块加载时确保 7 个分类目录存在。分类取自 `req.query.category`。

- [ ] **Step 1: 重写 upload.js**

```js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { normalizeCategory, ALL_DIRS } = require('../config/imageCategories');

// 允许的图片格式
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB（4K 渲染图可达 20-35MB）

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// 启动时确保每个分类目录存在（含 misc 兜底）
ALL_DIRS.forEach((cat) => {
  const dir = path.join(UPLOAD_ROOT, cat);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 文件名安全化：只保留中文/英文/数字/下划线/连字符
const sanitize = (s) => (s || 'unknown').replace(/[^a-zA-Z0-9一-鿿_-]/g, '').replace(/\s+/g, '_') || 'unknown';

// 磁盘存储配置：按 ?category= 分目录，文件名带分类前缀
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = normalizeCategory(req.query.category);
    cb(null, path.join(UPLOAD_ROOT, category));
  },
  filename: (req, file, cb) => {
    // 文件名格式：分类-设计师名-日期-随机串.扩展名
    // 例：works-张三-20260713-a1b2c3d4.jpg
    const category = normalizeCategory(req.query.category);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const designerName = sanitize(req.user?.name || 'unknown');
    const random = crypto.randomBytes(4).toString('hex');
    cb(null, `${category}-${designerName}-${dateStr}-${random}${ext}`);
  },
});

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的图片格式: ${file.mimetype}。仅允许 jpg/png/gif/webp`), false);
  }
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });
```

- [ ] **Step 2: 删除 routes/upload.js 里旧的建目录块**

在 `server/src/routes/upload.js` 中删除以下整段（建目录已移入 middleware）：
```js
// 确保上传目录存在
const originalsDir = path.join(__dirname, '..', '..', 'uploads', 'originals');
const thumbnailsDir = path.join(__dirname, '..', '..', 'uploads', 'thumbnails');
[originalsDir, thumbnailsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
```
并删除该文件顶部因此不再使用的 `const path = require('path');` 与 `const fs = require('fs');`（若下方无其他引用；确认后再删）。

- [ ] **Step 3: 验证目录已创建**

Run: `cd server && npm run dev`（启动后 Ctrl+C）；再 `ls server/uploads`
Expected: 出现 `works avatars properties materials construction banners misc`（及原有 originals/thumbnails/lottery）

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/upload.js server/src/routes/upload.js
git commit -m "feat(server): 上传按 ?category= 分目录存储 + 文件名带分类前缀"
```

---

## Task 4: uploadService 缩略图同目录 + URL 带分类 + 写入 category

**Files:**
- Modify: `server/src/services/uploadService.js`

**Interfaces:**
- Consumes: `normalizeCategory`（Task 1）；`file`（multer 已放入 `uploads/{category}/`，含 `file.path` 绝对路径与 `file.filename`）；`options.imageCategory`（Task 5 传入）
- Produces: `image_library` 记录含 `image_url:/uploads/{category}/xxx.webp`、`thumb_url:/uploads/{category}/thumb_xxx.jpg`、`category`

- [ ] **Step 1: 顶部引入归一化，移除写死的 THUMBS_DIR**

将文件顶部：
```js
const THUMBS_DIR = path.join(__dirname, '..', '..', 'uploads', 'thumbnails');
```
改为：
```js
const { normalizeCategory } = require('../config/imageCategories');
```

- [ ] **Step 2: uploadSingle 内改用同目录缩略图 + 分类 URL/字段**

在 `uploadSingle(file, userId, options = {})` 中，将缩略图与入库部分改为：

```js
// 分类目录 = 文件所在目录（multer 已按分类放好）
const category = normalizeCategory(options.imageCategory);
const categoryDir = path.dirname(file.path);

// 生成缩略图（写入同一分类目录）
const thumbFilename = `thumb_${file.filename}`;
const thumbPath = path.join(categoryDir, thumbFilename);

try {
  await sharp(file.path)
    .resize(THUMB_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);
} catch (err) {
  fs.unlink(file.path, () => {});
  throw Object.assign(new Error(`图片处理失败: ${err.message}`), { status: 500 });
}
```

原图压缩段（`finalFilename/finalPath/finalSize` 部分）**保持不变**。

将末尾入库改为：
```js
// 插入 image_library（路径带分类目录）
const [id] = await db('image_library').insert({
  image_url: `/uploads/${category}/${finalFilename}`,
  thumb_url: `/uploads/${category}/${thumbFilename}`,
  original_name: displayName,
  file_size: finalSize,
  uploaded_by: userId || null,
  category,
});

return db('image_library').where('id', id).first();
```

> 注意：`displayName` 生成逻辑（用 `options.designerName / options.workName / options.category`）保持不变——这里的 `options.category` 是「作品名/房间」展示用途，与业务分类 `options.imageCategory` 是两回事，勿混淆。

- [ ] **Step 3: 验证单文件上传落对目录 + 入库带分类（先登录取 token）**

Run（用真实 admin 账号取 token，替换 <TOKEN>；准备一张本地图片 /tmp/t.jpg）：
```bash
cd server
curl -s -X POST "http://localhost:3000/api/v1/upload?category=materials" \
  -H "Authorization: Bearer <TOKEN>" -F "file=@/tmp/t.jpg" | head -c 400
ls uploads/materials
```
Expected: 返回 JSON 的 `data.category` 为 `materials`，`image_url` 形如 `/uploads/materials/materials-...webp`；`uploads/materials/` 下出现该原图与 `thumb_` 缩略图。

- [ ] **Step 4: Commit**

```bash
git add server/src/services/uploadService.js
git commit -m "feat(server): 缩略图入分类目录，image_library 记录 category 与分类路径"
```

---

## Task 5: upload 路由透传 imageCategory

**Files:**
- Modify: `server/src/routes/upload.js`

**Interfaces:**
- Consumes: `req.query.category`
- Produces: 给 `uploadService.uploadSingle/uploadMultiple` 的 `options` 增加 `imageCategory`

- [ ] **Step 1: 两个路由的 options 各加一行**

在 `/upload` 与 `/upload/multiple` 两处的 `options` 对象里，各追加：
```js
      imageCategory: req.query.category || '',
```
即（以单文件为例）：
```js
    const options = {
      designerName: req.user.name || 'unknown',
      workName: req.body.work_name || '',
      category: req.body.category || '',
      imageCategory: req.query.category || '',
    };
```

- [ ] **Step 2: 验证多文件上传分类生效**

Run:
```bash
curl -s -X POST "http://localhost:3000/api/v1/upload/multiple?category=works" \
  -H "Authorization: Bearer <TOKEN>" -F "files=@/tmp/t.jpg" | head -c 300
```
Expected: `data.uploaded[0].category` 为 `works`，`image_url` 在 `/uploads/works/` 下。

- [ ] **Step 3: 验证不传 category 时兜底 misc（不破坏旧行为）**

Run:
```bash
curl -s -X POST "http://localhost:3000/api/v1/upload" \
  -H "Authorization: Bearer <TOKEN>" -F "file=@/tmp/t.jpg" | head -c 300
```
Expected: `data.category` 为 `misc`，落在 `/uploads/misc/`，上传成功（证明旧调用方不传也不报错）。

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/upload.js
git commit -m "feat(server): upload 路由透传 ?category= 到上传服务"
```

---

## Task 6: imageService 列表加 category 筛选 + keyword + 各类计数

**Files:**
- Modify: `server/src/services/imageService.js`
- Modify: `server/src/routes/images.js`

**Interfaces:**
- Consumes: `filters.category`、`filters.keyword`（新增）
- Produces: `list()` 返回值增加 `counts: Record<category, number>`；列表项含 `category`（`image_library.*` 已带）

- [ ] **Step 1: imageService.list 增加筛选与计数**

在 `list(filters = {}, pagination = {})` 中，`leftJoin('designers'...)` 之后、`count` 之前，追加：
```js
    // 按业务分类筛选
    if (filters.category) {
      query = query.where('image_library.category', filters.category);
    }

    // 关键词：原名 或 上传者姓名
    if (filters.keyword) {
      const kw = `%${filters.keyword}%`;
      query = query.where(function () {
        this.where('image_library.original_name', 'like', kw)
          .orWhere('designers.name', 'like', kw);
      });
    }
```

在函数末尾 `return {` 之前，计算各类计数（忽略 category 筛选、但沿用上传者/日期/keyword 条件，使 Tab 数字与当前搜索一致）：
```js
    // 各分类计数（用于前端 Tab）—— 复用同样的非分类筛选条件
    let countQuery = db('image_library')
      .leftJoin('designers', 'image_library.uploaded_by', 'designers.id');
    if (filters.uploaded_by) countQuery = countQuery.where('image_library.uploaded_by', filters.uploaded_by);
    if (filters.date_from) countQuery = countQuery.where('image_library.created_at', '>=', filters.date_from);
    if (filters.date_to) countQuery = countQuery.where('image_library.created_at', '<=', `${filters.date_to} 23:59:59`);
    if (filters.keyword) {
      const kw = `%${filters.keyword}%`;
      countQuery = countQuery.where(function () {
        this.where('image_library.original_name', 'like', kw).orWhere('designers.name', 'like', kw);
      });
    }
    const countRows = await countQuery
      .select('image_library.category')
      .count('* as count')
      .groupBy('image_library.category');
    const counts = countRows.reduce((acc, r) => { acc[r.category] = Number(r.count); return acc; }, {});
```

并把 `return` 改为：
```js
    return {
      list,
      counts,
      pagination: { page, page_size: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    };
```

- [ ] **Step 2: images 路由接收 category / keyword**

在 `GET /admin/images` 中，将解构与调用改为：
```js
    const { uploaded_by, date_from, date_to, category, keyword, page, page_size } = req.query;
    const result = await imageService.list(
      { uploaded_by, date_from, date_to, category, keyword },
      { page, page_size }
    );
```

- [ ] **Step 3: 验证筛选与计数**

Run:
```bash
curl -s "http://localhost:3000/api/v1/admin/images?category=materials&page=1" \
  -H "Authorization: Bearer <TOKEN>" | head -c 500
curl -s "http://localhost:3000/api/v1/admin/images" \
  -H "Authorization: Bearer <TOKEN>" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.counts))"
```
Expected: 第一条只返回 materials 图片；第二条打印形如 `{ misc: N, materials: M, works: K }` 的计数对象。

- [ ] **Step 4: Commit**

```bash
git add server/src/services/imageService.js server/src/routes/images.js
git commit -m "feat(server): 图片库列表支持分类筛选+关键词+各类计数"
```

---

## Task 7: 增强 Images.jsx — 分类 Tab + 角标 + 筛选 + 上传选分类

**Files:**
- Modify: `admin/src/pages/Images.jsx`

**Interfaces:**
- Consumes: `GET /admin/images?category=&keyword=` 返回 `data.counts`；上传走 `POST /api/v1/upload?category=`
- Produces: 页面顶部分类 Tab（含计数）、卡片/行分类角标（6 色）、上传弹窗分类下拉

- [ ] **Step 1: 新增分类元数据常量（文件顶部 `const PAGE_SIZE = 20;` 之后）**

```jsx
// 业务分类元数据（与后端 imageCategories.js 对应）；角标 6 色互不相同
const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'works', label: '作品' },
  { key: 'avatars', label: '头像' },
  { key: 'properties', label: '楼盘' },
  { key: 'materials', label: '材料' },
  { key: 'construction', label: '施工图' },
  { key: 'banners', label: '运营' },
  { key: 'misc', label: '未分类' },
];
const BADGE_CLASS = {
  works: 'bg-indigo-100 text-indigo-700',
  avatars: 'bg-sky-100 text-sky-700',
  properties: 'bg-emerald-100 text-emerald-700',
  materials: 'bg-amber-100 text-amber-700',
  construction: 'bg-violet-100 text-violet-700',
  banners: 'bg-rose-100 text-rose-700',
  misc: 'bg-slate-100 text-slate-600',
};
const CAT_LABEL = { works: '作品', avatars: '头像', properties: '楼盘', materials: '材料', construction: '施工图', banners: '运营', misc: '未分类' };
// 上传弹窗可选分类（不含"全部"）
const UPLOAD_CATEGORIES = CATEGORIES.filter((c) => c.key);
```

- [ ] **Step 2: 增加分类/计数/上传分类 state**

在 `// ─── 视图 & 筛选 ───` 区块内，`const [filterUploader...` 附近加：
```jsx
  const [filterCategory, setFilterCategory] = useState('');
  const [counts, setCounts] = useState({});
```
在上传弹窗 state 区（`const [uploadWorkName...` 附近）加：
```jsx
  const [uploadCategory, setUploadCategory] = useState('works');
```

- [ ] **Step 3: fetchImages 带上 category，并接收 counts**

将 `fetchImages` 中 `const params = ...` 段改为：
```jsx
      const params = { page, page_size: PAGE_SIZE };
      if (filterCategory) params.category = filterCategory;
      if (filterUploader) params.keyword = filterUploader;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;

      const res = await client.get('/admin/images', { params });
      setImages(res.data.list);
      setPagination(res.data.pagination);
      setCounts(res.data.counts || {});
```
> 说明：把原「上传者姓名筛选」输入框复用为关键词（原名/上传者通吃），故用 `keyword` 传 `filterUploader`。输入框 placeholder 在 Step 5 改文案。

- [ ] **Step 4: 切换分类即刷新**

在 `useEffect(() => { fetchImages(1); }, []);` 之后新增：
```jsx
  useEffect(() => { fetchImages(1); }, [filterCategory]);
```

- [ ] **Step 5: 渲染分类 Tab 条（操作栏卡片内、筛选行之上）**

在操作栏卡片 `<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">` 内、第一个 `flex ... justify-between` 块**之前**插入：
```jsx
        {/* 分类 Tab */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = filterCategory === c.key;
            const n = c.key ? (counts[c.key] || 0) : Object.values(counts).reduce((a, b) => a + b, 0);
            return (
              <button key={c.key || 'all'} onClick={() => setFilterCategory(c.key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${active ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                {c.label}<span className={`ml-1 text-xs ${active ? 'text-white/70' : 'text-gray-400'}`}>{n}</span>
              </button>
            );
          })}
        </div>
```
并把筛选行的上传者输入框 placeholder 改为 `原名/上传者搜索...`。

- [ ] **Step 6: 网格卡片加分类角标**

在网格视图缩略图容器（`<div className="aspect-square ...">` 那层）内、`<img .../>` 之后插入角标：
```jsx
                    <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${BADGE_CLASS[img.category] || BADGE_CLASS.misc}`}>
                      {CAT_LABEL[img.category] || '未分类'}
                    </span>
```
（该 `<div>` 需具备定位上下文：把它的 className 由 `aspect-square bg-gray-100 flex items-center justify-center overflow-hidden` 改为在末尾追加 ` relative`。）

- [ ] **Step 7: 列表视图加「分类」列**

表头在「文件名」`<th>` 之后插入 `<th className="text-left px-4 py-3 text-gray-500 font-medium">分类</th>`；对应数据行在文件名 `<td>` 之后插入：
```jsx
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_CLASS[img.category] || BADGE_CLASS.misc}`}>
                        {CAT_LABEL[img.category] || '未分类'}
                      </span>
                    </td>
```

- [ ] **Step 8: 上传弹窗加分类下拉，上传请求带 ?category=**

在上传弹窗「作品名称」输入块之前，插入分类选择：
```jsx
          {/* 业务分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">图片分类</label>
            <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {UPLOAD_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">决定图片存入哪个分类目录</p>
          </div>
```
在 `handleUpload` 中，把两处 `fetch('/api/v1/upload'...)` 与 `fetch('/api/v1/upload/multiple'...)` 的 URL 改为带 query：
```jsx
        const res = await fetch(`/api/v1/upload?category=${uploadCategory}`, {
```
```jsx
        const res = await fetch(`/api/v1/upload/multiple?category=${uploadCategory}`, {
```
并在 `closeUpload` 与上传成功后的重置里加 `setUploadCategory('works');`。

- [ ] **Step 9: 构建验证 + 页面走通**

Run: `cd admin && npx vite build`
Expected: 构建成功无报错。

再 `npm run dev` 起 admin，登录后进「图片库」：
- 分类 Tab 显示且计数正确；点各 Tab 列表随之过滤。
- 老图集中在「未分类」Tab。
- 上传弹窗选「材料」上传一张 → 该图出现在「材料」Tab、卡片左下有琥珀色「材料」角标、列表视图有分类列。
- 单张删除、批量删除仍正常。

- [ ] **Step 10: Commit**

```bash
git add admin/src/pages/Images.jsx
git commit -m "feat(admin): 图片库页新增分类Tab/角标/筛选/上传选分类"
```

---

## Task 8: admin 其余 5 处上传补分类

**Files:**
- Modify: `admin/src/pages/Materials.jsx:114-122`（materials）
- Modify: `admin/src/pages/Properties.jsx:86-93`（properties）
- Modify: `admin/src/pages/Settings.jsx:317-324`（banners）
- Modify: `admin/src/pages/Settings.jsx:423-429`（avatars，设计团队头像）
- Modify: `admin/src/pages/Works.jsx:389-393`（works，走 axios client）

**Interfaces:**
- Consumes: `POST /api/v1/upload?category=`（Task 3-5）

- [ ] **Step 1: Materials.jsx —— fetch URL 加 ?category=materials**

将 `fetch('/api/v1/upload'` 改为 `fetch('/api/v1/upload?category=materials'`（保持其余不变）。

- [ ] **Step 2: Properties.jsx —— ?category=properties**

`handleImageUpload` 内 `fetch('/api/v1/upload'` → `fetch('/api/v1/upload?category=properties'`。

- [ ] **Step 3: Settings.jsx handleBannerUpload —— ?category=banners**

`fetch('/api/v1/upload'` → `fetch('/api/v1/upload?category=banners'`。

- [ ] **Step 4: Settings.jsx handleDtAvatarUpload —— ?category=avatars**

`fetch('/api/v1/upload'` → `fetch('/api/v1/upload?category=avatars'`。

- [ ] **Step 5: Works.jsx handleUpload（axios）—— ?category=works**

将 `client.post('/upload/multiple', formData)` 改为：
```jsx
      client.post('/upload/multiple?category=works', formData)
```
（保持 formData 与其余参数不变）

- [ ] **Step 6: 构建 + 逐处走通**

Run: `cd admin && npx vite build`（成功）。
起 admin + server，逐一验证：
- 材料管理上传封面 → 落 `uploads/materials/`、图片库「材料」Tab 可见、材料列表图不裂。
- 楼盘上传封面 → `uploads/properties/`。
- 系统设置上传 Banner → `uploads/banners/`；设计团队头像 → `uploads/avatars/`。
- 作品编辑弹窗上传图 → `uploads/works/`。

- [ ] **Step 7: Commit**

```bash
git add admin/src/pages/Materials.jsx admin/src/pages/Properties.jsx admin/src/pages/Settings.jsx admin/src/pages/Works.jsx
git commit -m "feat(admin): 材料/楼盘/Banner/团队头像/作品上传各自携带业务分类"
```

---

## Task 9: 小程序上传补分类

**Files:**
- Modify: `miniprogram/utils/api.js:219-271`（`compressAndUpload`/`uploadImage`/`uploadImages`）
- Modify: `miniprogram/pages/work-upload/index.js:497`（works）
- Modify: `miniprogram/pages/designer-center/index.js:182`（avatars）
- Modify: `miniprogram/pages/designer-task-detail/index.js:116`（construction）
- Modify: `miniprogram/pages/engineer-task-detail/index.js:100`（construction）
- Modify: `miniprogram/pages/material-order-detail/index.js:219`（materials）
- Modify: `miniprogram/pages/material-order-detail/index.js:309`（construction）

**Interfaces:**
- Consumes: `POST /api/v1/upload?category=`
- Produces: `uploadImage(filePath, category)` / `uploadImages(list, category)` 新增可选第二参，拼到 URL query

- [ ] **Step 1: 读 api.js:219-271 确认现有签名**

Run: `sed -n '215,275p' miniprogram/utils/api.js`
Expected: 看到 `compressAndUpload` 的 `wx.uploadFile({ url: \`${baseUrl}/api/v1/upload\`, ... })` 与 `uploadImages` 循环。

- [ ] **Step 2: 给 compressAndUpload 加 category 参数并拼到 url**

将 `compressAndUpload` 签名由 `(filePath)` 改为 `(filePath, category = '')`，并把上传 url 改为：
```js
      url: `${baseUrl}/api/v1/upload${category ? `?category=${category}` : ''}`,
```
将 `uploadImages` 签名由 `(paths)` 改为 `(paths, category = '')`，循环内调用改为 `compressAndUpload(p, category)`（逐个透传）。
> 若 `uploadImage` 是 `compressAndUpload` 的别名导出，则其调用方传第二参即可生效。

- [ ] **Step 3: 各调用页传业务分类**

- `work-upload/index.js:497`：`uploadImages(this.data.localImages, 'works')`
- `designer-center/index.js:182`：`uploadImage(filePath, 'avatars')`
- `designer-task-detail/index.js:116`：`api.uploadImage(path, 'construction')`
- `engineer-task-detail/index.js:100`：`api.uploadImage(path, 'construction')`
- `material-order-detail/index.js:219`：`api.uploadImage(path, 'materials')`
- `material-order-detail/index.js:309`：`api.uploadImage(path, 'construction')`

- [ ] **Step 4: 走通（微信开发者工具）**

用开发者工具打开小程序 → 设计师上传作品、头像；施工设计图/完工图上传；选材/施工异议图上传。
Expected: 服务器对应分类目录出现文件，`image_library.category` 正确；小程序各处图片正常显示（无裂图）。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/api.js miniprogram/pages/work-upload/index.js miniprogram/pages/designer-center/index.js miniprogram/pages/designer-task-detail/index.js miniprogram/pages/engineer-task-detail/index.js miniprogram/pages/material-order-detail/index.js
git commit -m "feat(miniprogram): 各端上传携带业务分类（作品/头像/施工/材料）"
```

---

## Task 10: H5 上传补分类

**Files:**
- Modify: `h5/src/api/designer.js:28-35`（`uploadImage`）
- Modify: `h5/src/pages/WorkUpload.jsx:161`（works）

**Interfaces:**
- Consumes: `POST /api/v1/upload?category=`
- Produces: `uploadImage(file, workName, category)` 新增第三参，拼到 URL query

- [ ] **Step 1: designer.js uploadImage 加 category 参数**

改为：
```js
export const uploadImage = (file, workName, category = 'works') => {
  const formData = new FormData();
  formData.append('file', file);
  if (workName) formData.append('work_name', workName);
  return client.post(`/upload?category=${category}`, formData).then((r) => r.data);
};
```

- [ ] **Step 2: WorkUpload.jsx 调用传 works**

`uploadImage(img.file, form.title.trim())` → `uploadImage(img.file, form.title.trim(), 'works')`
（当前默认值已是 works，此步为显式化，可与 Step 1 二选一实施；建议保留显式以防未来复用。）

- [ ] **Step 3: 构建 + 走通**

Run: `cd h5 && npm run build`（成功）。
起 h5，登录设计师上传作品图。
Expected: 落 `uploads/works/`，`image_library.category=works`，H5 作品图正常显示。

- [ ] **Step 4: Commit**

```bash
git add h5/src/api/designer.js h5/src/pages/WorkUpload.jsx
git commit -m "feat(h5): 设计师作品上传携带 works 分类"
```

---

## 最终回归验证（全部任务后）

- [ ] 各端分别上传一张图，确认落对分类目录、文件名带前缀、`image_library.category` 正确。
- [ ] 图片库页：8 个 Tab 计数正确、切换过滤正确、角标 6 色可辨、上传选分类生效、单张/批量删除生效、被引用图删除有警告。
- [ ] 不传 category 的历史路径仍成功（落 misc）。
- [ ] 现有作品/楼盘/材料/施工/H5/小程序页面图片显示正常（无裂图）。
- [ ] 老 20 张图仍在原位、显示正常，集中在「未分类」Tab。

## 风险与回滚

- 本计划不移动老文件、不改老路径，风险集中在「新代码是否正确写新图」。
- 迁移 012 可 `npm run migrate:rollback` 回退（会删 category 列）。
- 若某上传点漏传分类，仅落 misc、不影响显示，可补。
