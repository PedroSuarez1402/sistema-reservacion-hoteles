# 🏨 Sistema de Reservación de Hoteles

Aplicación web moderna de gestión hotelera construida bajo una **arquitectura de microservicios** que permite administrar **habitaciones**, **usuarios** y **reservaciones** con disponibilidad en tiempo real, roles de acceso y autenticación segura.

## Arquitectura general

```
sistema-reservacion-hoteles/
├── frontend/                 # 🎨 Next.js 14 + React + TS + Tailwind (puerto 3000)
└── services/
    ├── room-service/         # 🏨 Microservicio Catálogo: Habitaciones, Etiquetas, Imágenes (puerto 4001)
    └── booking-service/      # 📅 Microservicio Reservas: Usuarios, Autenticación, Reservaciones (puerto 4002)
```

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Microservicios**: Node.js 22 + Express + ES Modules (cada uno independiente)
- **Base de datos**: MySQL 8 + Sequelize (ORM) — ambos servicios comparten la misma instancia de BD pero administran sus propias tablas
- **Autenticación**: JWT + contraseñas hasheadas con bcrypt (gestionado en `booking-service`)
- **Comunicación entre servicios**: `booking-service` consulta disponibilidad/precios a `room-service` vía HTTP interno

---

## 📋 Requisitos previos

Antes de empezar, asegúrate de tener instalado:

| Herramienta | Versión recomendada |
|-------------|---------------------|
| Node.js     | **22.x** o superior |
| npm         | 10.x (incluido con Node 22) |
| MySQL       | 8.0 o superior      |
| Git         | Cualquier versión reciente |

---

## 🚀 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/sistema-reservacion-hoteles.git
cd sistema-reservacion-hoteles
```

> ⚠️ Reemplaza `TU_USUARIO` por la URL real de tu repositorio.

---

## ⚙️ 2. Instalación local

### 2.1 Instalar dependencias del frontend

```bash
cd frontend
npm install
cd ..
```

### 2.2 Instalar dependencias de cada microservicio

```bash
# Microservicio de habitaciones (room-service)
cd services/room-service
npm install
cd ../..

# Microservicio de reservas (booking-service)
cd services/booking-service
npm install
cd ../..
```

---

### 2.3 Configurar variables de entorno

Cada microservicio tiene su propio archivo `.env`. Copia la plantilla `.env.example` a `.env` en **cada servicio** y ajusta tus credenciales de MySQL:

#### a) services/room-service/.env
```env
PORT=4001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MySQL (misma instancia para ambos servicios)
DB_NAME=sistema-reservas
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_HOST=localhost
DB_PORT=3306
DB_SSL=false

JWT_SECRET=una_clave_secreta_larga_y_random
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
```

#### b) services/booking-service/.env
```env
PORT=4002
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# MySQL (mismo esquema que room-service)
DB_NAME=sistema-reservas
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_HOST=localhost
DB_PORT=3306
DB_SSL=false

JWT_SECRET=la_misma_clave_secreta_que_room_service
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
```

> 🔐 **Importante**: Ambos servicios deben compartir el **mismo `JWT_SECRET`** para que los tokens sean válidos en toda la plataforma.

---

### 2.4 Crear la base de datos en MySQL

El script `ensure-db.js` existe en **cada** microservicio. Puedes correr cualquiera de los dos (o ambos, es idempotente) para crear automáticamente la base de datos `sistema-reservas` si no existe:

```bash
# Opción A: desde room-service
cd services/room-service
node --env-file=.env ensure-db.js
cd ../..

