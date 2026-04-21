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

# Auto-re-exec con la versión recién descargada del script (evita que bash
# ejecute la versión vieja cacheada en memoria cuando el script se modificó)
if [ -z "${HOTEL_UPDATE_REEXEC:-}" ]; then
  export HOTEL_UPDATE_REEXEC=1
  exec bash "${APP_DIR}/deploy/update.sh" "$@"
fi

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

# ---------- Refrescar config de Nginx (siempre la reescribimos idempotente) ----------
NGINX_SITE="/etc/nginx/sites-available/hotel"
log "Reescribiendo config de nginx (WebSocket + API + uploads)..."
cat > "${NGINX_SITE}" <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    root /var/www/hotel;
    index index.html;

    client_max_body_size 25M;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }

    # ^~ evita que la regex de cache-estáticos abajo intercepte las fotos
    location ^~ /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
        # Cache razonable, las fotos no cambian
        expires 7d;
        add_header Cache-Control "public";
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX
ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/hotel

# ---------- Recargar servicios ----------
log "Recargando PM2 (sin downtime)..."
cd "${APP_DIR}"
pm2 reload deploy/ecosystem.config.cjs --update-env
pm2 save

log "Recargando Nginx..."
nginx -t && systemctl reload nginx

ok "Actualización completa."
pm2 status
