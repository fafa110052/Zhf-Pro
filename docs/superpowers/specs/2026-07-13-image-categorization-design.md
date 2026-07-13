# 图片分类存储 + 图片库页面 设计文档

日期：2026-07-13
状态：待实现

## 1. 背景与问题

管理后台所有图片（作品、头像、楼盘、材料、施工图、运营 Banner）目前全部由同一个通用上传接口
`POST /api/v1/upload` 处理，盲目写入 `server/uploads/originals/` 一个平铺目录，文件名为
`{设计师名}-{YYYYMMDD}-{8位随机hex}.webp`，磁盘上完全看不出图片属于哪个业务。缩略图统一放
`server/uploads/thumbnails/`。

痛点：
- 运维/业主直接查看服务器时无法区分图片来源。
- 文件命名不含分类信息，难以排查和管理。
- 缺少一个能按分类浏览/管理图片的后台页面。

## 2. 目标

1. **磁盘按业务类型分文件夹存储**，原图和缩略图放在同一分类文件夹内。
2. **文件命名带分类前缀**，一眼可辨归属。
3. **迁移现有存量图片**到新结构，并同步改写数据库路径。
4. **管理后台新增「图片库」页面**，可按分类浏览、搜索、查看详情、单张/批量删除，整体带高级感。

不做（YAGNI）：图片编辑、跨分类移动、标签系统、CDN、去重。

## 2.1 分期实施（硬性约束：小程序已上线，绝不影响当前使用）

**Phase 1（本次实施，零风险，不触碰任何线上数据/文件路径）：**
- 目标 1、2 的「新上传」部分：新传的图按分类进新文件夹、命名带前缀。
- 目标 4：图片库页面。
- 上传接口加 `category` 参数、`image_library` 加 `category` 列。
- 不移动任何已有文件，不改写任何已有数据库路径 → 现有小程序/H5/后台显示完全不受影响。
- 老图（20 张）暂留 `originals/`，在图片库中归入「未分类」Tab 显示（其 `image_library.category`
  保持默认 `misc`，不做任何写操作影响其现有引用）。

**Phase 2（择期单独实施，需人工确认后才做）：**
- 目标 3：存量迁移脚本。严格走「备份 → 本地/测试验证 → 生产低谷时段执行」。
- 本设计文档保留其方案（第 6 节），但**不在本次实现计划内**。

## 3. 分类维度（6 大类 + 兜底）

| 分类 key | 中文 | 涵盖业务 | 角标颜色 |
|---------|------|---------|---------|
| `works` | 作品 | `cases.cover_image`、`case_images` | 靛蓝 indigo |
| `avatars` | 头像 | `designers.avatar_url`、`design_team.avatar_url` | 天蓝 sky |
| `properties` | 楼盘 | `properties.cover_image` | 翠绿 emerald |
| `materials` | 材料 | `materials.image_url` | 琥珀 amber |
| `construction` | 施工图 | `construction_phases.design_images`、`construction_images` | 紫 violet |
| `banners` | 运营 | `homepage_config` 中的 banner/hot_works 图 | 玫瑰 rose |
| `misc` | 其他 | 未带分类或非白名单的兜底 | 灰 slate |

6 类角标颜色互不相同；`misc` 仅作兜底，不在正常 Tab 中主动使用。

## 4. 磁盘目录与命名

```
server/uploads/
├── works/          作品：原图 works-{ctx}-{date}-{hex}.webp + 缩略图 thumb_同名.jpg
├── avatars/        头像
├── properties/     楼盘
├── materials/      材料
├── construction/   施工图
├── banners/        运营
├── misc/           兜底
└── lottery/        （不变，抽奖静态资源）
```

- 原图与缩略图放在**同一分类文件夹**，缩略图沿用 `thumb_` 前缀。
- 文件命名：`{category}-{ctx}-{YYYYMMDD}-{8位hex}.{ext}`，例：`works-张三-20260713-a1b2c3d4.webp`。
  `ctx` 沿用现有的上传者/设计师名 sanitize 逻辑；无则省略该段。
- `image_url` / `thumb_url` 存相对路径：`/uploads/works/xxx.webp`、`/uploads/works/thumb_xxx.jpg`。

## 5. 核心机制：上传时携带分类

单一上传接口无法自己判断分类，改为**由调用方显式传入 `category`**。

### 5.1 后端

- `POST /api/v1/upload` 与 `/api/v1/upload/multiple` 接收 `category` 参数（form 字段或 query）。
- 白名单校验：不在 6 类内一律归 `misc`。
- `multer` 存储目标目录改为 `uploads/{category}/`（启动时确保 7 个目录存在）。
- 文件名生成加入 `category` 前缀。
- `uploadService`：缩略图写入同一 `uploads/{category}/`；`image_library` 记录新增 `category` 字段。

### 5.2 数据库

- `image_library` 表新增列 `category TEXT DEFAULT 'misc'`（迁移脚本 `ALTER TABLE`）。
- 其余业务表（cases/designers/materials/properties/construction_phases/homepage_config）
  只存路径字符串，路径本身已含分类，无需加列。

### 5.3 前端调用点（每处加一行 category）

