# 设计团队「从人员选择」新增 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理后台「系统设置 → 设计团队 → 新增」改为从现有设计师/设计总监中选一人预填姓名+头像（快照），姓名/头像/风格/排序仍可编辑。

**Architecture:** 纯前端单文件改动（`admin/src/pages/Settings.jsx`）。新增弹窗顶部加「人员下拉」，选中后 onChange 预填 `dtName`/`dtAvatar`；四字段保持手动可编辑。保存复用现有 `POST /api/v1/admin/design-team`。后端、数据库、小程序不动。

**Tech Stack:** React 19 + Vite 8 + TailwindCSS 4；Axios 客户端 `admin/src/api/client.js`（baseURL `/api/v1`，响应拦截器返回 `response.data`，即 `res` = `{success,data}`，`res.data` = 内层 data）。

## Global Constraints

- 只改 `admin/src/pages/Settings.jsx`，不动后端/数据库/小程序。
- 编辑流程（`dtFormMode === 'edit'`）行为完全不变，不显示人员下拉。
- 人员列表接口：`GET /admin/designers`，params `{ personnel_type: 'designer,design_director', page_size: 50 }`，返回 `res.data.list`，每项含 `id, name, avatar_url, personnel_type`。
- 保存 body 不变：`{ name, avatar_url, styles, sort_order }`。
- 岗位中文：`designer → 设计师`，`design_director → 设计总监`。
- 防重复：下拉过滤掉姓名已存在于 `designTeam` 的人。
- 无测试框架：自动化校验统一用 `cd admin && npx vite build`；行为校验用手动清单。
- 遵循现有样式 Token（输入框/下拉沿用文件内既有 className）。

---

### Task 1: 人员选择数据与状态

**Files:**
- Modify: `admin/src/pages/Settings.jsx`（模块顶部常量区、组件 state 区约 68-86、`openDtAddForm` 约 343-352，新增一个 select handler）

**Interfaces:**
- Consumes: `client`（已导入）、`designTeam` state（已存在，数组含 `{id,name,avatar_url,styles,sort_order}`）。
- Produces: 供 Task 2 使用的 —
  - state：`dtPersonId`(string)、`dtPersonnel`(array)、`dtPersonnelLoading`(bool)
  - 常量：`DT_PERSONNEL_LABEL`（`{designer:'设计师', design_director:'设计总监'}`）
  - 函数：`handleDtPersonSelect(e)` — 根据选中 id set `dtPersonId/dtName/dtAvatar`
  - `openDtAddForm` 变为 async，打开时拉取并过滤人员列表

- [ ] **Step 1: 在模块顶部（组件函数 `export default function Settings()` 之前）新增岗位中文常量**

在文件已有顶部工具函数 `parseValue` 附近（`Settings.jsx:23` 上方或下方，模块作用域）加入：

```jsx
// ─── 设计团队可选岗位中文映射 ───
const DT_PERSONNEL_LABEL = { designer: '设计师', design_director: '设计总监' };
```

- [ ] **Step 2: 新增三个 state（在设计团队表单 state 区，紧随 `const [dtFormError, setDtFormError] = useState('');` 之后，约 Settings.jsx:82）**

```jsx
  // ─── 设计团队：人员选择（仅新增用）───
  const [dtPersonId, setDtPersonId] = useState('');
  const [dtPersonnel, setDtPersonnel] = useState([]);
  const [dtPersonnelLoading, setDtPersonnelLoading] = useState(false);
```

- [ ] **Step 3: 将 `openDtAddForm` 改为 async，重置人员选择并拉取候选人（替换现有 `openDtAddForm`，约 Settings.jsx:343-352）**

```jsx
  // ─── 设计团队：打开新增表单（拉取可选人员）───
  const openDtAddForm = async () => {
    setDtFormMode('add');
    setDtFormId(null);
    setDtPersonId('');
    setDtName('');
    setDtAvatar('');
    setDtStyles('');
    setDtSortOrder(designTeam.length);
    setDtFormError('');
    setDtFormOpen(true);

    setDtPersonnelLoading(true);
    try {
      const res = await client.get('/admin/designers', {
        params: { personnel_type: 'designer,design_director', page_size: 50 },
      });
      const list = (res.data.list || []).filter(
        (p) => !designTeam.some((t) => t.name === p.name)
      );
      setDtPersonnel(list);
    } catch {
      setDtPersonnel([]);
    } finally {
      setDtPersonnelLoading(false);
    }
  };
```

- [ ] **Step 4: 新增 `handleDtPersonSelect`（放在 `openDtEditForm` 之后，约 Settings.jsx:363 之后）**

```jsx
  // ─── 设计团队：选中人员 → 预填姓名+头像（仍可再改）───
  const handleDtPersonSelect = (e) => {
    const id = e.target.value;
    setDtPersonId(id);
    const p = dtPersonnel.find((x) => String(x.id) === String(id));
    if (p) {
      setDtName(p.name || '');
      setDtAvatar(p.avatar_url || '');
    }
  };
```

