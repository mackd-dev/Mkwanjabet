#!/usr/bin/env bash
set -euo pipefail
cd /opt/mkwanjabet
set -a; source .env; set +a
mkdir -p backups
STAMP=$(date +%Y%m%d_%H%M%S)
docker exec mkwanjabet-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "backups/mkwanjabet_${STAMP}.dump"
find backups -type f -name 'mkwanjabet_*.dump' -mtime +14 -delete