需要在所有上传调用点显式传分类，覆盖：
- 管理后台上传组件（作品/楼盘/材料/头像/设计团队/Banner）。
- 小程序：作品上传、头像上传、施工设计图/完工图上传。
- H5：设计师作品上传。

实现计划阶段会逐一枚举 grep 出的真实调用点，确保无遗漏。

## 6. 存量迁移脚本（一次性）—— Phase 2，不在本次实现内

> 本节为 Phase 2 方案留档，**本次（Phase 1）不执行**。择期人工确认后单独实施。

`server/scripts/migrate-image-categories.js`：

1. 先备份 `server/uploads/` 与数据库文件。
2. 遍历各业务表字段，建立「相对路径 → 分类」映射（含 JSON 数组字段展开）。
3. 对每条 `image_library` 记录及被引用文件：
   - 判定分类（查不到引用则 `misc`）。
   - 移动原图与缩略图到 `uploads/{category}/`（缩略图从旧 `thumbnails/` 迁入）。
   - 改写数据库中所有引用该路径的字段（全表覆盖，JSON 字段按数组元素替换）。
   - 更新 `image_library.image_url`、`thumb_url`、`category`。
4. 幂等：重复执行不重复移动/改写；打印每张图的处理结果与最终统计。
5. 迁移后旧的空 `originals/`、`thumbnails/` 目录保留（不删，降低风险）。

## 7. 图片库页面

路径 `admin/src/pages/ImageLibrary.jsx`，以 `Works.jsx` 为 UI 基准（`p-4 lg:p-6 space-y-4`、
`rounded-xl` 卡片、`bg-slate-900` 主按钮、`bg-gray-50/50` 表头风格）。

### 7.1 后端接口

- `GET /api/v1/images?category=&keyword=&sort=&page=&pageSize=`：分页返回 `image_library` 列表，
  支持按分类、原名/上传人搜索、时间排序；返回各分类计数。
- `DELETE /api/v1/images/:id`：删除单张（删文件 + 缩略图 + 记录）。
- `POST /api/v1/images/batch-delete`：批量删除（body 传 id 数组）。
- 删除前检测是否仍被业务引用，返回引用信息供前端二次确认。

### 7.2 页面结构与交互

```
标题卡片：图片库 · 共 N 张
分类 Tab：[全部][作品 n][头像 n][楼盘 n][材料 n][施工图 n][运营 n][未分类 n]（选中态 bg-slate-900）
筛选栏：搜索原名/上传人 · 排序(最新/最早/最大) · [批量删除] (选中≥1 时出现)
网格：响应式 2/4/6 列缩略图卡片
  - 左上彩色分类角标（6 色区分）
  - 卡片右上多选勾选框（hover 或进入多选态显示）
  - 图下两行：原名 + 日期/大小
点击卡片 → Modal 大图 + 完整信息（原名/路径/上传人/尺寸/大小/被哪些业务引用）+ 红色删除
批量删除 → ConfirmDialog，列出选中数量与被引用警告
空状态 → EmptyState(description=...)
懒加载 loading="lazy" + 分页/加载更多
```

### 7.3 高级感处理（只做样式，不加功能）

- 卡片：细边框 `border-gray-100` + 极轻阴影，hover 时轻微上浮（`transition` + `translate-y`）与
  阴影加深；缩略图统一正方形裁切（`object-cover`）避免参差。
- 角标：小圆角胶囊、半透明底色 + 深色文字（每类专属色），克制不刺眼。
- 多选态：选中卡片加彩色描边 + 勾选高亮；顶部出现选中计数条。
- 留白与网格间距充足，整体冷静精致，与后台霜玻璃冷色系一致。

### 7.4 导航接入（新增页面检查清单）

1. `admin/src/router/index.jsx` 加路由 `/images`。
2. `admin/src/components/Sidebar.jsx` MENU_ITEMS 加「图片库」。
3. `admin/src/components/HeaderBar.jsx` BREADCRUMB_MAP 加映射。
4. 组件契约遵守：`Modal` 传 `open`；`EmptyState` 用 `description`；`ConfirmDialog` 全参数；`useToast()`。

## 8. 验证标准（每个功能都要走通）

- **上传分类**：从后台分别上传作品/头像/楼盘/材料图，确认文件落到对应文件夹、文件名带前缀、
  `image_library.category` 正确、前端展示不裂图。
- **小程序/H5 上传**：设计师上传作品、施工图上传，确认分类正确、图片正常显示。
- **迁移脚本**（Phase 2，本次不做）：备份后执行，20 张全部归类正确、数据库路径同步改写、各端图片仍正常显示（无裂图）。
- **图片库页面**：分类 Tab 计数正确、搜索/排序生效、详情 Modal 信息完整、单张删除生效、
  批量删除生效、被引用图删除有警告、空状态正常、懒加载生效。
- **回归**：现有作品/楼盘/材料/施工详情页图片显示正常。

## 9. 影响面与风险

- 迁移脚本改写数据库路径，风险最高：务必先备份，脚本幂等且打印明细，出错可回滚。
- 前端调用点若遗漏未传 category，则该处新图落入 `misc`，不影响显示，可后续补。
- 旧 `originals/`/`thumbnails/` 保留，不影响历史链接。
