# 管理后台"编辑作品"功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理后台作品管理新增编辑功能:可修改作品全部信息(除设计师归属),图片可增删(上限 15 张),改完直接生效。

**Architecture:** 复用现有创建弹窗改造为创建/编辑两用组件(`WorkFormModal`);后端新增 `caseService.adminUpdate` + `PUT /api/v1/admin/works/:id`,与设计师编辑共享字段构建/图片替换两个提取出的模块级辅助函数,但无所有权/状态限制、不重置审核状态。

**Tech Stack:** Express 5 + Knex/SQLite(server)、React 19 + Tailwind(admin)。无测试框架,后端用一次性 node 脚本验证,前端用构建 + 手动走查验证。

**Spec:** `docs/superpowers/specs/2026-07-15-admin-work-edit-design.md`

## Global Constraints

- 图片上限:复用 Works.jsx 已有常量 `MAX_IMAGES = 15`、`UPLOAD_CONCURRENCY = 3`,不新增数字字面量
- 管理员编辑**不改变 `review_status`**,不重置 `reject_reason`
- 接口层剔除 `designer_id`,归属不可改
- 删除的旧图**仅在保存成功后**逐张 `DELETE /admin/images/:id`(不带 force,失败静默跳过)
- 取消弹窗只清理本次新上传的图,旧图(含被标记删除的)不动
- 一次性 node 脚本必须 `finally db.destroy()`(否则留孤儿进程)
- 提交信息用中文,格式 `feat(scope): 描述`

---

### Task 1: 后端 — adminUpdate 服务方法 + 管理员更新路由

**Files:**
- Modify: `server/src/services/caseService.js`(约 418 行 `update` 方法、约 599 行 `getByIdAdmin`)
- Modify: `server/src/routes/cases.js`(约 223 行 GET /admin/works/:id 之后)

**Interfaces:**
- Consumes: 模块内已有 `normalizeCoverImage(url)`、`normalizeVrUrl(url)`、`db`
- Produces:
  - `caseService.adminUpdate(workId: number, data: object) → Promise<work>`(work 为 `getByIdAdmin` 返回结构)
  - `PUT /api/v1/admin/works/:id`,body 同创建接口(title/description/house_type_id/area_category_id/style_category_id/area_sqm/budget_min/budget_max/cover_image/images:[{id}]),响应 `{ success:true, data: work }`
  - `getByIdAdmin` 返回的 `images[]` 新增 `library_image_id` 字段(Task 2 依赖)

- [ ] **Step 1: 提取两个模块级辅助函数**

在 `caseService.js` 中,`normalizeVrUrl`/`normalizeCoverImage` 等模块级函数附近(`module.exports` 对象之前)新增:

```js
/** 从请求体构建 cases 表的更新字段（白名单 + 归一化，不含 designer_id / review_status） */
function buildCaseUpdates(data) {
  const allowed = ['title', 'description', 'house_type_id', 'area_category_id',
                   'style_category_id', 'area_sqm', 'budget_min', 'budget_max',
                   'completion_date', 'cover_image', 'vr_url'];
  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      if (key === 'cover_image') {
        updates[key] = normalizeCoverImage(data[key]);
      } else if (key === 'vr_url') {
        updates[key] = normalizeVrUrl(data[key]);
      } else {
        updates[key] = data[key];
      }
    }
  }
  return updates;
}

/** 整组替换作品图片关联（先删后插，保持 sort_order） */
async function replaceCaseImages(workId, images) {
  await db('case_images').where('case_id', workId).delete();
  if (images && images.length > 0) {
    const imageIds = images.map(img => img.id);
    const libImages = await db('image_library').whereIn('id', imageIds).select('id', 'image_url', 'thumb_url');
    const urlMap = {};
    for (const li of libImages) {
      urlMap[li.id] = { image_url: li.image_url, thumb_url: li.thumb_url || null };
    }
    const caseImages = images.map((img, idx) => ({
      case_id: workId,
      library_image_id: img.id,
      image_url: (urlMap[img.id] && urlMap[img.id].image_url) || '',
      thumb_url: (urlMap[img.id] && urlMap[img.id].thumb_url) || null,
      sort_order: idx,
    }));
    await db('case_images').insert(caseImages);
  }
}
```

- [ ] **Step 2: 重构现有 `update` 方法使用辅助函数(行为不变)**

`update(designerId, workId, data)` 方法中,把"allowed 白名单循环构建 updates"一段替换为:

