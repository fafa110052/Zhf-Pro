const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// 中间件
const dedup = require('./middleware/dedup');

// 路由模块（后续每天逐一完善）
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const casesRoutes = require('./routes/cases');
const designersRoutes = require('./routes/designers');
const reviewsRoutes = require('./routes/reviews');
const imagesRoutes = require('./routes/images');
const dashboardRoutes = require('./routes/dashboard');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings');
const accountsRoutes = require('./routes/accounts');
const propertiesRoutes = require('./routes/properties');
const materialCategoriesRoutes = require('./routes/material-categories');
const materialsRoutes = require('./routes/materials');
const materialOrdersRoutes = require('./routes/material-orders');
const constructionPhaseRoutes = require('./routes/construction-phases');
const measurementAppointmentRoutes = require('./routes/measurement-appointments');
const lotteryRoutes = require('./routes/lottery');

const app = express();

// ═══ 全局中间件 ═══
app.use(cors());                                    // 跨域
app.use(express.json({ limit: '10mb' }));           // JSON 解析
app.use(express.urlencoded({ extended: true }));     // 表单解析
app.use(morgan('dev'));                             // 请求日志
app.use(dedup);                                     // 请求去重（防重复提交）

// ═══ 静态文件服务（上传的图片）═══
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ═══ 摇一摇 H5 页面（静态托管）═══
const lotteryH5Dir = path.join(__dirname, '..', '..', 'lottery_replica', 'lottery_clean');
if (fs.existsSync(lotteryH5Dir)) {
  app.use('/lottery', express.static(lotteryH5Dir));
}

// ═══ 管理后台静态文件（生产环境）═══
// admin/dist 存在时直接托管，无需单独启动 Vite dev server
const adminDist = path.join(__dirname, '..', '..', 'admin', 'dist');
if (fs.existsSync(adminDist)) {
  app.use(express.static(adminDist));
}

// ═══ 占位图生成（picsum.photos 国内被墙，用本地 SVG 替代）═══
app.get('/api/v1/placeholder/:seed/:width/:height', (req, res) => {
  const w = Math.max(10, Math.min(1200, parseInt(req.params.width) || 600));
  const h = Math.max(10, Math.min(1200, parseInt(req.params.height) || 400));
  const seed = parseInt(req.params.seed) || 1;
  const hue = (seed * 47) % 360;
  const hue2 = (hue + 30) % 360;
  const fontSize = Math.max(10, Math.floor(Math.min(w, h) * 0.08));

  // 磁盘缓存（带 seed 所以不同颜色各自缓存）
  const cacheDir = path.join(__dirname, '..', 'cache', 'placeholder');
  const cacheFile = path.join(cacheDir, `${seed}_${w}_${h}.png`);

  if (fs.existsSync(cacheFile)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(cacheFile).pipe(res);
  }

  // 生成 PNG（ImageMagick）
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const color1 = `hsl(${hue},45%,55%)`;
  const color2 = `hsl(${hue2},40%,45%)`;

  const cmd = spawn('convert', [
    '-size', `${w}x${h}`,
    `gradient:${color1}-${color2}`,
    '-gravity', 'center',
    '-fill', 'rgba(255,255,255,0.7)',
    '-font', 'Arial',
    '-pointsize', String(fontSize),
    '-annotate', '0', `${w}×${h}`,
    `PNG:${cacheFile}`,
  ]);

  cmd.on('close', (code) => {
    if (code === 0 && fs.existsSync(cacheFile)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      fs.createReadStream(cacheFile).pipe(res);
    } else {
      console.error(`ImageMagick failed with code ${code}`);
      res.status(500).end();
    }
  });

  cmd.stderr.on('data', (d) => console.error('convert:', d.toString()));
});

