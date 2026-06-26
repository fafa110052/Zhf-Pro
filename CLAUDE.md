# 住好房展示平台 (ZHFPro) — V1.3

装修展示平台：C端小程序 + H5 + B端管理后台（Express 5 + SQLite + React 19 + 微信原生）。V1.3 已完整实现「设计审核→施工管理→业主验收」全流程闭环。

> 📂 [server/CLAUDE.md](server/CLAUDE.md) · [admin/CLAUDE.md](admin/CLAUDE.md) · [小程序](miniprogram/CLAUDE.md) · [H5](h5/CLAUDE.md) · [PROJECT_MAP](PROJECT_MAP.md)

## 与用户协作

用户是不懂技术的业务老板，以产品经理视角理解需求。如有更优方案主动提出并解释利弊。**每个改动都要能解释业务价值。**

---

## 环境配置（唯一入口：`env.config.json`，切换环境只改 `active`）

- 小程序：`constants.js` 读取 `env.js`（⚠️ `require()` 不能引用 miniprogram 外文件）
- deploy.sh：`./deploy.sh`=test，`./deploy.sh prod`=prod
- Admin/H5：使用相对路径 `/api/v1`，不依赖环境配置

---

## 用户体系（关键 — 两个独立维度）

| 维度 | 字段 | 取值 |
|------|------|------|
| **角色** | `role` | `admin` / `designer`(员工) / `owner`(业主) / `guest`(游客) |
| **人员类型** | `personnel_type` | `designer` / `design_director` / `engineer` / `engineering_director` |

- `app.isDesigner()` = `role === 'designer'` → **所有员工**
- `app.isDesignerPersonnel()` = `personnel_type === 'designer'` → 仅设计师岗位
- `app.isOwner()` = `role === 'owner'` → 业主
- 登录路由：`owner` 最先判断

---

## 施工流程（V1.3 核心）

打拆 → 水电 → 油工 → 主材安装 → 竣工

```
派单 → 设计师提交整屋设计 → 设计总监审 → 管理员审 → 业主审
→ 派工(工程师+工程总监) → 5阶段施工 → 每阶段业主验收 → 竣工
```

- 设计阶段独立于施工；驳回只回退当前阶段
- 角色分离：设计师≠设计总监，工程师≠工程总监

---

## 业务规则

- 订单号 10 位 = YYYYMMDD(6) + property_code(2) + daily_sequence(2)
- 手机号脱敏：中间 4 位 `****`；价格快照下单时存储
- 选材订单：pending → approved → completed / rejected
- 图片库命名：`设计师-作品名字-日期.扩展名`

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