# Opción B: desde booking-service
cd services/booking-service
node --env-file=.env ensure-db.js
cd ../..
```

> Salida esperada: `✅ Base de datos 'sistema-reservas' creada exitosamente.` o `✅ Base de datos 'sistema-reservas' ya existe.`

---

## 🗄️ 3. Cargar datos iniciales (Seeders)

Cada microservicio gestiona sus propias tablas, por lo tanto tienes **dos seeders independientes** que debes ejecutar.

### ✅ Orden recomendado de ejecución

⚠️ **Importante**: Ejecuta primero `room-service` y luego `booking-service`. Esto es porque `booking-service` necesita que las habitaciones ya existan para asociarlas a las reservaciones de ejemplo.

---

### 3.1 Cargar Catálogo (Habitaciones + Etiquetas + Imágenes)

Microservicio: **`services/room-service`**

```bash
cd services/room-service
npm run seed
```

**Qué hace**:
1. Limpia las tablas del catálogo (`habitaciones_etiquetas` → `habitaciones` → `etiquetas`)
2. Inserta 25+ etiquetas/comodidades
3. Crea habitaciones de tipo **SENCILLA**, **DOBLE** y **SUITE** con sus etiquetas asociadas
4. Muestra el resumen en consola

---

### 3.2 Cargar Usuarios + Reservaciones demo

Microservicio: **`services/booking-service`**

```bash
cd services/booking-service
npm run seed
```

**Qué hace**:
1. Limpia las tablas `reservaciones` → `usuarios`
2. Crea usuarios con los 3 roles: **ADMIN**, **RECEPCION** y **HUÉSPED**
3. Crea reservaciones de ejemplo asociadas a las habitaciones creadas en el paso anterior
4. Muestra credenciales de acceso en consola

---

### 🔐 Credenciales de prueba (después de ejecutar AMBOS seeders)

| Rol        | Email                     | Contraseña    |
|------------|---------------------------|---------------|
| ADMIN      | admin@hotel.com           | Admin123      |
| RECEPCION  | recepcion@hotel.com       | Recepcion123  |
| Huésped    | huesped@hotel.com         | Huesped123    |
| Huésped    | juan.perez@example.com    | Huesped123    |
| Huésped    | ana.gomez@example.com     | Huesped123    |
| Huésped    | carlos.ruiz@example.com   | Huesped123    |

---

### 🧹 Limpiar datos de un servicio individual

Si necesitas vaciar **solo** las tablas de un microservicio sin volver a sembrar:

```bash
# Vaciar solo catálogo (habitaciones/etiquetas)
cd services/room-service
npm run seed:undo

# Vaciar solo usuarios/reservaciones
cd services/booking-service
npm run seed:undo
```

---

## ▶️ 4. Ejecutar la aplicación completa

Necesitas **3 terminales abiertas** (una por servicio):

**Terminal 1 — Microservicio de habitaciones (room-service):**
```bash
cd services/room-service
npm run dev
```
> 🟡 Catálogo API: **http://localhost:4001**

**Terminal 2 — Microservicio de reservas (booking-service):**
```bash
cd services/booking-service
npm run dev
```
> 🔴 Reservas/Usuarios API: **http://localhost:4002**

**Terminal 3 — Frontend Next.js:**
```bash
cd frontend
npm run dev
```
> 🔵 Aplicación Web: **http://localhost:3000**

> 💡 El frontend ya tiene configurado un proxy interno (rewrites en `next.config.js`) que redirige `/api/*` al microservicio correspondiente. Para el navegador todo parece venir del **mismo origen**, evitando problemas de CORS.

---

## 📌 Resumen de comandos rápidos

### 🎯 Frontend (carpeta `frontend/`)
| Comando | Descripción |
|---|---|
| `npm install` | Instalar dependencias |
| `npm run dev` | Iniciar Next.js (modo desarrollo) |
| `npm run build && npm start` | Compilar y ejecutar en producción |

---

### 🏨 Microservicio `services/room-service` (puerto 4001)
| Comando | Descripción |
|---|---|
| `npm install` | Instalar dependencias |
| `node --env-file=.env ensure-db.js` | Crear la BD en MySQL si no existe |
| **`npm run seed`** | **Cargar habitaciones + etiquetas** (catálogo) |
| `npm run seed:undo` | Vaciar tablas del catálogo |
| `npm run dev` | Iniciar servidor (modo watch) |
| `npm start` | Iniciar servidor (modo producción) |

---

### 📅 Microservicio `services/booking-service` (puerto 4002)
| Comando | Descripción |
|---|---|
| `npm install` | Instalar dependencias |
| `node --env-file=.env ensure-db.js` | Crear la BD en MySQL si no existe |
| **`npm run seed`** | **Cargar usuarios + reservaciones demo** (ejecutar DESPUÉS del seed de room-service) |
| `npm run seed:undo` | Vaciar tablas de usuarios/reservaciones |
| `npm run dev` | Iniciar servidor (modo watch) |
| `npm start` | Iniciar servidor (modo producción) |
