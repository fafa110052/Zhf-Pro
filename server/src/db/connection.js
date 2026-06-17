/**
 * 数据库连接实例（Knex + better-sqlite3）
 *
 * 架构说明：
 * - 使用 Knex.js 作为查询构建器，提供链式 API 和迁移/种子管理
 * - better-sqlite3 驱动 —— 同步执行、零配置、单文件数据库
 * - 数据库文件位于 server/data/database.sqlite（Git 忽略）
 * - useNullAsDefault: true —— SQLite 不支持 DEFAULT 值，避免插入警告
 *
 * 单例模式 —— 整个应用共享同一连接
 * 引入方式：const db = require('../db/connection');
 */

const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: path.join(__dirname, '..', '..', 'data', 'database.sqlite'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
  },
});

module.exports = db;
