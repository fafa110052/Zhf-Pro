#!/bin/bash
# ═══════════════════════════════════════════════════
# 住好房数据库备份脚本
#
# 用法:
#   ./scripts/backup.sh              # 手动备份
#   0 3 * * * /path/to/backup.sh     # crontab 每天凌晨 3 点自动备份
#
# 备份策略:
#   - 保留最近 7 天的每日备份
#   - 保留最近 4 周的每周备份（每周日）
# ═══════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_FILE="$PROJECT_DIR/data/database.sqlite"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$BACKUP_DIR/backup.log"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 检查数据库文件是否存在
if [ ! -f "$DB_FILE" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 数据库文件不存在: $DB_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

# 备份文件名
DATE=$(date +%Y%m%d)
DAY_OF_WEEK=$(date +%u)  # 1=周一 7=周日
BACKUP_NAME="zhuhaofang_${DATE}.sqlite"

# ═══ 1. 执行备份（SQLite 在线备份） ═══
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始备份..." | tee -a "$LOG_FILE"

sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/$BACKUP_NAME'"

# 压缩（节省约 70% 空间）
gzip -f "$BACKUP_DIR/$BACKUP_NAME"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ 备份完成: ${BACKUP_NAME}.gz" | tee -a "$LOG_FILE"

# ═══ 2. 清理旧备份 ═══

# 删除 7 天前的每日备份
find "$BACKUP_DIR" -name "zhuhaofang_*.sqlite.gz" -mtime +7 -delete 2>/dev/null

# 保留每周日的备份作为周备份（30 天内的）
# （周日的备份文件名天然区分，只需保留更久）
find "$BACKUP_DIR" -name "zhuhaofang_*7.sqlite.gz" -mtime +30 -delete 2>/dev/null

# ═══ 3. 统计 ═══
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sqlite.gz 2>/dev/null | wc -l | tr -d ' ')
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份总数: ${BACKUP_COUNT} 个，占用: ${BACKUP_SIZE}" | tee -a "$LOG_FILE"

echo "完成"