// ═══ 健康检查 ═══
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══ 网络诊断（真机调试用）═══
// 手机浏览器访问此地址，能打开说明网络通
app.get('/api/network-check', (req, res) => {
  const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
  res.json({
    success: true,
    message: '如果你能看到这个页面，说明手机和服务器在同一网络，网络通路正常。',
    tip: '请确认小程序 utils/constants.js 中 BASE_URL 指向本机局域网 IP',
    client_ip: clientIP,
    server_time: new Date().toISOString(),
  });
});

// ═══ API 路由注册 ═══
app.use('/api/v1/auth', authRoutes);           // 认证（登录）
app.use('/api/v1', categoriesRoutes);          // 分类字典
app.use('/api/v1', casesRoutes);               // 作品（公开 + 设计师 + 管理员）
app.use('/api/v1', designersRoutes);           // 设计师管理
app.use('/api/v1', reviewsRoutes);             // 作品审核
app.use('/api/v1', imagesRoutes);              // 图片库管理
app.use('/api/v1', dashboardRoutes);           // 仪表盘统计
app.use('/api/v1', uploadRoutes);              // 文件上传
app.use('/api/v1', settingsRoutes);            // 系统设置
app.use('/api/v1', accountsRoutes);           // 账号管理（角色变更）
app.use('/api/v1', propertiesRoutes);        // 楼盘管理（V1.1 新增）
app.use('/api/v1', materialCategoriesRoutes);// 材料分类管理（V1.1 新增）
app.use('/api/v1', materialsRoutes);        // 材料管理（V1.1 新增）
app.use('/api/v1', materialOrdersRoutes);   // 选材申请（V1.1 新增）
app.use('/api/v1', constructionPhaseRoutes); // 施工阶段（V1.3 新增）
app.use('/api/v1', measurementAppointmentRoutes); // 量房预约
app.use('/api/v1', lotteryRoutes);              // 摇一摇抽奖

// ═══ 404 / SPA 回退（必须在所有路由之后）═══
app.use((req, res) => {
  // API 请求返回 JSON
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: { message: `接口不存在: ${req.method} ${req.originalUrl}`, status: 404 } });
  }
  // 管理后台 SPA 回退：非 API 的 GET 请求返回 index.html
  if (req.method === 'GET' && fs.existsSync(adminDist)) {
    return res.sendFile(path.join(adminDist, 'index.html'));
  }
  // 其他情况
  res.status(404).json({ error: { message: '页面不存在', status: 404 } });
});

// ═══ JSON 解析错误处理（Express 5 内置）═══
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { message: '请求体 JSON 格式不正确', status: 400 },
    });
  }
  next(err);
});

// ═══ 全局错误处理 ═══
app.use((err, req, res, next) => {
  // SQLite 错误转换
  if (err.code && err.code.startsWith('SQLITE_')) {
    const sqliteMessages = {
      SQLITE_CONSTRAINT_UNIQUE: '数据已存在，请勿重复添加',
      SQLITE_CONSTRAINT_FOREIGNKEY: '关联数据不存在，请检查引用',
      SQLITE_CONSTRAINT: '数据约束冲突，请检查输入',
      SQLITE_ERROR: '数据库操作失败',
    };
    const msg = sqliteMessages[err.code] || `数据库错误: ${err.message}`;
    const status = err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ? 400
      : err.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500;

    console.error(`❌ [${err.code}] ${req.method} ${req.originalUrl} — ${err.message}`);
    return res.status(status).json({ error: { message: msg, status } });
  }

  // 自定义业务错误
  const status = err.status || 500;
  const message = err.message || '服务器内部错误';

  // 500 错误记录完整堆栈，4xx 只记录简要信息
  if (status >= 500) {
    console.error(`❌ [${status}] ${req.method} ${req.originalUrl} —`, err.stack);
  } else {
    console.warn(`⚠️  [${status}] ${req.method} ${req.originalUrl} — ${message}`);
  }

  res.status(status).json({
    error: { message, status },
  });
});

module.exports = app;