```js
    const updates = buildCaseUpdates(data);
    // 编辑后回到草稿状态（驳回后重编）
    if (work.review_status === 'rejected') {
      updates.review_status = 'draft';
      updates.reject_reason = null;
    }

    await db('cases').where('id', workId).update(updates);

    // 更新图片关联（先删后插，保持 sort_order）
    if (data.images !== undefined) {
      await replaceCaseImages(workId, data.images);
    }
```

保留方法开头的存在性/所有权/状态三重校验和方法结尾的返回值,其余不动。

- [ ] **Step 3: 新增 `adminUpdate` 方法**

紧跟 `getByIdAdmin` 方法之后新增:

```js
  /** 管理员编辑作品（任意状态可编辑，不改审核状态，不可改归属） */
  async adminUpdate(workId, data) {
    const work = await db('cases').where('id', workId).first();
    if (!work) {
      throw Object.assign(new Error('作品不存在'), { status: 404 });
    }
    if (data.title !== undefined && !data.title) {
      throw Object.assign(new Error('作品标题不能为空'), { status: 400 });
    }

    const updates = buildCaseUpdates(data);
    if (Object.keys(updates).length > 0) {
      await db('cases').where('id', workId).update(updates);
    }
    if (data.images !== undefined) {
      await replaceCaseImages(workId, data.images);
    }
    return this.getByIdAdmin(workId);
  },
```

- [ ] **Step 4: `getByIdAdmin` 的 images 查询补充 `library_image_id`**

```js
    const images = await db('case_images')
      .where('case_id', workId)
      .orderBy('sort_order', 'asc')
      .select('id', 'library_image_id', 'image_url', 'thumb_url', 'sort_order');
```

(仅在 select 中加 `'library_image_id'`,其余不动——`id` 仍是 case_images 行 ID,详情面板删图功能依赖它,不能改。)

- [ ] **Step 5: 新增管理员更新路由**

`server/src/routes/cases.js` 中 `GET /admin/works/:id` 路由之后新增:

