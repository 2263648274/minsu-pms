#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
mkdir -p backup
STAMP=$(date +%Y%m%d-%H%M%S)
TARGET="backup/pms-$STAMP.sql.gz"
TEMP="backup/.pms-$STAMP.sql"
trap 'rm -f "$TEMP"' EXIT INT TERM

docker compose --env-file .env.production exec -T mysql sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers pms_xkzoom' \
  > "$TEMP"
gzip -c "$TEMP" > "$TARGET"
gzip -t "$TARGET"
printf 'Verified backup: %s\n' "$TARGET"
