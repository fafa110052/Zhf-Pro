const express = require('express');
const router = express.Router();

// ═══════════════════════════════════════════
// 作品审核路由
// 注意：审核功能（approve/reject/batch/hot/archive）
// 已实现在 cases.js 管理端接口中，路径为：
//   POST /api/v1/admin/works/:id/approve
//   POST /api/v1/admin/works/:id/reject
//   POST /api/v1/admin/works/batch
//   PATCH /api/v1/admin/works/:id/hot
//   POST /api/v1/admin/works/:id/archive
//
// 本文件保留以兼容未来可能独立的审核子模块。
// ═══════════════════════════════════════════

module.exports = router;
