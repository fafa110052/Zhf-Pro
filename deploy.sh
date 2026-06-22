#!/bin/bash
# 一键部署到服务器 43.136.71.64（广州）
# 用法：本地改完代码 → git commit & push → ./deploy.sh

SERVER="root@43.136.71.64"
PROJECT="/root/Zhf-Pro"

echo "🚀 开始部署..."

ssh $SERVER << 'REMOTE'
cd /root/Zhf-Pro

echo "📦 拉取最新代码..."
git pull origin main

echo "🔨 重新构建 H5..."
cd /root/Zhf-Pro/h5 && npm run build 2>&1 | tail -2

echo "🔨 重新构建管理后台..."
cd /root/Zhf-Pro/admin && npm run build 2>&1 | tail -2

echo "🔄 重载 Nginx..."
systemctl reload nginx

echo "✅ 部署完成！"

REMOTE

echo ""
echo "📱 H5:      http://43.136.71.64:8080"
echo "🖥️  后台:    http://43.136.71.64:8080/admin"