```js
/**
 * PUT /api/v1/admin/works/:id
 * 管理员编辑作品（任意状态，直接生效，不改审核状态；不可改设计师归属）
 */
router.put('/admin/works/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { designer_id, review_status, ...data } = req.body; // 接口层剔除不可改字段
    const work = await caseService.adminUpdate(Number(req.params.id), data);
    res.json({ success: true, data: work });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 6: 一次性脚本验证(本地开发库)**

```bash
cd server && node -e "
const caseService = require('./src/services/caseService');
const db = require('./src/db/connection');
(async () => {
  try {
    const list = await caseService.listAdmin({}, { page: 1, page_size: 1 });
    if (!list.list.length) { console.log('SKIP: 本地库无作品'); return; }
    const id = list.list[0].id;
    const before = await caseService.getByIdAdmin(id);
    const updated = await caseService.adminUpdate(id, { title: before.title, images: before.images.map(i => ({ id: i.library_image_id })) });
    console.log('status不变:', updated.review_status === before.review_status);
    console.log('图片数不变:', updated.images.length === before.images.length);
    console.log('images带library_image_id:', updated.images.every(i => i.library_image_id != null));
    console.log('designer不变:', updated.designer_id === before.designer_id);
  } finally { await db.destroy(); }
})();"
```

Expected:四行全部输出 `true`(或 `SKIP`,则先跑 `npm run migrate:reset` 造种子数据再验)。

- [ ] **Step 7: Commit**

```bash
git add server/src/services/caseService.js server/src/routes/cases.js
git commit -m "feat(server): 管理员编辑作品接口——任意状态可改不动审核状态,归属不可改"
```

---

### Task 2: 前端 — 创建弹窗改造为创建/编辑两用 + 两处入口

**Files:**
- Modify: `admin/src/pages/Works.jsx`(CreateModal 约 381-700 行、DetailPanel 底部按钮约 238 行起、列表行操作约 1117 行、面板/弹窗挂载约 1130-1145 行、主组件状态约 737 行)

**Interfaces:**
- Consumes: Task 1 的 `PUT /admin/works/:id`、`GET /admin/works/:id`(images 含 `library_image_id`)、已有 `DELETE /admin/images/:id`
- Produces: `WorkFormModal({ open, work, onClose, onSaved })` — `work` 为 null 创建 / 非 null(含 id)编辑;`onSaved` 替代原 `onCreated`

**统一图片状态模型(核心思路):** 编辑模式把已有图片预填进现有 `uploadedImages` 数组,每项加 `existing: true` 标记。新图逻辑零改动;删除旧图仅记入 `removedExistingIdsRef`,保存成功后才真正删图库。

- [ ] **Step 1: 组件签名与状态**

`function CreateModal({ open, onClose, onCreated })` 改为:

```jsx
function WorkFormModal({ open, work, onClose, onSaved }) {
  const isEdit = !!work;
```

状态区新增(uploadKeyRef 旁):

```jsx
  const [detailError, setDetailError] = useState('');       // 编辑模式详情加载失败
  const removedExistingIdsRef = useRef([]);                 // 被删除旧图的图库ID，保存成功后才真正删除
```

- [ ] **Step 2: 编辑模式加载详情预填**

打开时加载数据的 useEffect 之后新增:

```jsx
  // 编辑模式：打开时拉取作品详情预填
  useEffect(() => {
    if (!open || !isEdit) return;
    setDetailError('');
    removedExistingIdsRef.current = [];
    client.get(`/admin/works/${work.id}`).then((res) => {
      const w = res.data;
      setTitle(w.title || '');
      setDescription(w.description || '');
      setDesignerId(String(w.designer_id || ''));
      setHouseTypeId(String(w.house_type_id || ''));
      setAreaId(String(w.area_category_id || ''));
      setStyleId(String(w.style_category_id || ''));
      setAreaSqm(w.area_sqm != null ? String(w.area_sqm) : '');
      setBudgetMin(w.budget_min != null ? String(w.budget_min) : '');
      setBudgetMax(w.budget_max != null ? String(w.budget_max) : '');
      setCoverImage(w.cover_image || '');
      setUploadedImages((w.images || []).map((img) => ({
        key: ++uploadKeyRef.current,
        status: 'done',
        progress: 100,
        existing: true,                 // 旧图标记：删除走延迟删除，取消时不清理
        id: img.library_image_id,
        image_url: img.image_url,
        thumb_url: img.thumb_url,
      })));
    }).catch((err) => setDetailError(err?.message || '作品详情加载失败'));
  }, [open, isEdit, work?.id]);
```

- [ ] **Step 3: removeImage 区分新旧图**

`removeImage` 中 `if (target?.id) client.delete(...)` 一行改为:

```jsx
    if (target?.id) {
      if (target.existing) {
        removedExistingIdsRef.current.push(target.id); // 旧图：保存成功后才真正删
      } else {
        client.delete(`/admin/images/${target.id}`).catch(() => {}); // 新图：立即清理
      }
    }
```

- [ ] **Step 4: handleClose 只清理新图**

`handleClose` 中的 forEach 改为:

```jsx
    // 未保存就关闭：只清理本次新上传的图片，旧图（含被标记删除的）不动
    uploadedImages.forEach((img) => {
      if (img.id && !img.existing) client.delete(`/admin/images/${img.id}`).catch(() => {});
    });
```

`resetForm` 末尾追加一行 `removedExistingIdsRef.current = []; setDetailError('');`。

- [ ] **Step 5: handleSubmit 分支创建/更新**

校验部分:`if (!designerId)` 一行改为 `if (!isEdit && !designerId) { setFormError('请选择设计师'); return; }`(编辑模式设计师由后端忽略)。编辑模式加一条:`if (isEdit && detailError) { setFormError('详情未加载成功,不能保存'); return; }`

try 块整体替换为:

```jsx
      const payload = {
        title: title.trim(),
        description: description.trim(),
        house_type_id: Number(houseTypeId),
        area_category_id: Number(areaId),
        style_category_id: Number(styleId),
        area_sqm: areaSqm ? Number(areaSqm) : null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        cover_image: coverImage || null,
        images: uploadedImages.filter((img) => img.status === 'done').map((img) => ({ id: img.id })),
      };
      if (isEdit) {
        await client.put(`/admin/works/${work.id}`, payload);
        // 保存成功后才真正删除被移除的旧图（不带 force，仍被别处引用的自动跳过）
        removedExistingIdsRef.current.forEach((id) => {
          client.delete(`/admin/images/${id}`).catch(() => {});
        });
        toast.success('作品已更新');
      } else {
        await client.post('/admin/works', { ...payload, designer_id: Number(designerId) });
        toast.success('作品创建成功');
      }
      resetForm(); // 成功：图片已绑定作品，只重置表单，不删图库
      onSaved();
```

catch 中错误文案改为 `err?.message || (isEdit ? '保存失败' : '创建失败')`。

- [ ] **Step 6: JSX 差异化**

- 头部标题:`创建作品` → `{isEdit ? '编辑作品' : '创建作品'}`
- 表单顶部错误区之前加详情加载失败提示(加载失败时关掉重开弹窗即可重试,不做重试按钮):

```jsx
          {isEdit && detailError && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
              {detailError}（请关闭弹窗后重试）
            </div>
          )}
