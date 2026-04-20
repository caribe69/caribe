# Despliegue en VPS (Ubuntu 24.04)

## Instalación inicial (una sola vez)

Desde tu VPS como **root**:

```bash
curl -fsSL https://raw.githubusercontent.com/caribe69/caribe/main/deploy/install.sh | bash
```

Esto hace **todo**:

- Instala Node 22, PostgreSQL 16, Nginx, PM2
- Crea la base de datos `hotel_db` con contraseña aleatoria
- Clona el repo en `/opt/hotel`
- Genera `.env` con JWT secret aleatorio
- Ejecuta migraciones + seed inicial
- Compila backend + frontend
- Configura Nginx (proxy `/api` → `:3001`, sirve la SPA)
- Arranca el backend con PM2 y lo configura para auto-iniciar en boot
- Abre firewall (22, 80, 443)

Al terminar te mostrará la URL de acceso.

## Actualizar a la última versión de GitHub

```bash
bash /opt/hotel/deploy/update.sh
```

Tira `origin/main`, recompila backend + frontend, recarga PM2 sin downtime.

## Comandos útiles

```bash
pm2 status                    # Ver procesos
pm2 logs hotel-backend        # Logs en vivo
pm2 restart hotel-backend     # Reiniciar
pm2 monit                     # Monitor CPU/RAM

systemctl status nginx        # Estado nginx
nginx -t && systemctl reload nginx   # Probar + recargar config

sudo -u postgres psql hotel_db       # Acceso a la BD
```

## Archivos clave

| Archivo                          | Qué contiene                               |
| -------------------------------- | ------------------------------------------ |
| `/opt/hotel/backend/.env`        | Config del backend (DB, JWT) — 600         |
| `/root/.hotel_db_pass`           | Contraseña de PostgreSQL (generada)        |
| `/root/.hotel_jwt_secret`        | Secret JWT (generado)                      |
| `/etc/nginx/sites-available/hotel` | Config Nginx                             |
| `/var/www/hotel/`                | Frontend compilado (SPA)                   |
| `/var/log/hotel-backend.*.log`   | Logs del backend                           |
