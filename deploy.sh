#!/bin/bash
# 一键部署到服务器 43.136.71.64（广州）
# 用法：
#   ./deploy.sh          → 部署到测试环境（8081）
#   ./deploy.sh prod     → 部署到生产环境（8080）

SERVER="root@43.136.71.64"

if [ "$1" = "prod" ]; then
  PROJECT="/root/Zhf-Pro"
  PORT="8080"
  PM2_NAME="zhf-server"
  BACKEND_PORT="3000"
  echo "🚀 部署到 【生产环境】 ${PORT}"
else
  PROJECT="/root/Zhf-Pro-test"
  PORT="8081"
  PM2_NAME="zhf-server-test"
  BACKEND_PORT="3001"
  echo "🚀 部署到 【测试环境】 ${PORT}"
fi

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

echo ""
if [ "$1" = "prod" ]; then
  echo "📱 H5:      http://43.136.71.64:8080"
  echo "🖥️  后台:    http://43.136.71.64:8080/admin"
else
  echo "📱 H5(测试): http://43.136.71.64:8081"
  echo "🖥️  后台(测): http://43.136.71.64:8081/admin"
fi
