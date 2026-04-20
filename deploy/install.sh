#!/usr/bin/env bash
###############################################################################
# Hotel System - VPS Installer (Ubuntu 24.04)
# Ejecutar como root UNA sola vez en el VPS. Idempotente: se puede reejecutar.
###############################################################################
set -euo pipefail

APP_DIR="/opt/hotel"
REPO_URL="https://github.com/caribe69/caribe.git"
DB_NAME="hotel_db"
DB_USER="hotel"
WEB_ROOT="/var/www/hotel"
BACKEND_PORT=3001
NGINX_SITE="/etc/nginx/sites-available/hotel"

log() { echo -e "\033[1;36m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
ok() { echo -e "\033[1;32m[✔]\033[0m $*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Este script debe ejecutarse como root." >&2
  exit 1
fi

# ---------- 1. Sistema y paquetes base ----------
log "Actualizando apt..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg git build-essential ufw

# ---------- 2. Node.js 22 LTS ----------
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  log "Instalando Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  ok "Node.js $(node -v) ya instalado"
fi

# ---------- 3. PM2 ----------
if ! command -v pm2 >/dev/null; then
  log "Instalando PM2..."
  npm install -g pm2@latest
else
  ok "PM2 ya instalado"
fi

# ---------- 4. Nginx ----------
if ! command -v nginx >/dev/null; then
  log "Instalando Nginx..."
  apt-get install -y nginx
else
  ok "Nginx ya instalado"
fi

# ---------- 5. PostgreSQL ----------
if ! command -v psql >/dev/null; then
  log "Instalando PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
  systemctl enable --now postgresql
else
  ok "PostgreSQL ya instalado"
fi

# ---------- 6. Crear DB y usuario (idempotente) ----------
log "Configurando base de datos..."
DB_PASS_FILE="/root/.hotel_db_pass"
if [ ! -f "$DB_PASS_FILE" ]; then
  openssl rand -base64 24 | tr -d '\n' > "$DB_PASS_FILE"
  chmod 600 "$DB_PASS_FILE"
fi
DB_PASS="$(cat "$DB_PASS_FILE")"

sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  ok "DB ${DB_NAME} creada"
else
  ok "DB ${DB_NAME} ya existe"
fi
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# ---------- 7. Clonar / actualizar repositorio ----------
log "Clonando repositorio..."
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${APP_DIR}"
else
  git -C "${APP_DIR}" fetch --all
  git -C "${APP_DIR}" reset --hard origin/main
fi

# ---------- 8. Backend ----------
log "Configurando backend..."
JWT_SECRET_FILE="/root/.hotel_jwt_secret"
if [ ! -f "$JWT_SECRET_FILE" ]; then
  openssl rand -hex 48 | tr -d '\n' > "$JWT_SECRET_FILE"
  chmod 600 "$JWT_SECRET_FILE"
fi
JWT_SECRET="$(cat "$JWT_SECRET_FILE")"

cat > "${APP_DIR}/backend/.env" <<ENV
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="12h"
PORT=${BACKEND_PORT}
UPLOADS_DIR="./uploads"
NODE_ENV=production
ENV
chmod 600 "${APP_DIR}/backend/.env"

cd "${APP_DIR}/backend"
log "Instalando dependencias backend..."
npm ci --no-audit --no-fund

log "Generando cliente Prisma y ejecutando migraciones..."
npx prisma generate
npx prisma migrate deploy || npx prisma db push

# Seed solo si no hay usuarios aún
if ! sudo -u postgres psql -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM \"Usuario\";" 2>/dev/null | grep -qE '[1-9]'; then
  log "Ejecutando seed inicial..."
  npm run seed || warn "Seed falló (posiblemente ya ejecutado)"
else
  ok "Datos ya existen, omitiendo seed"
fi

log "Compilando backend..."
npm run build

# ---------- 9. Frontend ----------
log "Configurando frontend..."
cd "${APP_DIR}/frontend"
log "Instalando dependencias frontend..."
npm ci --no-audit --no-fund
log "Compilando frontend..."
npm run build

mkdir -p "${WEB_ROOT}"
rsync -a --delete "${APP_DIR}/frontend/dist/" "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}"

# ---------- 10. Nginx ----------
log "Configurando Nginx..."
cat > "${NGINX_SITE}" <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    root /var/www/hotel;
    index index.html;

    client_max_body_size 25M;

    # API NestJS
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

    # Uploads servidos por el backend
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # SPA React: todo lo demás cae en index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/hotel
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------- 11. PM2 ----------
log "Iniciando backend con PM2..."
cd "${APP_DIR}"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save

# PM2 startup (systemd) — solo primera vez
if ! systemctl list-unit-files | grep -q '^pm2-root\.service'; then
  log "Configurando PM2 para arrancar en boot..."
  pm2 startup systemd -u root --hp /root | tail -1 | bash || true
  pm2 save
fi

# ---------- 12. Firewall ----------
log "Configurando firewall..."
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

# ---------- 13. Resumen ----------
IP=$(hostname -I | awk '{print $1}')
ok "Instalación completa."
echo ""
echo "----------------------------------------------------------------"
echo "  🌐 App:           http://${IP}"
echo "  🔐 Login:         superadmin / admin123"
echo "  📦 Backend:       127.0.0.1:${BACKEND_PORT} (via PM2)"
echo "  🗄  DB pass:       ${DB_PASS_FILE}"
echo "  🔑 JWT secret:    ${JWT_SECRET_FILE}"
echo ""
echo "  📋 Ver logs:      pm2 logs hotel-backend"
echo "  🔄 Actualizar:    bash ${APP_DIR}/deploy/update.sh"
echo "  ♻  Reiniciar:     pm2 restart hotel-backend"
echo "----------------------------------------------------------------"
