# Hotel System

Sistema de gestión hotelera **multi-sede** con habitaciones, alquileres, productos, limpieza (con fotos de evidencia) y caja por turno.

## Stack

- **Backend:** Node.js 22 LTS + NestJS 10 + Prisma + PostgreSQL 16 + JWT
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS 4 + TanStack Query + React Router + Zustand
- **Iconos:** lucide-react (bundle local, sin CDN)
- **BD:** PostgreSQL en Docker
- **Uploads:** almacenamiento local en `backend/uploads/` (migrable a S3 más adelante)

## Requisitos

- Node.js 22 LTS ([node.js](https://nodejs.org/))
- Docker Desktop (para PostgreSQL)
- Windows / Linux / macOS

## Instalación y primer arranque

### 1. Levantar PostgreSQL con Docker

```bash
cd hotel
docker compose up -d postgres
```

PgAdmin opcional: http://localhost:5050 (admin@hotel.local / admin123)

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

Backend disponible en **http://localhost:3001/api**

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en **http://localhost:5173**

## Usuarios de prueba (contraseña: `admin123`)

| Username     | Rol          | Alcance                          |
| ------------ | ------------ | -------------------------------- |
| `superadmin` | SUPERADMIN   | Todas las sedes                  |
| `admin`      | ADMIN_SEDE   | Sede Principal                   |
| `hotelero`   | HOTELERO     | Ver/despachar hotel + productos  |
| `limpieza`   | LIMPIEZA     | Tareas de limpieza               |
| `cajero`     | CAJERO       | Caja por turno                   |

## Módulos implementados

- [x] **Autenticación JWT** con roles y aislamiento por sede.
- [x] **Sedes** (multi-tenant).
- [x] **Usuarios** con gestión por sede.
- [x] **Pisos y habitaciones** (estados: DISPONIBLE, OCUPADA, ALISTANDO, MANTENIMIENTO, FUERA_SERVICIO).
- [x] **Productos** con stock y ajustes (historial en `MovimientoStock`).
- [x] **Productos de limpieza** con stock.
- [x] **Alquileres**: DNI, horario, productos consumidos, métodos de pago (Efectivo, Visa, Master, Yape, Plin). Anulación con motivo y reversión de stock. Historial preservado.
- [x] **Transición automática** `OCUPADA → ALISTANDO` al finalizar alquiler, con creación de tarea de limpieza.
- [x] **Limpieza**: asignación, inicio, upload de fotos de evidencia (local), registro de productos usados, completado (solo con al menos una foto) → habitación pasa a `DISPONIBLE`.
- [x] **Caja por turno**: abrir/cerrar por usuario, cálculo automático de totales por método de pago, reporte de productos vendidos.

## Desplegar en un VPS (Ubuntu 24.04)

Ver [`deploy/README.md`](deploy/README.md). Resumen:

```bash
# Como root en el VPS, una sola vez:
curl -fsSL https://raw.githubusercontent.com/caribe69/caribe/main/deploy/install.sh | bash

# Para actualizar a la última versión de GitHub:
bash /opt/hotel/deploy/update.sh
```

Incluye: Node 22 + PostgreSQL + Nginx + PM2 (con auto-restart y auto-boot).

## Próximos pasos sugeridos

- [ ] Notificaciones en vivo (WebSockets).
- [ ] Migrar uploads a S3 / Cloudflare R2.
- [ ] Exportar reportes a PDF.
- [ ] Gráficos en dashboard.

## Estructura

```
hotel/
├── docker-compose.yml
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── auth/
│   │   ├── sedes/
│   │   ├── usuarios/
│   │   ├── pisos/
│   │   ├── habitaciones/
│   │   ├── productos/
│   │   ├── productos-limpieza/
│   │   ├── alquileres/
│   │   ├── limpieza/
│   │   ├── caja/
│   │   ├── prisma/
│   │   ├── common/
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── uploads/
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        ├── store/
        └── lib/
```

## Comandos útiles

```bash
# Prisma Studio (GUI para la BD)
cd backend && npx prisma studio

# Resetear BD con seed
cd backend && npx prisma migrate reset

# Ver logs de postgres
docker compose logs -f postgres
```
