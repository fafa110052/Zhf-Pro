#!/bin/bash
# ═══════════════════════════════════════════════════
# 住好房每日备份：SQLite 数据库 + 上传图片
#
# 用法:
#   ./scripts/backup.sh                      # 手动备份（备份到 /root/backups）
#   BACKUP_DIR=/tmp/bk ./scripts/backup.sh   # 指定备份目录（测试用）
#   30 17 * * * /root/Zhf-Pro/server/scripts/backup.sh >> /root/backups/cron.log 2>&1
#                                            # crontab 每天 17:30（时区 Asia/Shanghai）
#
# 说明:
# - DB 为 SQLite DELETE 日志模式，主库 database.sqlite 始终是已提交状态，
#   直接打包即得一致快照（本机无 sqlite3 CLI，故用文件级打包而非 .backup）。
# - 图片多为已压缩 jpg/webp，gzip 收益有限，体积≈原始大小。
# - 保留最近 7 份，自动轮转。
# - 同盘备份只防「误删/误操作/迁移出错」，不防整机磁盘损坏；如需异地容灾，
#   后续可把备份目录再同步到对象存储（COS）冷备。
# ═══════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"     # server 根目录（含 data/ 与 uploads/）
BACKUP_DIR="${BACKUP_DIR:-/root/backups}"  # 可用环境变量覆盖
KEEP=7
TS=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/zhf-backup-$TS.tar.gz"
LOG="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

# 失败也记日志（cron 环境无邮件通知）
trap 'echo "$(date "+%F %T") FAIL 备份失败（脚本第 $LINENO 行）" >> "$LOG"' ERR

# 校验源目录
[ -f "$PROJECT_DIR/data/database.sqlite" ] || { echo "$(date '+%F %T') FAIL 找不到数据库 $PROJECT_DIR/data/database.sqlite" >> "$LOG"; exit 1; }

# 打包：数据库目录 + 上传图片目录
tar czf "$FILE" -C "$PROJECT_DIR" data uploads

# 轮转：只保留最近 KEEP 份
ls -1t "$BACKUP_DIR"/zhf-backup-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

SIZE=$(du -h "$FILE" | cut -f1)
COUNT=$(ls -1 "$BACKUP_DIR"/zhf-backup-*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
echo "$(date '+%F %T') OK  $(basename "$FILE") ($SIZE)  当前共 $COUNT 份" >> "$LOG"
echo "✅ 备份完成: $FILE ($SIZE)"
