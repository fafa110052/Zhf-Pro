# 🏠 住好房装修展示平台

> 一个面向装修设计师的作品展示与管理平台，包含后端 API、管理后台（Web）和微信小程序三端。

**技术栈**：Express.js 5 + SQLite + React 19 + TailwindCSS 4 + 微信小程序原生框架

---

## 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [核心功能](#核心功能)
- [数据库设计](#数据库设计)
- [部署](#部署)
- [文档索引](#文档索引)

---

## 项目简介

住好房装修展示平台是一个完整的三端系统：

| 端 | 用户 | 核心功能 |
|---|------|---------|
| **后端 API** | 全端 | RESTful 接口、JWT 认证、文件上传、SQLite 存储 |
| **管理后台** | 运营管理员 | 仪表盘、作品审核、头像审核、用户管理、图片库、系统配置 |
| **微信小程序** | 访客 + 设计师 | 作品浏览/筛选、设计师登录、作品上传管理 |

### 业务流程

```
设计师上传作品 → 提交审核 → 管理员审核(通过/驳回) → 访客浏览
                                    ↓
                              驳回后可修改重新提交
```

---

## 技术栈

### 后端（server/）
| 技术 | 版本 | 用途 |
|------|:----:|------|
| Express.js | 5.x | Web 框架 |
| better-sqlite3 | 12.x | SQLite 数据库驱动 |
| Knex.js | 3.x | 数据库迁移/查询构建器 |
| jsonwebtoken | 9.x | JWT 认证 |
| multer | 2.x | 文件上传 |
| sharp | 0.34.x | 图片缩略图生成 |
| bcryptjs | 3.x | 密码哈希 |

### 管理后台（admin/）
| 技术 | 版本 | 用途 |
|------|:----:|------|
| React | 19.x | UI 框架 |
| Vite | 8.x | 构建工具 |
| TailwindCSS | 4.x | 样式框架 |
| React Router | 7.x | 客户端路由 |
| Chart.js | 4.x | 仪表盘图表 |
| Axios | 1.x | HTTP 请求 |

### 微信小程序（miniprogram/）
| 技术 | 用途 |
|------|------|
| 微信原生框架 | 小程序页面/组件 |
| wx.request | HTTP 通信 |
| 微信开发者工具 | 开发调试 |

---

## 快速开始

### 环境要求

- **Node.js** ≥ 20 LTS（推荐 v24+，原生支持 `fetch`）
- **npm** ≥ 10
- **微信开发者工具**（小程序开发）
- **PM2**（生产部署，可选）

### 开发模式启动

```bash
# 进入项目根目录
cd 住好房

# 一键启动（后端 + 管理后台热重载）
bash start.sh

# 或指定模式
bash start.sh dev    # 开发模式（默认）
bash start.sh prod   # 生产模式
```

启动后：
- **管理后台**：http://localhost:5173
- **后端 API**：http://localhost:3000
- **健康检查**：http://localhost:3000/api/health

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

### 数据库初始化

```bash
cd server

# 运行迁移（建表）
npm run migrate

# 填充种子数据（分类字典 + 管理员）
npm run seed

# 重置数据库
npm run db:reset
```

### 环境配置

```bash
# 复制环境变量模板
cp server/.env.example server/.env

# 编辑配置（微信 AppID 等）
vim server/.env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务器端口 | `3000` |
| `JWT_SECRET` | JWT 签名密钥 | 开发用默认值 |
| `WECHAT_APPID` | 微信小程序 AppID | 生产必填 |
| `WECHAT_SECRET` | 微信小程序 Secret | 生产必填 |
| `WECHAT_DEV_MODE` | 开发模式（跳过微信校验） | `true` |

---

## 项目结构

```
ZHFPro/
├── README.md                   # 本文件
├── start.sh                    # 一键启动脚本
├── stop.sh                     # 停止脚本
├── 开发计划.md                  # 35天开发计划
│
├── server/                     # 后端服务
│   ├── src/
│   │   ├── index.js            # 入口文件
│   │   ├── app.js              # Express 应用配置
│   │   ├── config/index.js     # 配置管理
│   │   ├── db/
│   │   │   ├── connection.js   # SQLite 连接
│   │   │   ├── migrations/     # 数据库迁移
│   │   │   └── seeds/          # 种子数据
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT + RBAC
│   │   │   ├── upload.js       # multer 配置
│   │   │   └── validate.js     # 输入校验
│   │   ├── routes/             # 路由（12 个模块）
│   │   │   ├── accounts.js     # 账号管理
│   │   │   ├── auth.js         # 认证
│   │   │   ├── cases.js        # 作品
│   │   │   ├── categories.js   # 分类
│   │   │   ├── dashboard.js    # 仪表盘
│   │   │   ├── designers.js    # 设计师管理
│   │   │   ├── images.js       # 图片库
│   │   │   ├── reviews.js      # 审核（保留）
│   │   │   ├── settings.js     # 系统设置
│   │   │   └── upload.js       # 文件上传
│   │   └── services/           # 业务逻辑（10 个模块）
│   ├── data/                   # SQLite 数据库文件
│   ├── uploads/                # 上传图片（originals + thumbnails）
│   ├── backups/                # 数据库备份
│   ├── logs/                   # PM2 日志
│   ├── ecosystem.config.js     # PM2 配置
│   ├── scripts/backup.sh       # 数据库备份脚本
│   └── .env.example            # 环境变量模板
│
├── admin/                      # 管理后台 SPA
│   ├── src/
│   │   ├── main.jsx            # 入口
│   │   ├── App.jsx             # 根组件
│   │   ├── router/index.jsx    # 路由配置
│   │   ├── api/client.js       # Axios 封装
│   │   ├── contexts/AuthContext.jsx  # 认证上下文
│   │   ├── components/         # 通用组件（8 个）
│   │   └── pages/              # 页面（8 个）
│   └── dist/                   # 生产构建输出
│
├── miniprogram/                # 微信小程序
│   ├── app.js                  # 全局逻辑
│   ├── app.json                # 全局配置
│   ├── app.wxss                # 全局样式
│   ├── components/             # 自定义组件（4 个）
│   ├── pages/                  # 页面（9 个）
│   │   ├── index/              # 首页
│   │   ├── category/           # 分类筛选
│   │   ├── work-detail/        # 作品详情
│   │   ├── designer-login/     # 设计师登录
│   │   ├── designer-center/    # 设计师中心
│   │   ├── work-manage/        # 作品管理
│   │   ├── work-upload/        # 作品上传
│   │   ├── agreement/          # 用户协议
│   │   └── privacy/            # 隐私政策
│   └── utils/                  # 工具函数（5 个）
│
└── prd/                        # 产品需求文档
    └── v1.0/
        ├── zhuhaofang-decoration-prd.md
        └── zhuhaofang-decoration-prd.docx
```

---

## 核心功能

### 后端 API（44+ 接口）

- **认证系统**：管理员密码登录、设计师微信手机号登录、JWT + RBAC 权限控制
- **作品管理**：公开列表多维筛选、设计师 CRUD、审核流转（draft→pending→approved/rejected/offline→archived）
- **分类字典**：户型/部位/风格动态维护
- **图片库**：全局图片管理、批量删除、引用计数
- **仪表盘**：概览卡片、趋势图表、分类分布
- **文件上传**：单图/多图上传、自动缩略图（sharp）
- **头像审核**：设计师换头像 → 待审核 → 管理员通过/驳回，防止违规头像
- **封面图设置**：设计师/管理员可从作品图片中任选一张设为封面，列表自动回退首图
- **系统配置**：首页轮播图、热门推荐位

### 管理后台（9 个页面）

- **仪表盘**：数据概览 + 趋势图 + 饼状图
- **用户管理**：设计师列表 CRUD + 状态切换
- **作品管理**：全状态列表 + 筛选 + 审核 + 批量操作 + 下架/上架/删除 + 归档 + 封面图设置
- **分类管理**：三级分类维护
- **图片库**：网格/列表双视图 + 复制链接 + 批量删除
- **头像审核**：设计师头像变更 → 管理员审核通过/驳回
- **账号管理**：角色变更（游客↔设计师）
- **系统设置**：首页轮播图 + 热门推荐配置
- **登录页** + 路由守卫

### 微信小程序（9 个页面）

- **首页**：轮播图 + 热门推荐瀑布流
- **分类筛选**：三维交叉筛选 + 上拉加载
- **作品详情**：全屏轮播 + 设计师名片 + 浏览量埋点
- **设计师登录**：微信手机号快捷登录 + 用户协议
- **设计师中心**：个人统计 + 资料编辑 + 下拉刷新
- **作品管理**：状态标签 + 编辑/删除
- **作品上传**：表单 + 图片选择/压缩 + 封面图选择
- **用户协议** / **隐私政策**：完整法律内容

### V1.1 — 在线选材
- **在线选材**：楼盘→材料分类→选择→提交申请
- **我的申请**：订单列表 + 详情 + 审核状态跟踪
- **业主验收**：待验收操作 + 异议驳回 + 图片上传

### V1.3 — 施工全流程管理
- **5 阶段施工**：打拆 → 水电 → 油工 → 主材安装 → 竣工
- **4 角色协作**：设计师(出图) → 设计总监(一审) → 管理员(二审) → 工程师(施工) → 工程总监(一审) → 管理员(二审) → 业主(验收)
- **总监双审制**：设计总监一审设计图，工程总监一审完工图，管理员二审
- **驳回留痕**：总监/管理员/业主驳回均记录操作日志
- **小程序订阅消息**：关键节点推送通知
- **8 个子端页面**：设计师/设计总监/工程师/工程总监各 2 页

---

## 数据库设计

```
┌─────────────┐
│  designers   │  统一用户表（管理员 + 设计师）
├─────────────┤
│ id          │  主键
│ username    │  管理员登录名
│ password_hash│  bcrypt 哈希
│ openid      │  微信 openid
│ phone       │  手机号（唯一）
│ name        │  姓名
│ role        │  admin | designer
│ status      │  active | inactive
└──────┬──────┘
       │ 1
       ├──────────────┐
       │              │
       ▼ N            ▼ N
┌─────────────┐  ┌──────────────┐
│    cases     │  │image_library │
├─────────────┤  ├──────────────┤
│ id          │  │ id           │
│ title       │  │ image_url    │
│ house_type──┼──┤ thumb_url    │
│ area_cat────┼──┤ uploaded_by  │
│ style_cat───┼──┤ ref_count    │
│ designer_id │  └──────┬───────┘
│ review_status│        │
│ view_count  │        │ N
│ is_hot      │  ┌─────┴───────┐
└──────┬──────┘  │ case_images │
       │ 1       ├─────────────┤
       └─────────┤ case_id     │
                 │ library_img─┤
                 │ image_url   │
                 └─────────────┘

┌──────────────┐  ┌────────────────┐
│  categories  │  │homepage_config │
├──────────────┤  ├────────────────┤
│ id           │  │ config_type    │
│ type         │  │ config_value   │
│ name         │  │ sort_order     │
│ is_active    │  └────────────────┘
└──────────────┘
```

### 状态流转

```
draft ──提交审核──▶ pending ──审核──▶ approved ──下架──▶ offline ──删除──▶ ✕
  ▲                   │               │    ▲                      │
  │                   └──驳回──▶ rejected  │  └──────上架──────────┘
  │                               │       │
  └───────重新编辑─────────────────┘       │
                              归档        │
                               ↓          │
                           archived ──────┘
```

---

## 部署

### 生产模式

```bash
# 构建 + PM2 启动
bash start.sh prod

# PM2 管理
pm2 status                # 查看状态
pm2 logs zhuhaofang-server # 查看日志
pm2 restart zhuhaofang-server # 重启

# 停止
bash stop.sh
```

### 定时备份

```bash
# 添加 crontab（每天凌晨3点）
crontab -e
# 添加：
0 3 * * * /path/to/ZHFPro/server/scripts/backup.sh

# 手动备份
bash server/scripts/backup.sh
```

备份策略：保留最近 7 天的每日备份 + 最近 4 周的每周备份

### 架构图

```
浏览器（管理后台）        微信小程序
       │                      │
       ▼                      ▼
┌──────────────────────────────────┐
│  Express Server (:3000)          │
│                                  │
│  /api/*      → API 路由          │
│  /uploads/*  → 静态文件          │
│  /*          → admin/dist SPA    │
│                                  │
│  PM2 守护（自动重启/日志/限存）   │
└──────────────┬───────────────────┘
               │
               ▼
       ┌──────────────┐
       │   SQLite     │
       │ (daily BKP)  │
       └──────────────┘
```

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [README.md](README.md) | 本文件 — 项目总览 |
| [API_DOCS.md](API_DOCS.md) | 接口文档 — 全部 API 端点 |
| [ROADMAP.md](ROADMAP.md) | 后续开发计划 |
| [开发计划.md](开发计划.md) | 35 天开发计划（历史记录） |
| [.env.example](server/.env.example) | 环境变量说明 |
