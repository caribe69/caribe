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

# ---------- Backend ----------
cd "${APP_DIR}/backend"
log "Instalando dependencias backend (si cambiaron)..."
npm ci --no-audit --no-fund

log "Aplicando migraciones de base de datos..."
npx prisma generate
npx prisma migrate deploy

log "Compilando backend..."
npm run build

# ---------- Frontend ----------
cd "${APP_DIR}/frontend"
log "Instalando dependencias frontend (si cambiaron)..."
npm ci --no-audit --no-fund

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
