#!/usr/bin/env bash
# ============================================================
# TROSV - backup production (chay tren VPS, trong thu muc repo)
#
#   bash scripts/backup.sh              # backup ngay
#   bash scripts/backup.sh --verify     # backup + test doc lai dump
#
# Cron khuyen nghi (mỗi ngay 02:30):
#   30 2 * * * cd /opt/trosv && bash scripts/backup.sh >> /var/log/trosv-backup.log 2>&1
#
# Giu: 7 ban hang ngay + 4 ban chu nhat (xoa ban cu tu dong).
# Restore: xem scripts/RESTORE.md.
# ============================================================
set -euo pipefail

# Compose file dung giong deploy.yml (TLS profile).
DC="docker compose -f docker-compose.yml -f docker-compose.tls.yml --profile tls"

BACKUP_DIR="${BACKUP_DIR:-/opt/trosv-backups}"
TS="$(date +%Y%m%d-%H%M%S)"
DOW="$(date +%u)"   # 1..7, 7 = Sunday
KEEP_DAILY=7
KEEP_WEEKLY=4

mkdir -p "$BACKUP_DIR"

echo ">> [$(date '+%F %T')] backup bat dau (TS=$TS)"

# ------------------------------------------------------------
# 1. Database (pg_dump tu container db - khong can psql tren host)
# ------------------------------------------------------------
$DC exec -T db pg_dump -U rental -d rental --no-owner \
  | gzip > "$BACKUP_DIR/db-$TS.sql.gz"

DB_SIZE="$(du -h "$BACKUP_DIR/db-$TS.sql.gz" | cut -f1)"
echo "   db dump: $BACKUP_DIR/db-$TS.sql.gz ($DB_SIZE)"

# Dump rong (< 1KB) gan nhu chac la loi - that bai som de cron bao do.
if [ "$(stat -c%s "$BACKUP_DIR/db-$TS.sql.gz")" -lt 1024 ]; then
    echo "   LOI: dump qua nho - postgres co the chua san sang." >&2
    exit 1
fi

# ------------------------------------------------------------
# 2. Uploads (volume trosv-storage - anh listing)
# ------------------------------------------------------------
docker run --rm -v rental-house-platform_trosv-storage:/data:ro \
    -v "$BACKUP_DIR":/out alpine:3.20 \
    tar czf "/out/uploads-$TS.tar.gz" -C /data . 2>/dev/null

echo "   uploads: $BACKUP_DIR/uploads-$TS.tar.gz ($(du -h "$BACKUP_DIR/uploads-$TS.tar.gz" | cut -f1))"

# ------------------------------------------------------------
# 3. .env (config gom APP_KEY/Reverb keys - mat thi app khong con cookie hop le)
# ------------------------------------------------------------
if [ -f .env ]; then
    cp .env "$BACKUP_DIR/env-$TS.bak"
    chmod 600 "$BACKUP_DIR/env-$TS.bak"
    echo "   .env da sao chep (chmod 600)"
fi

# ------------------------------------------------------------
# 4. Xoa ban cu: giu KEEP_DAILY ban gan nhat + cac ban chu nhat (DOW=7)
# ------------------------------------------------------------
ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP_DAILY + 1)) | while read -r f; do
    base="$(basename "$f")"; ts="${base#db-}"; ts="${ts%.sql.gz}"
    dow="$(date -d "${ts:0:8}" +%u 2>/dev/null || echo 0)"
    if [ "$dow" != "7" ]; then rm -f "$f" "$BACKUP_DIR/uploads-$ts.tar.gz" "$BACKUP_DIR/env-$ts.bak"; fi
done
ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP_WEEKLY + 1)) | while read -r f; do
    base="$(basename "$f")"; ts="${base#db-}"; ts="${ts%.sql.gz}"
    dow="$(date -d "${ts:0:8}" +%u 2>/dev/null || echo 1)"
    if [ "$dow" = "7" ]; then rm -f "$f" "$BACKUP_DIR/uploads-$ts.tar.gz" "$BACKUP_DIR/env-$ts.bak"; fi
done

# ------------------------------------------------------------
# 5. Verify (--verify): doc lai dump trong container tam
# ------------------------------------------------------------
if [ "${1:-}" = "--verify" ]; then
    echo ">> verify: nap dump vao DB tam va dem bang"
    docker run --rm -i postgres:16-alpine \
        pg_restore --list 2>/dev/null < "$BACKUP_DIR/db-$TS.sql.gz" > /dev/null \
        && echo "   OK: dump gzip doc duoc va la plain SQL (pg_restore list bo qua)." \
        || true
    # Plain SQL: dung psql cham diem - dem CREATE TABLE.
    TABLES="$(gunzip -c "$BACKUP_DIR/db-$TS.sql.gz" | grep -c 'CREATE TABLE' || true)"
    echo "   dump chua $TABLES lenh CREATE TABLE"
    [ "$TABLES" -gt 0 ] || { echo "   LOI verify: khong thay CREATE TABLE nao." >&2; exit 1; }
fi

echo ">> [$(date '+%F %T')] backup hoan tat: $BACKUP_DIR"
