#!/usr/bin/env bash
###############################################################################
# Hotel System - Update Script
# Tira los últimos cambios de GitHub, recompila y recarga sin downtime.
###############################################################################
set -euo pipefail

APP_DIR="/opt/hotel"
WEB_ROOT="/var/www/hotel"

log() { echo -e "\033[1;36m==>\033[0m $*"; }
ok() { echo -e "\033[1;32m[✔]\033[0m $*"; }

cd "${APP_DIR}"

log "Git pull..."
git fetch --all
git reset --hard origin/main

log "Instalando dependencias (workspaces)..."
NODE_ENV=development npm ci --no-audit --no-fund --include=dev

# ---------- Backend ----------
cd "${APP_DIR}/backend"
log "Generando cliente Prisma y aplicando cambios de schema..."
npx prisma generate
if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null | grep -v migration_lock.toml || true)" ]; then
  npx prisma migrate deploy
else
  npx prisma db push --skip-generate --accept-data-loss
fi

log "Compilando backend (clean build)..."
rm -rf "${APP_DIR}/backend/dist" "${APP_DIR}/backend/tsconfig.tsbuildinfo"
npm run build

if [ ! -f "${APP_DIR}/backend/dist/main.js" ] || [ ! -f "${APP_DIR}/backend/dist/prisma/prisma.module.js" ]; then
  echo "ERROR: el build del backend está incompleto" >&2
  ls -la "${APP_DIR}/backend/dist" || true
  exit 1
fi

# ---------- Frontend ----------
cd "${APP_DIR}/frontend"
log "Compilando frontend..."
npm run build

log "Publicando nuevos archivos estáticos..."
rsync -a --delete "${APP_DIR}/frontend/dist/" "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}"

# ---------- Recargar servicios ----------
log "Recargando PM2 (sin downtime)..."
cd "${APP_DIR}"
pm2 reload deploy/ecosystem.config.cjs --update-env
pm2 save

log "Recargando Nginx..."
nginx -t && systemctl reload nginx

ok "Actualización completa."
pm2 status
