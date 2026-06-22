#!/bin/bash
# 一键部署到服务器 43.136.71.64（广州）
# 用法：
#   ./deploy.sh          → 部署到 env.config.json 中 active 指定的环境
#   ./deploy.sh test     → 部署到测试环境（8081）
#   ./deploy.sh prod     → 部署到生产环境（8080）
#
# 所有服务器信息、端口号均从 env.config.json 读取（唯一配置入口）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/env.config.json"

# ═══ 从 env.config.json 读取配置 ═══
SERVER=$(node -e "console.log(require('$CONFIG').server.ssh)")
TARGET="${1:-$(node -e "console.log(require('$CONFIG').active)")}"

PORT=$(node -e "console.log(require('$CONFIG').environments['$TARGET'].port)")
BACKEND_PORT=$(node -e "console.log(require('$CONFIG').environments['$TARGET'].backend_port)")
PM2_NAME=$(node -e "console.log(require('$CONFIG').environments['$TARGET'].pm2_name)")
PROJECT=$(node -e "console.log(require('$CONFIG').environments['$TARGET'].project_path)")

echo "🚀 部署到 【${TARGET}环境】 ${PORT}"

ssh $SERVER << REMOTE
cd $PROJECT

echo "📦 拉取最新代码..."
git pull origin main

echo "🔨 构建 H5..."
cd $PROJECT/h5 && npm run build 2>&1 | tail -2

echo "🔨 构建管理后台..."
cd $PROJECT/admin && npm run build 2>&1 | tail -2

echo "🔄 重启后端..."
pm2 restart $PM2_NAME

echo "🔄 重载 Nginx..."
systemctl reload nginx

echo "✅ 部署完成！"
REMOTE

SERVER_IP=$(node -e "console.log(require('$CONFIG').server.ip)")

echo ""
if [ "$TARGET" = "prod" ]; then
  echo "📱 H5:      http://${SERVER_IP}:${PORT}"
  echo "🖥️  后台:    http://${SERVER_IP}:${PORT}/admin"
else
  echo "📱 H5(测试): http://${SERVER_IP}:${PORT}"
  echo "🖥️  后台(测): http://${SERVER_IP}:${PORT}/admin"
fi
