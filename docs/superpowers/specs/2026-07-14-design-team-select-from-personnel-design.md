# 设计团队「从人员选择」新增 — 设计文档

- 日期：2026-07-14
- 范围：管理后台「系统设置 → 设计团队 → 新增」
- 影响面：仅前端单文件 `admin/src/pages/Settings.jsx`；后端 / 数据库 / 小程序均不改动

## 1. 背景与目标

当前「设计团队」新增是**纯手动录入**（手填姓名、上传头像、填擅长风格、排序）。业务希望改为：从系统已有的 `设计师` 和 `设计总监` 人员中**选择一名**加入设计团队，减少重复录入、避免姓名/头像填错。

**成功标准**：在设计团队卡片点「新增」→ 从人员下拉选一人 → 自动带出其姓名和头像 → 填写擅长风格与排序 → 保存后该成员出现在设计团队列表，并在小程序首页「设计团队」展示。

## 2. 关键决策（已与业务确认）

| 决策 | 选择 | 理由 |
|------|------|------|
| 新增方式 | **只保留「从人员选择」**，移除手动录入 | 符合本次需求，界面更简单 |
| 信息同步 | **加入时定格快照**（复制姓名+头像） | 改动最小、不动表结构；设计师后续改动不影响团队展示 |
| 编辑方式 | **保持原手动编辑** | 快照信息过时后由管理员手动更新，编辑入口正好承担此职责 |

快照方案的直接收益：`design_team` 表已含 `name / avatar_url / styles / sort_order`，现有 `POST /api/v1/admin/design-team` 已接受这四个字段，**后端与数据库无需任何改动**。

## 3. 现状（改动前）

- 表 `design_team`：`id, name, avatar_url, styles, sort_order, timestamps`（无 designer 关联）。
- 接口：
  - `GET /api/v1/admin/design-team` — 管理端列表（全字段）
  - `POST /api/v1/admin/design-team` — 新增，body `{ name, avatar_url, styles, sort_order }`
  - `PUT/DELETE /api/v1/admin/design-team/:id`
  - `GET /api/v1/admin/designers?personnel_type=designer,design_director&page_size=50` — 已存在，返回设计师+设计总监（作品创建弹窗已在用）
- 前端 `Settings.jsx`：
  - 状态：`dtFormOpen / dtFormMode / dtFormId / dtName / dtAvatar / dtStyles / dtSortOrder / dtSaving / dtUploading / dtFormError`
  - 打开：`openDtAddForm()` / `openDtEditForm(item)`
  - 保存：`handleDtSave()`（add→POST，edit→PUT）
  - 弹窗：`Settings.jsx:875-954`，字段 姓名 / 头像 / 擅长风格 / 排序（add 与 edit 共用）

## 4. 目标设计（改动后）

### 4.1 新增流程
点「新增」→ 弹窗：
1. **选择人员**（下拉）：列出全部 `设计师` + `设计总监`，选项文案 `姓名（岗位）`，如「张三（设计师）」「李四（设计总监）」。
2. 选中后自动带出该人的**姓名**与**头像**，头像只读预览。
3. 手动填 **擅长风格**（`designers` 表无此字段，必手填）与 **排序序号**。
4. 保存 → 以 `{ name, avatar_url, styles, sort_order }` 调用现有 `POST /admin/design-team`，姓名+头像即定格为快照。

### 4.2 编辑流程
保持现状：手动编辑姓名 / 头像 / 擅长风格 / 排序（走 `PUT`）。

### 4.3 细节规则
- **防重复**：人员下拉**过滤掉姓名已存在于当前设计团队**的人（快照无人员ID，按 `name` 去重，best-effort；同名不同人属极少数，可接受）。
- **无头像**：所选人 `avatar_url` 为空时，`dtAvatar` 置空，团队卡片按现有逻辑显示默认占位。
- **人员列表加载时机**：打开新增弹窗时拉取（`page_size=50`）。加载中禁用下拉。
- **未选人保存**：拦截并提示「请选择人员」。
- **岗位中文映射**：`designer → 设计师`，`design_director → 设计总监`。

## 5. 前端改动清单（`admin/src/pages/Settings.jsx`）

1. **新增 state**：`dtPersonId`（选中人员ID，仅 add 用）、`dtPersonnel`（人员列表）、`dtPersonnelLoading`。
2. **`openDtAddForm()`**：重置 `dtPersonId`，异步拉取 `/admin/designers?personnel_type=designer,design_director&page_size=50` 写入 `dtPersonnel`；过滤掉姓名已在 `designTeam` 中的人。
3. **弹窗 add 分支**（`dtFormMode === 'add'`）：以「人员下拉 + 只读头像预览」替换手动"姓名/头像"输入；擅长风格、排序仍为手动输入。
4. **弹窗 edit 分支**（`dtFormMode === 'edit'`）：完全保持现有手动字段。
5. **下拉 onChange**：根据选中人 set `dtPersonId`、`dtName`、`dtAvatar`。
6. **`handleDtSave()` add 分支**：校验已选人员（`dtName` 非空，否则提示"请选择人员"）；保存 body 不变。

不改：`design_team` 表、任何后端路由/服务、小程序。

## 6. 验证标准

1. 打开新增弹窗 → 下拉正确列出全部设计师+设计总监，已在团队中的同名者不出现。
2. 选中一人 → 姓名、头像自动带出并预览正确。
3. 填擅长风格+排序 → 保存 → 团队列表出现该成员，字段正确。
4. 未选人直接保存 → 提示"请选择人员"，不发请求。
5. 编辑已有成员 → 仍可手动改四个字段，行为不变。
6. 小程序首页「设计团队」展示新增成员（快照姓名+头像）。
7. `cd admin && npx vite build` 构建通过。

## 7. 非目标（本次不做）

- 不建 `design_team → designers` 外键关联，不做实时同步。
- 不保留手动新增入口。
- 不改编辑流程为「从人员选择」。
- 不改小程序端展示逻辑。
