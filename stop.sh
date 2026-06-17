#!/bin/bash

# ═══════════════════════════════════════════════════
# 住好房 V1.1 — 停止脚本
# 停止所有开发/生产模式的进程
# ═══════════════════════════════════════════════════

echo "🛑 住好房 V1.1 · 停止所有服务..."
echo ""

STOPPED=0

# ─── 1. PM2 进程（生产模式）───
if command -v pm2 &> /dev/null; then
  if pm2 list 2>/dev/null | grep -q "zhuhaofang"; then
    pm2 stop zhuhaofang-server 2>/dev/null && echo "  ✅ PM2 · zhuhaofang-server 已停止" && STOPPED=1 || true
    pm2 stop zhuhaofang-admin  2>/dev/null && echo "  ✅ PM2 · zhuhaofang-admin 已停止"  && STOPPED=1 || true
    pm2 delete zhuhaofang-server 2>/dev/null || true
    pm2 delete zhuhaofang-admin  2>/dev/null || true
  fi
fi

# ─── 2. nodemon 进程（开发模式）───
if pgrep -f "nodemon" > /dev/null 2>&1; then
  pkill -f "nodemon" 2>/dev/null && echo "  ✅ nodemon 已停止" && STOPPED=1 || true
fi

# ─── 3. Node 服务进程 ───
if pgrep -f "node src/index" > /dev/null 2>&1; then
  pkill -f "node src/index" 2>/dev/null && echo "  ✅ Node API 服务已停止" && STOPPED=1 || true
fi

# ─── 4. Vite 开发服务器 ───
if pgrep -f "vite" > /dev/null 2>&1; then
  pkill -f "vite" 2>/dev/null && echo "  ✅ Vite 开发服务器已停止" && STOPPED=1 || true
fi

# ─── 5. 端口占用清理（兜底）───
PORT_3000=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_3000" ]; then
  echo "$PORT_3000" | xargs kill -9 2>/dev/null && echo "  ✅ 端口 3000 已释放" && STOPPED=1 || true
fi

PORT_5173=$(lsof -ti:5173 2>/dev/null)
if [ -n "$PORT_5173" ]; then
  echo "$PORT_5173" | xargs kill -9 2>/dev/null && echo "  ✅ 端口 5173 已释放" && STOPPED=1 || true
fi

# ─── 6. 孤儿进程清理 ───
# 清理可能残留的子进程（better-sqlite3 等不会占用端口）
ORPHANS=$(pgrep -f "better-sqlite3\|knex\|src/index" 2>/dev/null)
if [ -n "$ORPHANS" ]; then
  echo "$ORPHANS" | xargs kill -9 2>/dev/null && echo "  ✅ 残留进程已清理" || true
fi

sleep 0.5

echo ""
if [ $STOPPED -eq 0 ]; then
  echo "💤 没有运行中的服务"
else
  echo "✅ 所有服务已停止"
fi
