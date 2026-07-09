# 住好房展示平台 — 项目地图 v2.0

> **用途**：快速定位子项目，具体文件清单见各项目 `CLAUDE.md`。
> **原则**：只在需要访问某个子项目时才读取其 CLAUDE.md，不在会话开始就加载全部。

---

## 子项目入口

| 项目 | 入口文档 | 部署路径 | 用途 |
|------|---------|---------|------|
| 后端 | [server/CLAUDE.md](server/CLAUDE.md) | `server/src/` | Express 5 API，SQLite，15 个路由模块，14 张表 |
| 管理后台 | [admin/CLAUDE.md](admin/CLAUDE.md) | `admin/src/` | React 19 + Tailwind 4，14 个页面 |
| 小程序 | [miniprogram/CLAUDE.md](miniprogram/CLAUDE.md) | `miniprogram/` | 微信原生，4 tab，26 个页面 |
| H5 移动端 | [h5/CLAUDE.md](h5/CLAUDE.md) | `h5/src/` | React 19 + Tailwind 4，7 个路由 |
| 摇一摇抽奖 | [lottery_replica/CLAUDE.md](lottery_replica/CLAUDE.md) | `lottery_replica/lottery_clean/` | 静态 H5，托管于 `/lottery/` |

## 环境配置

- **唯一入口**：根目录 `env.config.json`，`active` 字段切换环境（test/prod）
- **小程序**：`constants.js` → `env.js`（`require()` 不能引用 miniprogram 外的文件）
- **Admin/H5**：相对路径 `/api/v1`，不依赖环境配置
- **部署**：`./deploy.sh` = test，`./deploy.sh prod` = prod

## 用户体系（两维度）

| 维度 | 字段 | 取值 |
|------|------|------|
| 角色 | `role` | `admin` / `designer`(员工) / `owner`(业主) / `guest`(游客) |
| 人员类型 | `personnel_type` | `designer` / `design_director` / `engineer` / `engineering_director` |

- `app.isDesigner()` = `role === 'designer'` → **所有员工**
- `app.isDesignerPersonnel()` = `personnel_type === 'designer'` → 仅设计师岗位
- 登录路由：`owner` 最先判断

## 施工流程（V1.3）

```
派单 → 设计师提交整屋设计 → 设计总监审 → 管理员审 → 业主审
→ 派工(工程师+工程总监) → 5阶段施工 → 每阶段业主验收 → 竣工
```

5 阶段：打拆 → 水电 → 油工 → 主材安装 → 竣工

## 关键业务规则

- **订单号**：10 位 = YYYYMMDD(6) + property_code(2) + daily_sequence(2)
- **手机号脱敏**：中间 4 位 `****`
- **价格快照**：下单时存储于 `material_order_items.price_snapshot`
- **图片库命名**：`设计师-作品名字-日期.扩展名`
- **缩略图**：`cover_thumb`（400px 宽），优先回退原图
- **两套分类**：`categories`（作品分类）≠ `material_categories`（材料分类）

## 新增功能 — 文件修改检查清单

### 需新建
- [ ] 后端：`server/src/routes/<name>.js` + `server/src/services/<name>Service.js`
- [ ] 后端：`server/src/db/migrations/<NNN>_<description>.js`（如需新表）
- [ ] 管理后台：`admin/src/pages/<PageName>.jsx`
- [ ] 小程序：`miniprogram/pages/<page-name>/` 四个文件

### 需修改
- [ ] `server/src/app.js` — 注册新路由
- [ ] `admin/src/router/index.jsx` — 添加路由
- [ ] `admin/src/components/Sidebar.jsx` — MENU_ITEMS
- [ ] `admin/src/components/HeaderBar.jsx` — BREADCRUMB_MAP
- [ ] `miniprogram/app.json` — 注册新页面
- [ ] 对应子项目的 `CLAUDE.md` — 更新文件清单

## 部署后访问地址

| 环境 | 管理后台 | H5 | 抽奖 |
|------|---------|-----|------|
| 测试 | `test.wzzhfservice.cloud/admin/` | `test.wzzhfservice.cloud/` | `test.wzzhfservice.cloud/lottery/` |
| 生产 | `wzzhfservice.cloud/admin/` | `wzzhfservice.cloud/` | `wzzhfservice.cloud/lottery/` |

## 生产服务器

- IP：`43.136.71.64`
- 服务管理：`pm2 restart zhfpro-server`
- 部署脚本：`./deploy.sh [test|prod]`
