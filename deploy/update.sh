#!/usr/bin/env bash
###############################################################################
# Hotel System - Update Script
# Tira los últimos cambios de GitHub, recompila y recarga sin downtime.
###############################################################################
set -euo pipefail

APP_DIR="/opt/hotel"
WEB_ROOT="/var/www/hotel"
LANDING_ROOT="/var/www/landing"

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

log "Publicando nuevos archivos estáticos del sistema..."
rsync -a --delete "${APP_DIR}/frontend/dist/" "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}"

log "Publicando landing page pública..."
mkdir -p "${LANDING_ROOT}"
rsync -a --delete "${APP_DIR}/landing/" "${LANDING_ROOT}/"
chown -R www-data:www-data "${LANDING_ROOT}"

# ---------- Refrescar config de Nginx (detecta SSL y lo preserva) ----------
NGINX_SITE="/etc/nginx/sites-available/hotel"
CERT_DIR="/etc/letsencrypt/live/caribeperu.com"
if [ -f "${CERT_DIR}/fullchain.pem" ] && [ -f "${CERT_DIR}/privkey.pem" ]; then
  HAS_SSL=1
  log "Certificado SSL detectado · generando config nginx con HTTPS..."
else
  HAS_SSL=0
  log "Sin certificado SSL · generando config nginx solo HTTP..."
fi

# Bloques comunes
SNIPPET_LANDING_BODY='    root /var/www/landing;
    index index.html;
    client_max_body_size 5M;

    # Redirige www → dominio raíz
    if ($host = www.caribeperu.com) {
        return 301 $scheme://caribeperu.com$request_uri;
    }

    # API pública: la landing consume /api/public/* para sedes y habitaciones
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Uploads (fotos de habitaciones) servidos desde el backend
    location ^~ /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
        expires 7d;
        add_header Cache-Control "public";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?|mp4|webm|ogg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }'

SNIPPET_SISTEMA_BODY='    root /var/www/hotel;
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

    location ^~ /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
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

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?|mp4|webm|ogg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }'

if [ "$HAS_SSL" = "1" ]; then
  cat > "${NGINX_SITE}" <<NGINX
# ==========================================================================
# LANDING PÚBLICA (HTTPS) · caribeperu.com + www.caribeperu.com
# ==========================================================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name caribeperu.com www.caribeperu.com;

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

${SNIPPET_LANDING_BODY}
}

# ==========================================================================
# SISTEMA PRIVADO (HTTPS) · sistema.caribeperu.com
# ==========================================================================
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name sistema.caribeperu.com _;

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

${SNIPPET_SISTEMA_BODY}
}

# ==========================================================================
# Redirección HTTP → HTTPS (todos los dominios)
# ==========================================================================
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name caribeperu.com www.caribeperu.com sistema.caribeperu.com _;
    return 301 https://\$host\$request_uri;
}
NGINX
else
  cat > "${NGINX_SITE}" <<NGINX
# ==========================================================================
# LANDING PÚBLICA · caribeperu.com + www.caribeperu.com
# ==========================================================================
server {
    listen 80;
    listen [::]:80;
    server_name caribeperu.com www.caribeperu.com;

${SNIPPET_LANDING_BODY}
}

# ==========================================================================
# SISTEMA PRIVADO · sistema.caribeperu.com (+ fallback IP directa)
# ==========================================================================
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name sistema.caribeperu.com _;

${SNIPPET_SISTEMA_BODY}
}
NGINX
fi

ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/hotel
rm -f /etc/nginx/sites-enabled/default

# ---------- Recargar servicios ----------
log "Recargando PM2 (sin downtime)..."
cd "${APP_DIR}"
pm2 reload deploy/ecosystem.config.cjs --update-env
pm2 save

log "Recargando Nginx..."
nginx -t && systemctl reload nginx

ok "Actualización completa."
pm2 status
