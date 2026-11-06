# 🏨 Sistema de Reservación de Hoteles (Patrones de Software)

Aplicación web integral de gestión hotelera y reservaciones turísticas desarrollada para la asignatura de **Patrones de Software**. Cuenta con dos arquitecturas comparativas: una **línea base monolítica procedimental (sin patrones)** y una **arquitectura refactorizada basada en microservicios y patrones de diseño GoF (Factory Method, Flyweight, Builder, Composite, Chain of Responsibility, Observer y Pub/Sub Broker)**.

---

## 🏗️ Comparativa de Arquitecturas

### 1️⃣ Versión con Patrones (Microservicios + Next.js)
```
sistema-reservacion-hoteles/
├── frontend/                 # 🌐 Next.js 14 + React + TS (Puerto 3000)
└── services/
    ├── room-service/         # 🛏️ Catálogo (Habitaciones, Tags, Fotos) [Factory Method + Flyweight] (Puerto 4001)
    ├── booking-service/      # 📅 Reservas (Usuarios, Auth, Paquetes) [Builder + Composite + Chain + Observer] (Puerto 4002)
    └── message-broker/       # 📨 Broker central asíncrono [Pub/Sub] (Puerto 4003)
```

**Patrones implementados en Microservicios:**
* **Factory Method** (`room-service`): Familia de creadores concretos (`CreadorSencilla`, `CreadorDoble`, `CreadorSuite`) para instanciar tipos de habitaciones.
* **Flyweight** (`room-service`): Compartición de categorías y etiquetas para optimización de memoria.
* **Builder** (`booking-service`): Construcción y validación paso a paso de reservaciones complejas (`ReservationBuilder`).
* **Composite** (`booking-service`): Jerarquía polimórfica para tarificación y cotización de estadías, servicios individuales y paquetes compuestos (`ComponenteCotizacion`, `HospedajeItem`, `ServicioSimple`, `PaqueteCompuesto`, `CotizacionReserva`).
* **Chain of Responsibility** (`booking-service`): Eslabones independientes para validación previa con short-circuit (`DateCoherenceHandler`, `RoomStatusAndCapacityHandler`, `OverlapAvailabilityHandler`, `PricingAndPackagePolicyHandler`).
* **Observer** (`booking-service`): Despacho reactivo de eventos desacoplado con soporte para suscripción/desuscripción en caliente (`ReservationEventManager`, `WhatsAppNotificationObserver`, `RoomHousekeepingObserver`, `AuditLogObserver`, `MessageBrokerBridgeObserver`).
* **Publish / Subscribe** (`message-broker`): Bus de eventos desacoplado para notificar `RESERVA_CREADA`.
* **API Gateway / Proxy** (`frontend`): Rewrites transparentes en Next.js hacia los microservicios.

---

### 2️⃣ Versión Línea Base Sin Patrones (Monolito)
```
sistema-reservacion-hoteles/
├── frontend-monolito/        # 🎨 Next.js 14 conectado al monolito (Puerto 3001)
└── backend/                  # 🏛️ Backend Monolítico Express (Puerto 4000 /api/v1)
```
* **Cálculo y flujo procedimental**: Utiliza métodos monolíticos con bucles `for` e `if/else` inline manuales para validar y acumular precios, con notificaciones hardcoded acopladas sin abstracciones ni observadores.

---

## 🎯 Laboratorio de Patrones del Tercer Corte

Para la sustentación final del Tercer Corte, el proyecto dispone de dos herramientas de evaluación:

### 1. Inspector Visual en Next.js (Dashboard Web)
* **Ruta en frontend:** `/dashboard/patrones` (accesible desde el menú lateral como **"Laboratorio de Patrones"**).
* **Switches en Caliente (Hot-Swap):** Permite encender o apagar en tiempo real los 4 observadores (`WhatsAppNotificationObserver`, `RoomHousekeepingObserver`, `AuditLogObserver`, `MessageBrokerBridgeObserver`) consumiendo la API de `booking-service`.
* **Simulador Comparativo:** Alterna entre modo **"Con Patrones (Chain + Observer)"** y **"Sin Patrones (Procedimental)"** para los eventos `RESERVA`, `CHECK_IN` y `CHECK_OUT`.
* **Visualizador de Trazabilidad:** Muestra paso a paso los eslabones evaluados de la cadena (`validationTrace`) y los observadores que reaccionaron (`notificationTrace`), incluyendo el enlace universal de WhatsApp generado (`https://wa.me/57...`).

