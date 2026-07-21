# 住好房展示平台 — 项目地图

> 首次对话只读本文件，按需打开子项目 CLAUDE.md。每子项目文档只写它独有的东西，不跨文件重复。

---

## 子项目

| 项目 | 入口 | 技术栈 | 一句话 |
|------|------|--------|--------|
| 后端 API | [server/](server/CLAUDE.md) | Express 5 + SQLite + Knex | 20 路由模块，33 表 |
| 管理后台 | [admin/](admin/CLAUDE.md) | React 19 + Tailwind 4 + Vite | 24 页面，`/admin/` |
| 小程序 | [miniprogram/](miniprogram/CLAUDE.md) | 微信原生 | 5 tab，30 页面 |
| 摇一摇 H5 | [lottery_replica/](lottery_replica/CLAUDE.md) | 静态 HTML + jQuery | `/lottery/` |

## 环境

- **配置入口**：根目录 `env.config.json` → `active` 字段切 test/prod
- **测试服务器**：`test.wzzhfservice.cloud`（`/root/Zhf-Pro-test/`，pm2: `zhf-server-test`）
- **生产服务器**：`43.136.71.64`（`/root/Zhf-Pro/`，pm2: `zhf-server`）
- **小程序 AppID**：`wx45a2339808c171aa`
- **管理后台**：`test.wzzhfservice.cloud/admin/`（测试）/ `wzzhfservice.cloud/admin/`（生产）

## 日常操作

```bash
# 部署测试服务器（GitHub 不通时用 bundle）
git bundle create /tmp/d.bundle <server-head>..HEAD
scp /tmp/d.bundle root@test.wzzhfservice.cloud:/tmp/
ssh root@test.wzzhfservice.cloud "cd /root/Zhf-Pro-test && git fetch /tmp/d.bundle HEAD && git merge FETCH_HEAD && cd admin && npm run build && pm2 restart zhf-server-test"

# 部署生产
./deploy.sh prod

# 密钥更新（不走 git）
ssh root@<server> "vim /root/Zhf-Pro/server/.env"  # 编辑 → pm2 restart zhf-server
```

## 红线

- **密钥不进 git**：真实密钥只存在于服务器 `.env`（已 gitignore）
- **数据库不进 git**：`server/data/zhf.db` 绝不提交
- **小程序 `require()` 不能引用 miniprogram 目录外的文件**