```

- 设计师下拉:`<select value={designerId} onChange={...} className={...}>` 加 `disabled={isEdit}`,编辑模式下拉数据可能不含该设计师(只拉了50个),所以编辑模式直接显示只读文本:

```jsx
              {isEdit ? (
                <input type="text" value={work.designer_name || ''} disabled
                  className={`w-full ${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} />
              ) : (
                <select value={designerId} onChange={e => setDesignerId(e.target.value)} className={`w-full ${selectClass}`}>
                  <option value="">请选择</option>
                  {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
```

- 提交按钮文案:`创建中...` → `{isEdit ? '保存中...' : '创建中...'}`;`创建作品` → `{isEdit ? '保存修改' : '创建作品'}`

- [ ] **Step 7: 主组件接线(状态 + 两处入口 + 挂载)**

主组件 `createModalOpen` 附近新增:`const [editWork, setEditWork] = useState(null);`

列表行操作区,`详情` 按钮之前新增:

```jsx
                        <button onClick={() => setEditWork(w)}
                          className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded transition-colors">编辑</button>
```

DetailPanel:props 增加 `onEdit`,底部操作按钮区顶部新增一行(所有状态可见):

```jsx
              <button
                onClick={() => onEdit(work)}
                className="w-full py-2.5 border-2 border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                编辑作品
              </button>
```

DetailPanel 挂载处加 `onEdit={(w) => { setDetailWork(null); setEditWork(w); }}`。

弹窗挂载处,原 `<CreateModal open={createModalOpen} onClose={...} onCreated={...} />` 替换为:

```jsx
      <WorkFormModal open={createModalOpen || !!editWork} work={editWork}
        onClose={() => { setCreateModalOpen(false); setEditWork(null); }}
        onSaved={() => { setCreateModalOpen(false); setEditWork(null); fetchList(); }} />
```

(找到原挂载处 `onCreated` 的现有回调内容,保持其刷新逻辑——若原来是 `() => { setCreateModalOpen(false); fetchList(); }` 就照上写;若还有别的动作一并保留。)

- [ ] **Step 8: 构建验证**

```bash
cd admin && npm run build
```

Expected: `✓ built`,无 error(chunk 大小 warning 忽略)。

- [ ] **Step 9: Commit**

```bash
git add admin/src/pages/Works.jsx
git commit -m "feat(admin): 作品管理编辑功能——两用弹窗+延迟删旧图+图库同步清理"
```

---

### Task 3: 本地端到端验证 + 部署生产

**Files:** 无新改动(验证与部署)

- [ ] **Step 1: 启动本地环境**

```bash
cd server && npm run dev   # 终端1（或后台运行）
cd admin && npm run dev    # 终端2，浏览器开 http://localhost:5173
```

- [ ] **Step 2: 按验收标准手动走查(对照 spec)**

1. 编辑一个"已通过"作品:改标题、新增 2 张图、删 1 张旧图、换封面 → 保存 → 列表与详情立即更新,状态仍"已通过"
2. 再次打开编辑 → 预填正确(含图片、封面高亮)
3. 编辑中删旧图后点"取消" → 重新打开,旧图仍在;图片库页面无新增无主图
4. 编辑中新增图后点"取消" → 图片库无残留(新图被清理)
5. 已有 14 张图时再选多张 → 只收 1 张并提示
6. 创建作品全流程回归一遍(无回归)

- [ ] **Step 3: 提交部署(含后端改动,需 pm2 重启)**

```bash
git -c http.proxy=http://127.0.0.1:7890 push origin main
./deploy.sh prod
```

deploy.sh 若卡在"拉取最新代码"(服务器连 GitHub 不稳),用 bundle 兜底:

```bash
git bundle create /tmp/zhf.bundle origin/main..main
SERVER=$(node -e "console.log(require('./env.config.json').server.ssh)")
scp /tmp/zhf.bundle $SERVER:/tmp/
ssh $SERVER "cd /root/Zhf-Pro && git pull /tmp/zhf.bundle main && cd admin && npm run build 2>&1 | tail -2 && pm2 restart zhf-server && systemctl reload nginx && rm /tmp/zhf.bundle"
```

- [ ] **Step 4: 生产冒烟**

生产后台编辑一个测试作品(改标题→保存→改回),确认生效且状态不变。

```bash
DOMAIN=$(node -e "console.log(require('./env.config.json').server.domain)")
curl -sL -k --resolve $DOMAIN:443:43.136.71.64 https://$DOMAIN/admin/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
```

Expected: 资源哈希与服务器 dist 目录一致。
