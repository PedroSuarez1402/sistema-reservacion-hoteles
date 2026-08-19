# 🏨 Sistema de Reservación de Hoteles

Sistema moderno de gestión hotelera construido con **Next.js 14** (frontend) y **Node.js 22 + Express + Sequelize + MySQL** (backend).

---

## 📋 Tabla de Contenido
- [Estado del Proyecto](#-estado-del-proyecto)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Documentación de la API](#-documentación-de-la-api)
- [Modelos de Datos](#-modelos-de-datos)
- [Arquitectura Backend](#-arquitectura-backend-capa-por-capa)
- [Middleware y Seguridad](#-middleware-y-seguridad)
- [Dependencias Instaladas](#-dependencias-instaladas)
- [Requerimientos Funcionales Checklist](#-requerimientos-funcionales---checklist)
- [Requerimientos No Funcionales](#-requerimientos-no-funcionales)
- [Scripts Disponibles](#-scripts-disponibles)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🚧 Estado del Proyecto

| Módulo | Estado |
|--------|--------|
| Configuración Node 22 ES Modules .env nativo | ✅ Listo |
| BD MySQL + Sequelize + Pool + SSL configurable | ✅ Implementado |
| Modelos User Room Reservation + relaciones + índices | ✅ Implementado |
| Arquitectura Routes → Controllers → Services → Repositories | ✅ Implementado |
| Auth JWT + roles HUESPED / RECEPCION / ADMIN | ✅ Implementado |
| Custom Errors + Global Error Handler (Sequelize/JWT) | ✅ Implementado |
| Seguridad Helmet CORS Rate Limit 100req/15min | ✅ Implementado |
| Motor Reservas Disponibilidad / Crear / Modificar / Cancelar | ✅ Implementado |
| CRUD Habitaciones con permisos por rol | ✅ Implementado |
| Registro / Login / Perfil / CRUD Usuarios | ✅ Implementado |
| Graceful Shutdown SIGINT SIGTERM | ✅ Implementado |
| Frontend Next.js 14 + Tailwind + dependencias modernas | 🔧 Básico |
| Check-in / Check-out de reservaciones | 🔧 Pendiente |
| Facturación (servicios extra / cálculo final) | 🔧 Pendiente |
| Tests automatizados | 🔧 Pendiente |

---

## ✨ Características

### Gestión de Habitaciones
- ✅ CRUD completo
- ✅ Tipos: **SENCILLA**, **DOBLE**, **SUITE**
- ✅ Estados: **ACTIVA**, **MANTENIMIENTO**
- ✅ Precio por noche. Número único por habitación

### Motor de Reservas
- ✅ Búsqueda disponibilidad por rango de fechas (core)
- ✅ Creación reserva con cálculo precio = noches × precio_noche
- ✅ Valida habitación activa, fecha_inicio ≥ HOY, fecha_inicio < fecha_fin
- ✅ Prevención double-booking (service layer + modelo + índice único BD)
- ✅ Modificar reserva (fechas / habitación) con re-cálculo
- ✅ Cancelar reserva (con restricciones por estado)
- ✅ Permisos: Huésped ve sus reservas. Staff ve todas.

### Usuarios y Roles
- ✅ Registro / Login con JWT Bearer Token
- ✅ 3 roles: **HUESPED**, **RECEPCION**, **ADMIN**
- ✅ Contraseñas hash bcrypt (BCRYPT_SALT_ROUNDS configurable)
- ✅ Hook normaliza email a minúsculas

### Seguridad
- ✅ Helmet (headers seguridad HTTP)
- ✅ CORS configurado solo a FRONTEND_URL
- ✅ Rate Limit 100 peticiones / 15 min por IP
- ✅ Jerarquía errores custom y error handler central
- ✅ Respuestas JSON uniformes

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + React 18 + TS + Tailwind |
| Backend | Node.js 22 + Express 4 + ES Modules |
| Base Datos | MySQL 8 + Sequelize 6 + Connection Pool |
| Autenticación | JWT (jsonwebtoken 9) + bcrypt |
| Validación | Sequelize validators + validación capa Services |
| Seguridad | Helmet express-rate-limit CORS |
| IDs | UUIDv4 (todas las PK) |
| Frontend Libs | TanStack Query Zustand React Hook Form Zod Axios Lucide date-fns clsx/tailwind-merge Framer Motion |

> 💡 Node.js 22 carga nativamente .env con --env-file (NO se usa dotenv).

---

## ✅ Requisitos Previos

| Requisito | Versión Recomendada |
|-----------|---------------------|
| Node.js | **22.14.0** o superior |
| npm | 10.x o superior (incluido con Node 22) |
| MySQL | 8.0 o superior |
| Git | Cualquier versión reciente |

---

## 📁 Estructura del Proyecto

``
sistema-reservacion-hoteles/
├── backend/                                   # ⚙️ API REST
│   ├── .env                                  # ⚠️ Variables LOCALES (NO subir a GitHub)
│   ├── .env.example                          # ✅ Plantilla para colaboradores
│   ├── index.js                              # 🚀 Bootstrap, sync BD, graceful shutdown
│   ├── package.json
│   └── src/
│       ├── app.js                            # Express: middlewares, routes, 404
│       ├── config/database.js                # Sequelize (conexión + pool + SSL)
│       ├── models/                           # 🗄️ Tablas MySQL
│       │   ├── index.js                      # Relaciones entre modelos + export
│       │   ├── User.js                       # tabla: usuarios
│       │   ├── Room.js                       # tabla: habitaciones
│       │   └── Reservation.js                # tabla: reservaciones
│       ├── repositories/                     # 💾 Acceso a datos (solo queries Sequelize)
│       │   ├── user.repository.js
│       │   ├── room.repository.js
│       │   └── reservation.repository.js
│       ├── services/                         # 🧠 Lógica de negocio
│       │   ├── user.service.js
│       │   ├── room.service.js
│       │   └── reservation.service.js
│       ├── controllers/                      # 🎮 Request / Response
│       │   ├── user.controller.js
│       │   ├── room.controller.js
│       │   └── reservation.controller.js
│       ├── routes/                           # 🛤️ Endpoints + auth/roles
│       │   ├── index.js                      # /health + agrupa rutas
│       │   ├── user.routes.js
│       │   ├── room.routes.js
│       │   └── reservation.routes.js
│       ├── middlewares/
│       │   ├── auth.middleware.js            # JWT verifyToken, isAdmin, isRecepcionOrAdmin
│       │   └── error.middleware.js           # Error handler global
│       └── utils/
│           ├── errors.util.js                # Custom errors + assertRequired
│           └── date.util.js
│
└── frontend/                                  # 🎨 Aplicación web (Next.js 14 + Tailwind)
    ├── src/app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    └── package.json
``

---

## 🚀 Instalación

1. Clona el repositorio:
``bash
git clone https://github.com/TU_USUARIO/sistema-reservacion-hoteles.git
cd sistema-reservacion-hoteles
``

2. Instala dependencias Backend:
``bash
cd backend
npm install
``

3. Instala dependencias Frontend:
``bash
cd ../frontend
npm install
``

---

## ⚙️ Configuración

### 1. Base de Datos (MySQL)

Crea la BD desde consola MySQL, Workbench o phpMyAdmin/Laragon:
``sql
CREATE DATABASE `sistema-reservas`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
``

> **No necesitas crear tablas manualmente**. Al iniciar el servidor, `sequelize.sync()` las
> crea/sincroniza automáticamente (ver [backend/index.js](file:///c:/laragon/www/sistema-reservacion-hoteles/backend/index.js#L17)).
> En producción reemplaza `sync` por migraciones Sequelize.

### 2. Variables de Entorno

Copia la plantilla incluida en el repo y edítala con tus credenciales:
``bash
cd backend
copy .env.example .env        :: Windows CMD
cp   .env.example .env        # Linux / macOS / Git Bash
``

Variables principales (ver archivo [backend/.env.example](file:///c:/laragon/www/sistema-reservacion-hoteles/backend/.env.example) para lista completa y comentada):

- Servidor: `PORT` (default 3000), `NODE_ENV`, `FRONTEND_URL`
- MySQL: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_SSL`
- Pool BD: `DB_POOL_MAX / MIN / ACQUIRE / IDLE`
- JWT: `JWT_SECRET` (**CAMBIA ESTA!!**), `JWT_EXPIRES_IN`
- Password Hash: `BCRYPT_SALT_ROUNDS` (10-12 recomendado)

> 🔑 Para generar un `JWT_SECRET` seguro:
> ``bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ``

---

## ▶️ Ejecución

**Terminal 1 — Backend API (Express):**
``bash
cd backend
npm run dev
``
> 🟢 API: **http://localhost:3000** (usa `--env-file=.env` nativo Node 22 + `--watch` hot-reload nativo).

**Terminal 2 — Frontend (Next.js):**
``bash
cd frontend
npm run dev
``
> 🔵 Web: **http://localhost:3001**

**Modo Producción:**
``bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build && npm start
``

**Endpoints útiles (probar en navegador):**
- **Info API:** http://localhost:3000/
- **Health + BD:** http://localhost:3000/api/v1/health

---

## 📚 Documentación de la API

Base URL: `http://localhost:3000/api/v1`

**Formato respuestas:**
- Éxito: `{ "success": true, "message": "...", "data": ... }`
- Error: `{ "status": "error", "message": "...", "errors": [] }` (errors es opcional en validaciones)

**Autenticación:** en rutas protegidas enviar: `Authorization: Bearer <token-jwt>`

---

### Usuarios — /api/v1/users

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| POST | /users/login | ❌ | — | Login `{ email, password }` → retorna `token` + datos usuario |
| POST | /users | ❌ | — | Registrar nuevo usuario (rol por defecto **HUESPED**) |
| GET | /users/me | ✅ | Todos | Perfil del usuario autenticado |
| GET | /users | ✅ | ADMIN | Listar todos los usuarios |
| GET | /users/:id | ✅ | Dueño o Admin | Usuario por ID |
| PUT | /users/:id | ✅ | Dueño o Admin | Actualizar (solo Admin puede cambiar `rol`) |
| DELETE | /users/:id | ✅ | ADMIN | Eliminar usuario |

---

### Habitaciones — /api/v1/rooms

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | /rooms | ❌ | — | Listar todas las habitaciones |
| GET | /rooms/available?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD | ❌ | — | Motor disponibilidad por rango de fechas |
| GET | /rooms/:id | ❌ | — | Detalle de habitación |
| POST | /rooms | ✅ | ADMIN | Crear habitación |
| PUT | /rooms/:id | ✅ | ADMIN | Actualizar habitación |
| DELETE | /rooms/:id | ✅ | ADMIN | Eliminar habitación |

Body crear/actualizar:
``json
{ "numero": "201", "tipo": "DOBLE", "precio_noche": 95.50, "estado": "ACTIVA" }
``
> `tipo` ∈ **SENCILLA | DOBLE | SUITE** · `estado` ∈ **ACTIVA | MANTENIMIENTO**

---

### Reservas — /api/v1/reservations

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| GET | /reservations | ✅ | RECEPCION / ADMIN | Listar TODAS las reservas |
| GET | /reservations/:id | ✅ | Dueño o Staff | Detalle reserva (incluye usuario y habitación) |
| POST | /reservations | ✅ | Todos | Crear reserva (comprueba disponibilidad y calcula precio) |
| PUT | /reservations/:id | ✅ | Dueño o Staff | Modificar (fecha/habitación con re-cálculo) |
| PATCH | /reservations/:id/cancel | ✅ | Dueño o Staff | Cancelar reserva |
| DELETE | /reservations/:id | ✅ | RECEPCION / ADMIN | Eliminar reserva |

Body crear/modificar reserva:
``json
{ "habitacion_id": "<uuid>", "fecha_inicio": "2026-09-01", "fecha_fin": "2026-09-05", "estado": "CONFIRMADA" }
``
> `estado` ∈ PENDIENTE / CONFIRMADA / CANCELADA / FINALIZADA. Default: **CONFIRMADA**

**Validaciones automáticas al crear/modificar:**
1. La habitación existe y está **ACTIVA**
2. `fecha_inicio < fecha_fin`
3. `fecha_inicio >= HOY` (no pasado)
4. **No** solapamiento con reservas PENDIENTE / CONFIRMADA
5. `precio_total = (noches * precio_noche)`
6. Red de seguridad: **Índice SQL único** en `(habitacion_id, fecha_inicio, fecha_fin)` evita doble reserva incluso con concurrencia extrema.

---

## 🗄️ Modelos de Datos

### Tabla `usuarios` (User)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | UUID | PK · UUIDv4 por defecto |
| nombre | VARCHAR(100) | NOT NULL |
| email | VARCHAR(100) | NOT NULL · ÚNICO · Valida formato email |
| password | VARCHAR(255) | NOT NULL · Hash bcrypt |
| rol | ENUM | HUESPED (defecto) / RECEPCION / ADMIN |

### Tabla `habitaciones` (Room)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | UUID | PK |
| numero | VARCHAR(10) | NOT NULL · ÚNICO |
| tipo | ENUM | SENCILLA · DOBLE · SUITE |
| precio_noche | DECIMAL(10,2) | NOT NULL · > 0 |
| estado | ENUM | ACTIVA (default) / MANTENIMIENTO |

### Tabla `reservaciones` (Reservation)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios.id · RESTRICT |
| habitacion_id | UUID | FK → habitaciones.id · RESTRICT |
| fecha_inicio | DATEONLY | NOT NULL |
| fecha_fin | DATEONLY | NOT NULL (> fecha_inicio) |
| precio_total | DECIMAL(10,2) | NOT NULL |
| estado | ENUM | PENDIENTE / CONFIRMADA / CANCELADA / FINALIZADA |

**Relaciones:**
- 1 usuario → N reservaciones
- 1 habitación → N reservaciones

**Índices:**
- INDEX(fecha_inicio, fecha_fin) → acelera búsquedas disponibilidad
- **UNIQUE(habitacion_id, fecha_inicio, fecha_fin)** → red de seguridad anti doble reserva

---

## 🏗️ Arquitectura Backend (Capa por Capa)

| Capa | Archivos | Responsabilidad |
|------|----------|-----------------|
| **Routes** | `src/routes/*.routes.js` | Definen URL + métodos HTTP, enlazan middlewares de auth/rol y delegan al Controller |
| **Controllers** | `src/controllers/*.controller.js` | Extraen req (body/params/query/user), validan básicamente, llaman Service, formatean respuesta JSON |
| **Services** | `src/services/*.service.js` | **Lógica de negocio pura**: fechas, disponibilidad, precios, transacciones, permisos |
| **Repositories** | `src/repositories/*.repository.js` | Único punto de contacto con BD. Solo queries Sequelize (findOne, findAll, create, update, destroy) |
| **Models** | `src/models/*.js` | Definición tablas Sequelize, validaciones BD-level, hooks (beforeCreate, etc), índices, relaciones |

Beneficios arquitectura de capas:
- 🔀 Separación de responsabilidades (Single Responsibility)
- 🧪 Testeable facilmente (se mockean Repositories)
- 🧩 Cambio motor BD en el futuro sin tocar Controllers/Services
- 📜 Reglas negocio centralizadas en Services

---

## 🛡️ Middleware y Seguridad

| Archivo | Función |
|---------|---------|
| **[app.js](file:///c:/laragon/www/sistema-reservacion-hoteles/backend/src/app.js)** | Monta Helmet, CORS(FRONTEND_URL), RateLimit 100req/15min en /api, body 10MB, monta routes, 404 handler, monta errorHandler al FINAL para atrapar errores de Next() |
| **[auth.middleware.js](file:///c:/laragon/www/sistema-reservacion-hoteles/backend/src/middlewares/auth.middleware.js)** | Firmar y verificar JWT. Helpers: `verifyToken` (injecta `req.user = { id, email, rol }`), `requireRole(...roles)`, `isAdmin`, `isRecepcionOrAdmin`, `isOwnerOrAdmin(fn)` |
| **[error.middleware.js](file:///c:/laragon/www/sistema-reservacion-hoteles/backend/src/middlewares/error.middleware.js)** | Maneja TODOS los errores. Traduce: Sequelize ValidationError → 400; UniqueConstraintError → 409; ForeignKeyConstraintError → 404; AppErrors su status; JWT Token 401/TokenExpired. Devuelve stack solo en `NODE_ENV=development` |
| **[errors.util.js](file:///c:/laragon/www/sistema-reservacion-hoteles/backend/src/utils/errors.util.js)** | Jerarquía de `AppError` con subclases: `BadRequest/NotFound/Conflict/Unauthorized/Forbidden/UnprocessableEntity/InternalServer`. Helper `assertRequired(valor,msg,Clase)` para validar campos obligatorios |
| **[index.js](file:///c:/laragon/www/sistema-reservacion-hoteles/backend/index.js)** | Graceful Shutdown: cierra server HTTP + pool BD ante SIGINT/SIGTERM/uncaughtException/unhandledRejection |

---

## 📦 Dependencias Instaladas

### Backend (ver [backend/package.json](file:///c:/laragon/www/sistema-reservacion-hoteles/backend/package.json))

| Paquete | Propósito |
|---------|-----------|
| express 4 | Framework HTTP |
| mysql2 + sequelize 6 | Driver MySQL + ORM con Pool + SSL |
| jsonwebtoken 9 | Firma/verificación JWT |
| bcrypt / bcryptjs | Password Hash (configurable `BCRYPT_SALT_ROUNDS`) |
| helmet | Encabezados de seguridad HTTP |
| express-rate-limit | Anti abuso de endpoints |
| cors | CORS whitelist por `FRONTEND_URL` |
| zod | Validación esquemas (futuras validaciones) |
| pino | Logger estructurado JSON |
| nanoid / uuid | Generación IDs |

> **NO hay dependencia `dotenv` ni `nodemon`. Node 22 incluye `--env-file` y `--watch` nativos.**

### Frontend (ver [frontend/package.json](file:///c:/laragon/www/sistema-reservacion-hoteles/frontend/package.json))

| Paquete | Propósito |
|---------|-----------|
| next 14 + react 18 + ts | App Router + TypeScript |
| tailwindcss | Estilos |
| @tanstack/react-query 5 | Caching + server state |
| zustand 5 | State manager cliente |
| react-hook-form 7 + @hookform/resolvers + zod 3 | Formularios + validación |
| axios | Cliente HTTP |
| lucide-react | Íconos |
| date-fns 4 | Manipulación fechas |
| clsx + tailwind-merge | Combinar clases |
| framer-motion 13 | Animaciones |

---

## ✅ Requerimientos Funcionales — Checklist

> Basado en los requerimientos funcionales originales del proyecto.

- [x] **Módulo Habitaciones**
  - [x] CRUD habitaciones
  - [x] Tipos SENCILLA / DOBLE / SUITE
  - [x] Estados ACTIVA / MANTENIMIENTO
  - [x] Número único por habitación
  - [x] Consulta habitaciones disponibles por fecha

- [x] **Motor de Reservas**
  - [x] Búsqueda disponibilidad por rango de fechas
  - [x] Crear reserva con cálculo automático de precio
  - [x] Modificar reserva (fecha / habitación) con re-cálculo
  - [x] Cancelar reserva (validación por estado)
  - [x] Listar reservas por usuario / habitación
  - [x] Prevención double-booking (varios niveles)
  - [ ] Check-in de reservaciones (pendiente UI)
  - [ ] Check-out y cálculo de servicios extra (facturación)

- [x] **Usuarios / Roles / Permisos**
  - [x] Registro usuario con rol por defecto HUESPED
  - [x] Inicio sesión con JWT Bearer Token
  - [x] 3 roles: HUESPED, RECEPCION, ADMIN
  - [x] Contraseñas hasheadas (bcrypt)
  - [x] CRUD usuarios con permisos por rol
  - [x] Dueño de reserva = puede modificar/cancelar la propia

- [ ] **Check-in / Check-out**
  - [ ] Endpoints + UI de check-in (estado PENDIENTE → CONFIRMADA)
  - [ ] Endpoints + UI de check-out (estado CONFIRMADA → FINALIZADA)
  - [ ] Registro fecha/hora de check-in/out reales

- [ ] **Facturación**
  - [ ] Modelo Facturas + relaciones con reservaciones
  - [ ] Ítem servicos extra (desayuno, parking, spa, etc)
  - [ ] Totales + cálculo impuestos
  - [ ] PDF de factura (opcional)

---

## 🧱 Requerimientos No Funcionales

### 1. Concurrencia / Anti Double-Booking (✅ 4 niveles)

| Nivel | Implementación |
|-------|----------------|
| 1. Service Layer | `ReservationService.create/update` llama `roomRepository.checkAvailability(habitacion_id, fInicio, fFin, excludeReservaId)` antes de crear/modificar |
| 2. Model Hooks | `reservationRepository` usa `findOverlapping` con `Op.and` y rangos de fechas |
| 3. Base Datos (motor relacional) | ÍNDICE ÚNICO SQL: `UNIQUE(habitacion_id, fecha_inicio, fecha_fin)` → incluso si llega al insert dos reservas concurrentes, MySQL rechaza la segunda |
| 4. Transacciones ACID (recomendado) | En entornos productivos recomienda envolver creación en `sequelize.transaction()` (pattern listo en Service para ampliar con `managed txn`) |

### 2. Integridad Transaccional ACID (⏳ Pending extender)
- Sequelize + InnoDB MySQL ofrecen soporte nativo transacciones/rollback.
- Para operaciones críticas (crear reserva + guardar factura + modificar inventario) usa `sequelize.transaction(t)`.
- El error handler ya está preparado para tratar errores transaccionales (UniqueConstraint → Conflict 409).

### 3. Seguridad (✅ Implementado)
- JWT Bearer Token (caducidad configurable `JWT_EXPIRES_IN`)
- Password Hash bcrypt con coste configurable vía `BCRYPT_SALT_ROUNDS`
- Helmet headers seguridad
- CORS whitelist por `FRONTEND_URL` (solo ese origen puede acceder)
- Express Rate Limit (100 peticiones / 15 min por IP sobre /api)
- Middleware de permisos por rol: isAdmin / isRecepcionOrAdmin / isOwnerOrAdmin
- Respuestas de error sin exponer credenciales ni detalles internos en `production`

---

## 🧰 Scripts Disponibles

### Backend

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor Express en modo watch (hot reload) · `node --env-file=.env --watch index.js` |
| `npm start` | Inicia servidor en modo producción · `node --env-file=.env index.js` |
| `npm test` | Runner tests nativo Node 22: `node --test` |

### Frontend

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Next.js dev server (puerto 3001) |
| `npm run build` | Compila app para producción |
| `npm start` | Inicia app producción tras el build |
| `npm run lint` | ESLint + Next lint |

---

## 🤝 Contribuir

1. Fork del repositorio
2. Crea tu feature branch (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Agrega: nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

---

## 📝 Licencia

MIT © Sistema de Reservación de Hoteles. Hecho con ❤️, Node 22, Express y Next.js.

---

**⬆️ [Volver arriba](#-sistema-de-reservación-de-hoteles)**