### 2. Demostración en Terminal (CLI)
Para correr la prueba comparativa automatizada en consola con formato de colores, ejecuta:

```bash
# Desde la raíz del repositorio:
npm run demo:patrones

# O directamente desde services/booking-service:
cd services/booking-service
npm run demo:patrones
```

### 3. Documentación Formal y Diagramas de Clases UML (Mermaid)
Toda la documentación técnica exigida por la rúbrica está detallada en el archivo dedicado:
👉 **[PATRONES_TERCER_CORTE.md](./PATRONES_TERCER_CORTE.md)**
* **Diagrama 1:** Patrón `Observer` aislado (`ReservationEventManager`, `IReservationObserver`, 4 observadores concretos).
* **Diagrama 2:** Patrón hermano `Chain of Responsibility` aislado (`ReservationValidationHandler`, 4 handlers concretos).
* **Diagrama 3:** Arquitectura Integrada conectando `BookingService` -> `Chain of Responsibility` -> `Composite` -> `ReservationBuilder` -> `Observer`.
* **Tabla Comparativa:** Con Patrones vs. Sin Patrones (acoplamiento, OCP, SRP, testeabilidad, short-circuit).

---

## 📋 Requisitos previos

Antes de empezar, asegúrate de tener instalado:

| Herramienta | Versión recomendada | Notas |
|-------------|---------------------|-------|
| Node.js     | **22.x** o superior | Requerido por la sintaxis nativa `--env-file` |
| npm         | **10.x** o superior | Incluido junto con Node.js |
| MySQL       | **8.0** o superior  | Servicio MySQL corriendo localmente en el puerto 3306 |
| Git         | Cualquier versión reciente | Para clonar el repositorio |

---

## 🚀 1. Clonar el repositorio

```bash
git clone https://github.com/PedroSuarez1402/sistema-reservacion-hoteles.git
cd sistema-reservacion-hoteles
```

## ⚙️ 2. Instalar dependencias

Para la arquitectura recomendada (Microservicios + Frontend Next.js), instala las dependencias de cada módulo:

```bash
# 1. Frontend Web (Next.js)
cd frontend
npm install
cd ..

# 2. Microservicio de Habitaciones y Catálogo (room-service)
cd services/room-service
npm install
cd ../..

# 3. Microservicio de Reservas y Usuarios (booking-service)
cd services/booking-service
npm install
cd ../..

# 4. Message Broker Pub/Sub (message-broker)
cd services/message-broker
npm install
cd ../..
```

---

## 🔐 3. Configurar variables de entorno (.env)

Cada servicio cuenta con su archivo de plantilla `.env.example`. Copia cada uno a un archivo `.env` en su respectiva carpeta:

```bash
# En Windows (PowerShell):
copy services/room-service/.env.example services/room-service/.env
copy services/booking-service/.env.example services/booking-service/.env
copy services/message-broker/.env.example services/message-broker/.env

# En Linux / macOS / Bash:
# cp services/room-service/.env.example services/room-service/.env
# cp services/booking-service/.env.example services/booking-service/.env
# cp services/message-broker/.env.example services/message-broker/.env
```

---

## 🗄️ 4. Base de Datos MySQL (Creación y Migración)

```bash
# 1. Base de datos de habitaciones (hotel_rooms)
cd services/room-service
npm run db:ensure
npm run db:sync -- --alter
npm run seed
cd ../..

# 2. Base de datos de reservas y usuarios (hotel_bookings)
cd services/booking-service
npm run db:ensure
npm run db:sync -- --alter
npm run seed
cd ../..
```

---

## 🏃 5. Ejecutar la Solución Completa (Microservicios + Frontend)

Abre terminales independientes para cada componente:

```bash
# Terminal 1: Frontend Next.js (Puerto 3000)
cd frontend
npm run dev

# Terminal 2: Room Service (Puerto 4001)
cd services/room-service
npm run dev

# Terminal 3: Booking Service (Puerto 4002)
cd services/booking-service
npm run dev

# Terminal 4: Message Broker (Puerto 4003)
cd services/message-broker
npm run dev
```

Accede desde tu navegador a **`http://localhost:3000`** e ingresa al dashboard en **`http://localhost:3000/dashboard/patrones`**.
