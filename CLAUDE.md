# 住好房展示平台 (ZHFPro)

装修展示平台：C端小程序 + B端管理后台（Express 5 + SQLite + React 19 + 微信原生）。

> 📂 [server](server/CLAUDE.md) · [admin](admin/CLAUDE.md) · [小程序](miniprogram/CLAUDE.md) · [抽奖](lottery_replica/CLAUDE.md) · [项目索引](PROJECT_MAP.md)

---
## 按需加载

**只在需要访问某个子项目时才读取其 CLAUDE.md。** 首次只读本文件，后续按需打开：

| 任务涉及 | 读取文件 |
|---------|---------|
| 后端 API/数据库/业务逻辑 | `server/CLAUDE.md` |
| 管理后台页面/组件/路由 | `admin/CLAUDE.md` |
| 小程序页面/组件 | `miniprogram/CLAUDE.md` |
| 摇一摇抽奖 H5 | `lottery_replica/CLAUDE.md` |
| 跨项目概览/环境/部署 | `PROJECT_MAP.md` |

## 与用户协作

用户是不懂技术的业务老板，以产品经理视角理解需求。如有更优方案主动提出并解释利弊。**每个改动都要能解释业务价值。**

## 安全红线（硬性要求）

**绝不把密钥/令牌提交到 git。** 微信 AppSecret、JWT_SECRET、GitHub token、SSH/SSL key 等一律不进版本库：
- 真实密钥只存在于服务器与本地的 `.env`（已 gitignore）；`.env.example` 只放占位符。
- 每次 `git add` 前扫描改动，确认不含真实密钥；git 远程地址不得内嵌 token。
- 密钥更新走服务器 `.env` + 重启，不经 git（见 [PROJECT_MAP](PROJECT_MAP.md) 「密钥同步」）。

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
