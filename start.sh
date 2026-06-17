#!/bin/bash

# ═══════════════════════════════════════════
# 住好房 V1.2 — 一键启动 (开发 / 生产)
# 用法: bash start.sh [dev|prod]
# ═══════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-dev}"

# ═══════════════════════════════════════════
# 网络环境检测（增强版）
# ═══════════════════════════════════════════

detect_network() {
  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  🔍 网络环境检测                    ║"
  echo "╚══════════════════════════════════════╝"
  echo ""

  LOCAL_IPS=()
  WIFI_SSID=""
  PRIMARY_IP=""

  # ─── WiFi 名称 ───
  if [[ "$OSTYPE" == "darwin"* ]]; then
    _get_ssid() {
      networksetup -getairportnetwork "$1" 2>/dev/null | awk -F': ' '{print $2}' 2>/dev/null
    }
    WIFI_SSID=$(_get_ssid en0)
    [[ "$WIFI_SSID" =~ "Error"|"not associated"|"You are not" ]] && WIFI_SSID=""
    if [ -z "$WIFI_SSID" ]; then
      WIFI_SSID=$(_get_ssid en1)
      [[ "$WIFI_SSID" =~ "Error"|"not associated"|"You are not" ]] && WIFI_SSID=""
    fi
    if [ -z "$WIFI_SSID" ]; then
      WIFI_SSID=$(system_profiler SPAirPortDataType 2>/dev/null | grep " SSID:" | head -1 | awk -F': ' '{print $2}' 2>/dev/null)
      [[ "$WIFI_SSID" =~ "Error" ]] && WIFI_SSID=""
    fi
    [ -z "$WIFI_SSID" ] && WIFI_SSID="已连接"

    # 获取所有非本地 IPv4 地址
    while IFS= read -r ip; do
      [ -z "$ip" ] && continue
      [ "$ip" = "127.0.0.1" ] && continue
      local iface=$(ifconfig 2>/dev/null | grep -B4 "inet $ip " | grep "^[a-z]" | head -1 | cut -d: -f1)
      [ -z "$iface" ] && iface="未知"
      # 排除虚拟接口和 VPN 隧道
      [[ "$iface" =~ ^(bridge|vboxnet|vmnet|utun|llw|awdl|anpi|fw|gif|stf).* ]] && continue
      LOCAL_IPS+=("$ip|$iface")
    done < <(ifconfig 2>/dev/null | grep "inet " | awk '{print $2}')
  else
    WIFI_SSID=$(iwgetid -r 2>/dev/null || echo "已连接")
    while IFS= read -r line; do
      ip=$(echo "$line" | awk '{print $2}' | cut -d'/' -f1)
      iface=$(echo "$line" | awk '{print $1}')
      if [[ "$ip" =~ ^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.) ]]; then
        [[ "$iface" =~ ^(docker|veth|br-|lo|virbr).* ]] && continue
        LOCAL_IPS+=("$ip|$iface")
      fi
    done < <(ip -4 addr show 2>/dev/null | grep -E 'inet ' || true)
  fi

  # ─── 显示结果 ───
  echo "  📶 WiFi: $WIFI_SSID"

  if [ ${#LOCAL_IPS[@]} -eq 0 ]; then
    echo ""
    echo "  ╔════════════════════════════════════╗"
    echo "  ║  ❌ 未检测到局域网 IP！            ║"
    echo "  ╚════════════════════════════════════╝"
    echo ""
    echo "  🔧 排查："
    echo "  1. 是否已连接 WiFi？系统设置 → WiFi"
    echo "  2. 是否有 VPN 在运行？尝试断开 VPN"
    echo "  3. 手动查看：ifconfig | grep 'inet '"
    echo ""
  else
    echo "  🌐 局域网地址："
    for entry in "${LOCAL_IPS[@]}"; do
      ip="${entry%%|*}"
      iface="${entry##*|}"
      echo "     → $ip  ($iface)"
      if [ -z "$PRIMARY_IP" ] || [[ "$iface" =~ ^(en[0-9]|wlan[0-9]|eth[0-9])$ ]]; then
        PRIMARY_IP="$ip"
      fi
    done
  fi
}

# ═══════════════════════════════════════════
# 自动修复 constants.js BASE_URL
# ═══════════════════════════════════════════

auto_fix_constants() {
  local primary_ip="${1:-}"
  local mp_config="${SCRIPT_DIR}/miniprogram/utils/constants.js"

  [ -z "$primary_ip" ] && return 1
  [ ! -f "$mp_config" ] && return 1

  local new_url="http://${primary_ip}:3000"
  local current_base=$(grep "BASE_URL" "$mp_config" 2>/dev/null | grep -o "http[s]*://[^']*" | head -1)

  if [ -z "$current_base" ]; then
    return 1
  fi

  if [[ "$current_base" == "$new_url" ]]; then
    echo "  ✅ constants.js BASE_URL 已正确：$new_url"
    return 0
  fi

  # IP 不匹配 → 自动修复
  echo ""
  echo "  ⚠️  IP 发生变化！"
  echo "     当前 BASE_URL: $current_base"
  echo "     实际本机 IP:   $new_url"
  echo ""

  # 备份原文件
  cp "$mp_config" "${mp_config}.bak"

  # 用 sed 替换（兼容 macOS 和 Linux）
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|${current_base}|${new_url}|g" "$mp_config"
  else
    sed -i "s|${current_base}|${new_url}|g" "$mp_config"
  fi

  echo "  ✅ 已自动更新 constants.js BASE_URL → $new_url"
  echo "     (原文件备份至 constants.js.bak)"
  echo ""
  return 0
}

# ═══════════════════════════════════════════
# 真机调试指引（增强版）
# ═══════════════════════════════════════════

show_device_guide() {
  local port="${1:-3000}"
  local primary_ip="${2:-}"

  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  📱 真机调试 / 预览 快速指引        ║"
  echo "╚══════════════════════════════════════╝"
  echo ""

  if [ -z "$primary_ip" ]; then
    echo "  ⚠️  未能获取局域网 IP，跳过网络测试"
    return
  fi

  local test_url="http://${primary_ip}:${port}/api/network-check"
  local api_url="http://${primary_ip}:${port}"
  local mp_config="${SCRIPT_DIR}/miniprogram/utils/constants.js"

  # ─── Step 1: 连通性测试 ───
  echo "  ─── 连通性测试 ───"

  # 本地
  if curl -s --max-time 2 "http://127.0.0.1:${port}/api/health" > /dev/null 2>&1; then
    echo "  ✅ localhost:${port} 通"
  else
    echo "  ❌ localhost:${port} 不通 — 服务器未启动！"
    return
  fi

  # 局域网
  if curl -s --max-time 2 "http://${primary_ip}:${port}/api/health" > /dev/null 2>&1; then
    echo "  ✅ ${primary_ip}:${port} 通"
  else
    echo "  ❌ ${primary_ip}:${port} 不通！"
    echo ""
    echo "  ─── 可能原因 ───"
    echo "  1. macOS 防火墙拦截"
    echo "     状态: $(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo '未知')"
    echo "     关闭: sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off"
    echo ""
    echo "  2. 路由器 AP 隔离（客户端之间禁止互访）"
    echo "     登录路由器管理页 → 无线设置 → 关闭 AP 隔离"
    echo ""
    echo "  3. 电脑和手机不在同一子网"
    echo "     用手机热点排障：电脑连手机热点 → 重跑 bash start.sh"
    echo ""
    return
  fi

  # ─── Step 2: 自动修复 constants.js ───
  auto_fix_constants "$primary_ip"

  # ─── Step 3: 操作指引 ───
  echo "  ┌─────────────────────────────────────┐"
  echo "  │  📋 真机调试三步走：                 │"
  echo "  │                                     │"
  echo "  │  1️⃣  手机连 WiFi「${WIFI_SSID}」"
  echo "  │                                     │"
  echo "  │  2️⃣  手机浏览器验证：                │"
  echo "  │      $test_url"
  echo "  │      → 看到 JSON 说明通 ✅          │"
  echo "  │      → 打不开说明不通 ❌            │"
  echo "  │        (换手机热点排查路由器问题)    │"
  echo "  │                                     │"
  echo "  │  3️⃣  微信开发者工具：               │"
  echo "  │      详情 → 本地设置 →              │"
  echo "  │      ✅ 不校验合法域名...           │"
  echo "  │      → 扫码预览 / 真机调试          │"
  echo "  └─────────────────────────────────────┘"
  echo ""

  # ─── Step 4: 多 IP 警告 ───
  local ip_count=0
  for entry in "${LOCAL_IPS[@]}"; do
    ip_count=$((ip_count + 1))
  done
  if [ "$ip_count" -gt 1 ]; then
    echo "  ⚠️  检测到多个局域网 IP，手机端只能访问其中一个。"
    echo "     如果连接失败，尝试手机浏览器逐一测试每个 IP："
    for entry in "${LOCAL_IPS[@]}"; do
      ip="${entry%%|*}"
      echo "       → http://${ip}:${port}/api/health"
    done
    echo ""
  fi

  # ─── Step 5: 手机浏览器不通时的自助排查 ───
  echo "  💡 手机浏览器打不开时，执行以下命令排查："
  echo "     # 1. 确认电脑 IP"
  echo "     ifconfig | grep 'inet ' | grep -v 127.0.0.1"
  echo ""
  echo "     # 2. 临时关防火墙"
  echo "     sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off"
  echo ""
  echo "     # 3. 换手机热点（最终手段）"
  echo "     电脑连手机热点 → bash start.sh → 用新 IP 测试"
  echo ""
}

# ═══════════════════════════════════════════
echo "╔══════════════════════════════════════╗"
echo "║  🏠 住好房 V1.2 装修展示平台        ║"
echo "║     楼盘专属硬装选材 · 启动中...    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ─── 清理旧进程 ───
echo "🧹 清理旧进程..."
pkill -f "nodemon"         2>/dev/null || true
pkill -f "node src/index"  2>/dev/null || true
pkill -f "vite"            2>/dev/null || true
pm2 stop zhuhaofang-server 2>/dev/null || true
pm2 stop zhuhaofang-admin  2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1
echo "✅ 旧进程已清理"
echo ""

# ═══════════════════════════════════════
# 网络检测（启动前）
# ═══════════════════════════════════════
detect_network

if [ "$MODE" = "prod" ]; then
  # ═══════════════════════════════════════
  # 生产模式
  # ═══════════════════════════════════════
  echo "🚀 生产模式启动..."

  cd "$SCRIPT_DIR/admin"
  npm install --silent 2>/dev/null
  npx vite build
  echo "✅ 管理后台构建完成 → admin/dist/"

  cd "$SCRIPT_DIR/server"
  npm install --silent 2>/dev/null

  if [ ! -f "$SCRIPT_DIR/server/data/database.sqlite" ]; then
    echo "🗄️  初始化数据库..."
    npx knex migrate:latest --knexfile knexfile.js
    npx knex seed:run --knexfile knexfile.js
    echo "✅ 数据库初始化完成"
  fi

  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
  fi
  pm2 start ecosystem.config.js

  sleep 2
  auto_fix_constants "${PRIMARY_IP:-}"
  show_device_guide 3000 "${PRIMARY_IP:-}"

  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  ✨ V1.2 生产模式启动完成            ║"
  echo "║  🌐 http://localhost:3000            ║"
  echo "║  🔑 admin / admin123                 ║"
  echo "║  🛑 bash stop.sh 停止服务            ║"
  echo "╚══════════════════════════════════════╝"

else
  # ═══════════════════════════════════════
  # 开发模式
  # ═══════════════════════════════════════
  echo "🔧 开发模式启动..."

  # ─── better-sqlite3 兼容 ───
  cd "$SCRIPT_DIR/server"
  if ! node -e "require('better-sqlite3')" 2>/dev/null; then
    echo "🔧 原生模块不兼容，自动重装 better-sqlite3..."
    rm -rf node_modules/better-sqlite3/build
    npm rebuild better-sqlite3 2>/dev/null || (rm -rf node_modules && npm install)
    echo "✅ 原生模块修复完成"
  fi

  # ─── 数据库初始化 ───
  if [ ! -f "$SCRIPT_DIR/server/data/database.sqlite" ]; then
    echo "🗄️  数据库不存在，自动初始化..."
    mkdir -p data
    npx knex migrate:latest --knexfile knexfile.js
    npx knex seed:run --knexfile knexfile.js
    echo "✅ 数据库初始化完成"
  else
    echo "📂 数据库已存在，跳过初始化"
  fi

  # ─── 启动后端 ───
  echo ""
  echo "🔧 启动后端 API (端口 3000)..."
  npm run dev &
  BACKEND_PID=$!

  echo -n "⏳ 等待后端就绪"
  for i in $(seq 1 20); do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
      echo " ✅"
      break
    fi
    echo -n "."
    sleep 0.5
  done

  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ 后端 API → http://localhost:3000"
  else
    echo ""
    echo "⚠️  后端启动超时，检查 server/ 终端输出"
  fi

  # ─── 启动管理后台 ───
  echo ""
  echo "🎨 启动管理后台 (端口 5173)..."
  cd "$SCRIPT_DIR/admin"
  npm run dev &
  FRONTEND_PID=$!

  sleep 2

  # ─── 自动修复 + 网络指引 ───
  auto_fix_constants "${PRIMARY_IP:-}"
  show_device_guide 3000 "${PRIMARY_IP:-}"

  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "║  ✨ V1.2 开发模式启动完成            ║"
  echo "║  🎨 管理后台: http://localhost:5173  ║"
  echo "║  📡 后端 API: http://localhost:3000  ║"
  echo "║  🔑 admin / admin123                 ║"
  echo "║  🛑 Ctrl+C 停止 / bash stop.sh       ║"
  echo "╚══════════════════════════════════════╝"
  echo ""

  cleanup() {
    echo ""
    echo "🛑 正在停止所有服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -P $BACKEND_PID 2>/dev/null || true
    sleep 1
    echo "👋 已停止，下次见！"
    exit 0
  }
  trap cleanup SIGINT SIGTERM
  wait
fi