- [ ] **Step 5: 构建校验（此时下拉尚未接入 UI，仅确认无语法/引用错误）**

Run: `cd admin && npx vite build`
Expected: 构建成功，末尾出现 `dist/assets/index-*.js`，无报错。

- [ ] **Step 6: Commit**

```bash
git add admin/src/pages/Settings.jsx
git commit -m "feat(admin): 设计团队新增-人员选择数据与状态"
```

---

### Task 2: 弹窗接入人员下拉 + 校验提示

**Files:**
- Modify: `admin/src/pages/Settings.jsx`（`handleDtSave` add 分支校验约 366-372；设计团队表单弹窗 add 分支 JSX 约 889-900）

**Interfaces:**
- Consumes: Task 1 的 `dtPersonId`、`dtPersonnel`、`dtPersonnelLoading`、`DT_PERSONNEL_LABEL`、`handleDtPersonSelect`。
- Produces: 完整可用的「从人员选择」新增流程。

- [ ] **Step 1: 校验提示区分 add/edit（替换 `handleDtSave` 开头的姓名校验，约 Settings.jsx:368-371）**

原代码：
```jsx
    if (!dtName.trim()) {
      setDtFormError('请输入设计师姓名');
      return;
    }
```
替换为：
```jsx
    if (!dtName.trim()) {
      setDtFormError(dtFormMode === 'add' ? '请选择人员' : '请输入设计师姓名');
      return;
    }
```

- [ ] **Step 2: 在弹窗表单顶部（`dtFormError` 提示块之后、「姓名」字段 `{/* 姓名 */}` 之前，约 Settings.jsx:893）插入 add 模式专属人员下拉**

```jsx
          {/* 选择人员（仅新增）*/}
          {dtFormMode === 'add' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">选择人员 <span className="text-red-400">*</span></label>
              <select value={dtPersonId} onChange={handleDtPersonSelect} disabled={dtPersonnelLoading}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50">
                <option value="">{dtPersonnelLoading ? '加载中...' : '请选择设计师 / 设计总监'}</option>
                {dtPersonnel.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}（{DT_PERSONNEL_LABEL[p.personnel_type] || '员工'}）</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-0.5">选中后自动带出姓名和头像，可再修改</p>
            </div>
          )}
```

- [ ] **Step 3: 构建校验**

Run: `cd admin && npx vite build`
Expected: 构建成功，无报错。

- [ ] **Step 4: 手动行为校验（本地 `cd admin && npm run dev`，登录后台 → 系统设置 → 设计团队）**

逐项确认：
1. 点「新增」→ 弹窗顶部出现「选择人员」下拉，列出设计师+设计总监，已在团队中的同名者不出现。
2. 选中一人 → 姓名、头像自动预填；头像预览出现。
3. 修改头像（重新粘贴链接或本地上传）与姓名 → 可正常改动并预览更新。
4. 填擅长风格+排序 → 保存 → 团队列表新增该成员，字段正确。
5. 不选人直接保存 → 提示「请选择人员」，无网络请求。
6. 对已有成员点「编辑」→ 无人员下拉，四字段仍可手动编辑，行为不变。

- [ ] **Step 5: Commit**

```bash
git add admin/src/pages/Settings.jsx
git commit -m "feat(admin): 设计团队新增-弹窗接入人员下拉与校验"
```

---

## Self-Review

**1. Spec coverage:**
- 只保留「从人员选择」、移除手动新增入口 → Task 2 Step 2（add 模式加下拉；手动"姓名/头像"字段保留但按需求作为可编辑预填载体，非独立手填入口）。✓
- 快照复制姓名+头像 → Task 1 Step 4 `handleDtPersonSelect` set `dtName/dtAvatar`；保存 body 不变。✓
- 选中仅预填、头像姓名仍可编辑 → 四字段输入框保留（未改），Task 2 仅新增下拉。✓
- 擅长风格手填 → 现有 `dtStyles` 输入框未动。✓
- 编辑流程不变 → 下拉用 `dtFormMode === 'add'` 门控。✓
- 防重复（按姓名过滤）→ Task 1 Step 3 filter。✓
- 打开时加载人员、加载中禁用 → Task 1 Step 3 + Task 2 Step 2 `disabled={dtPersonnelLoading}`。✓
- 未选人拦截提示 → Task 2 Step 1。✓
- 后端/数据库/小程序不动 → 全程仅改 Settings.jsx。✓
- 构建通过 → 两个 Task 均含 `npx vite build`。✓

**2. Placeholder scan:** 无 TBD/TODO/“类似上文”；每个改动步骤含完整代码。✓

**3. Type consistency:** `dtPersonId`(string，来自 `<select>` value)、`handleDtPersonSelect`、`DT_PERSONNEL_LABEL`、`dtPersonnel`/`dtPersonnelLoading` 在 Task 1 定义、Task 2 引用，名称一致；`res.data.list` 与客户端拦截器返回结构一致。✓
