# 摇一摇抽奖 H5 速查 (lottery_replica)

## 概述

摇一摇抽奖 H5，部署于 `/lottery/` 路径下，由 Express 静态托管。

- **生产地址**：`https://wzzhfservice.cloud/lottery/index.html`
- **部署目录**（服务器）：`/root/Zhf-Pro/lottery_replica/lottery_clean/`
- **本地目录**：`lottery_replica/lottery_clean/`
- **竞品参考**：[competitor_reference/](competitor_reference/) — 2026-07-09 从 hd.jizhi072.top.har 解析提取

## 文件结构

```
lottery_replica/
├── lottery_clean/          # ★ 当前生产版本
    ├── index.html          # 主页面（3700+ 行，所有逻辑在一个文件）
    ├── my-prizes.html      # 我的奖品页
    ├── rules.html          # 规则页
    ├── css/
    │   ├── xz.css          # 核心样式：cover遮罩/poput弹窗/btn_rules/weapp_card
    │   ├── word.css        # 动画样式：广告弹出/集卡/摇一摇动画/content层GPU加速
    │   ├── style_gk.css    # 页面布局：#page/body/分享图/alert_cover/weapp
    │   └── swiper.min.css  # Swiper 轮播库
    ├── js/
    │   ├── jquery-1.11.1.min.js
    │   └── swiper.jquery.min.js
    └── images/             # 所有图片素材
```

## 服务端托管（server/src/app.js 42-55行）

```js
app.use('/lottery', express.static(lotteryH5Dir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
```

## CSS 职责划分

| CSS 文件 | 关键选择器 | 用途 |
|----------|-----------|------|
| **xz.css** | `.cover` (z-index:8000), `.poput` (display:none), `.poput_rules` (z-index:10000), `.btn_rules`, `.bma_box`, `.advs` | 弹窗系统 + 导航/电话按钮 + 信息卡布局 |
| **word.css** | `.content` (transform:translateZ(0) — GPU层), `.tanchu_adv` (开屏广告), `.poput` (overflow:auto), 动画关键帧 | 广告弹出动画 + GPU加速 + 内容区 |
| **style_gk.css** | `#page` (position:absolute), `body`, `.share_gif_img` (z-index:9999), `.alert_cover`, weapp 相关 | 页面框架 + 分享图 + 警告弹窗 |

## 关键 DOM 结构（index.html）

```
<body>
  <div class="bg_page">           ← position:fixed 全屏背景，无 z-index
  <div id="page">                 ← position:absolute，可滚动内容
    <div class="content">         ← 原 transform:translateZ(0)（已改为 none!important）
      ... 所有页面内容 ...
      <div id="right_top_bt">     ← 我的奖品按钮（position:absolute, z-index:1000）
      <div class="btn_rules">     ← 规则详情按钮（position:absolute）
    </div>                        ← .content 结束
  </div>                          ← #page 结束
  <div class="cover">             ← 弹窗暗色遮罩（display:none, z-index:8000）
  <div class="poput_rules poput"> ← 规则弹窗内容（display:none, z-index:10000）
  <div class="weapp_card">        ← 底部跳转小程序卡片（position:fixed, z-index:9999）
</body>
```

## 弹窗系统

弹窗由三个元素组成：
1. **`.cover`** — 全屏暗色遮罩，点击关闭所有弹窗
2. **`.poput_rules`** — 规则详情弹窗内容
3. **`poput(selector)` 函数** — 显示遮罩+隐藏 tanchui+显示目标弹窗

```js
function poput(str) {
    $('.cover').show();
    $('.tanchui').hide();
    $(str).show();
}
// 关闭：点击 .cover 触发 $('.cover').hide(); $('.poput').hide();
```

## 主要 JS 函数索引

| 行号 | 函数 | 用途 |
|------|------|------|
| ~956 | `jizhi_card()` / `close_jizhi()` | 集卡弹窗 |
| ~964 | `contact_page()` | 联系我们弹窗 |
| ~2184 | `alertshow(str, e)` | 通用警告弹窗 |
| ~2208 | `get_user_swiper()` | 用户轮播 |
| ~2305 | `mySwipers()` | 初始化 Swiper |
| ~2372 | `the_countdown()` | 广告倒计时 |
| ~2395 | `$(".skip").click(...)` | 跳过广告 |
| ~2455 | `$(".vip_btn_y").click(...)` | VIP 留资提交（调后端 API） |
| ~2752 | `poput(str)` | ★ 弹窗核心函数 |
| ~2757 | `poputad(strs)` | 广告弹窗 |
| ~2764 | `closeAll()` | 关闭所有弹窗 |
| ~3141 | `poput(str)` | （第二次定义，相同） |

## 已知问题与修复

| 问题 | 原因 | 修复 |
|------|------|------|
| 规则详情按钮无法点击 | `word.css` 的 `.content { transform: translateZ(0) }` 创建 GPU 合成层，在硬件合成层中渲染到 `.bg_page` 后面 | `.content { transform: none !important }` |
| 弹窗不弹出 | 待排查（可能 jQuery 冲突或 CSS 覆盖） | 改用原生 JS `document.querySelector().style.display='block'` |
| weapp_card 被页面遮挡 | 原 z-index:100 太低 | 改为 z-index:9999 + 移到 `</body>` 前最后渲染 |
| 导航/电话分两行 | `float:left` 受多 CSS 文件级联影响 | 改为 flexbox `display:flex; flex-direction:row` |

## 部署

```bash
scp lottery_replica/lottery_clean/index.html root@43.136.71.64:/root/Zhf-Pro/lottery_replica/lottery_clean/
# 无需重启服务（静态文件）
```

## 微信环境依赖

- `<wx-open-launch-weapp>` — 跳转小程序（需微信 WebView）
- `jweixin-1.6.0.js` — JS-SDK 分享
- 页面加载时检测 `isWechat()`，非微信环境显示引导提示
