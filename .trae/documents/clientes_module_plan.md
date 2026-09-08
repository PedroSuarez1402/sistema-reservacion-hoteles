# Módulo de Clientes / Usuarios Registrados (Huespedes) — Implementation Plan

## Repository Research

### Estado actual de la arquitectura (confirmado)
- **Backend**: Node.js + Express + Sequelize 6 + MySQL. Montaje `/api/v1` en puerto 4000.
  - `usuarios` tabla con campos `id, nombre, email, password, rol (HUESPED|ADMIN|RECEPCION), created_at, updated_at`. Unique email.
  - Asociaciones N:1 bidireccional ya definidas en `models/index.js` `User.hasMany(Reservation onDelete RESTRICT)` y `Reservation.belongsTo(User)` ✅.
  - `reservation.repository.getAll / getByUsuarioId` ya incluyen eager-load de User (id, nombre, email, rol) y Room. El problema NO es falta de datos en reservas, sino visualización listado USUARIOS + sus reservas.
  - `auth.middleware.js` YA EXISTE el factory `isRecepcionOrAdmin(req, res, next)` (lineas 84-97).
  - `user.routes.js` actual (muy restrictivo):
    - `GET /users` → `verifyToken + isAdmin` (SOLO ADMIN, recepcion no puede ver lista ❌)
    - `GET /users/:id` → verifyToken (cualquier user registrado, pero controlador getById no filtra ownership ni rol).
    - `DELETE /users/:id` → verifyToken + isAdmin ✅ (correcto, solo admin borra)
    - `create / login / me / update` existen y están bien.
  - `user.repository.getAll()` soporta `where={}` y `order[]` pero NO paginación NO filtro keyword. Solo devuelve raw Users **sin includes reservaciones**.
  - `user.controller.getAll()` devuelve array directo **incluyendo password hash** ⚠️ (LEAK: hoy el endpoint `/users` IS `isAdmin` protegido, pero es vulnerabilidad potencial al exponer hash; debe serializar siempre attributes safe).

- **Frontend**: Next.js 14 App Router TS, TanStack Query v5, RHF + zod, Tailwind + components/ui barrel.
  - `types/index.ts` ya tiene `interface User { id, nombre, email, rol, createdAt?, updatedAt? }` ✅. NO tiene campo reservaciones ni contadores.
  - **NO EXISTE** `user.service.ts` / `useUsers` hook. Únicos usos de /users: `auth.service.ts` (login / register / me) y `useAuth.ts` (perfil).
  - Dashboard layout actual `/dashboard/admin/page.tsx`:
    - Accesible para `isRecepcionOrAdmin` ✅ (layout redirige si no cumple). Llamado "admin" pero el rol RECEPCION también entra.
    - `type AdminTab = 'reservaciones' | 'habitaciones' | 'etiquetas'` (3 tabs). Hay que agregar `'clientes'`.
    - Usa patrones Card + Summary KPI + Tabs + Buscador + Tabla lista divide-y (ya usado en etiquetas y reservaciones). Reutilizable.
  - `Pagination.tsx` UI reutilizable recién implementado (tarea anterior). Listo para paginar clientes.
  - Recepcionista YA puede entrar a `/dashboard/admin` y ver Reservaciones/Habitaciones/Etiquetas (aunque tags muta es 403, UI OK). Nuevo módulo Clientes debe ser READ-ONLY para RECEPCION, ADMIN puede editar / desactivar / borrar.

### Necesidades del usuario (interpretación del mensaje)
- El problema: "tengo reservaciones pero NO tengo información de la persona que la hizo". Las reservaciones SI incluyen `reservation.usuario?.nombre` (eager-load en repo), pero no hay una vista AGREGADA por cliente:
  - Ver TODOS los usuarios registrados en la app, con rol HUESPED (foco principal de "clientes del hotel").
  - Por cada cliente, mostrar KPI: Nº reservas hechas, ingreso total, estado última reserva, fecha de registro.
  - Filtro búsqueda por nombre / email. Paginación (clientes crecen con el tiempo).
  - Acceso: ADMIN y RECEPCION ambos pueden VER. Solo ADMIN puede actualizar datos del cliente, cambiar rol, borrar / desactivar.

---

## Files and Modules

### Backend
- **Modificar** `backend/src/repositories/user.repository.js`:
  - Añadir `findAndCountAllPaginated({ keyword, page, limit, rol })` (filtro LIKE nombre/email, filtro rol optional, includes optional conteo reservas o ultimo checkin).
  - Añadir `getUserWithReservationsSummary(id)` con aggregate conteo/ingreso y última reserva eager.
- **Modificar** `backend/src/services/user.service.js`:
  - Añadir `getAllPaginated({ keyword, page, limit, rol })` + meta.
  - Añadir `getByIdWithSummary(id)`.
  - Regla sanitize: NUNCA devolver `password` field.
- **Modificar** `backend/src/controllers/user.controller.js`:
  - Refactor `getAll` con pagination server-side y serialize (strip password + añadir summary).
  - Nuevo `getSummary(req, res, next)` para `/:id/summary`.
  - Refactor `update`: si rol es RECEPCION sólo puede cambiar nombre/email de HUESPED; ADMIN puede cambiar rol.
- **Modificar** `backend/src/routes/user.routes.js`:
  - `GET /users`: `verifyToken + isRecepcionOrAdmin` (antes solo isAdmin; ahora RECEPCION puede listar clientes).
  - `GET /users/:id`: `verifyToken + (isOwnerOrAdminOrRecepcion)` → custom middleware o inline check.
  - Añadir `GET /users/:id/summary`: `verifyToken + isRecepcionOrAdmin`.
  - `PUT /users/:id`: `verifyToken` → controller gestiona ownership y permisos de rol según caso.
  - `DELETE /users/:id`: `verifyToken + isAdmin` (sin cambios).

### Frontend — Types + Services + Hooks
- **Modificar** `frontend/src/types/index.ts`:
  - Añadir `ClientesListItem` (user + `reservaciones_count`, `ingreso_total`, `ultima_reserva_fecha`, `ultima_reserva_estado`).
  - Añadir payloads `UpdateUserPayload` (nombre, email, rol optional para admin).
- **Nuevo** `frontend/src/services/user.service.ts`:
  - `getAllPaginated({ keyword?, page?, limit?, rol? }) → PaginatedResponse<ClientesListItem>`.
  - `getById(id) → User`.
  - `update(id, payload) → User`.
  - `remove(id) → void`.
- **Modificar** `frontend/src/hooks/query/queryKeys.ts`:
  - Añadir `users.all/lists(params)/detail(id)`.
  - `STALE_TIMES.USERS_LIST 3min / USER_DETAIL 10min`.
- **Nuevo** `frontend/src/hooks/query/useUsers.ts`:
  - `useUsersPaginated` (keepPreviousData, invalidate predicate todas las páginas en mutaciones).
  - `useUpdateUser` (invalidate detail + lists).
  - `useDeleteUser` (optimistic + rollback, solo ADMIN UI botón visible).
  - Barrels en `hooks/useUsers.ts`, `hooks/query/index.ts`, `hooks/index.ts`.

### Frontend — UI
- **Nuevo componente** `frontend/src/components/ClientesTable.tsx` (reutiliza patrón divide-y):
  - Columnas: Nombre + email + Rol Badge + Fecha registro + Contador reservas + Ingreso total + Última reserva (fecha / estado Badge) + Acciones (Ver detalle / Editar / Eliminar).
  - Row click → abrir Dialog detalle.
- **Nuevo componente** `frontend/src/components/ClienteModal.tsx` (Dialog edit similar a TagModal):
  - Zod schema nombre min 2 max 100, email isEmail, rol (solo visible si me.rol === ADMIN) select HUESPED/RECEPCION/ADMIN.
- **Modificar** `frontend/src/app/(site)/dashboard/admin/page.tsx`:
  - Nuevo type `AdminTab = 'reservaciones' | 'habitaciones' | 'etiquetas' | 'clientes'` (4).
  - Nuevo `ClientSummary` 4 KPIs: Total clientes / Nuevos este mes / Sin reservas aún / Clientes VIP (top 10% ingreso).
  - Añadir Tab "Clientes" con icono `Users`:
    - Input buscador nombre/email, Pagination 8x página, 4 estados (loading skeleton / error retry / empty / success lista).
    - Filtro chips por Rol (Todos / Huespedes / Recepcion / Admin, por defecto Todos).
    - Integra ClientesTable y ClienteModal + Dialog confirmación eliminar.
  - **Permisos UI condicionales** (basado en `me?.rol`):
    - Botón Editar: solo ADMIN.
    - Cambiar rol dentro del modal: solo ADMIN (si no es admin, campo disabled/hidden).
    - Botón Eliminar: solo ADMIN.
- **Modificar** `frontend/src/components/index.ts` barrel, exportar `ClientesTable`, `ClienteModal`.
- **Modificar** `frontend/src/components/ui/index.ts` (si se necesita algo nuevo, probablemente no, usamos existing Dialog/Input/Select/Badge/Button/Pagination/Card).

---

## Implementation Steps

1. **Fase imp1 - Backend permisos + serialize**:
   - Refactor `user.controller.js` para serializar Users NUNCA devolver password. Cambiar `GET /users` de `isAdmin` a `isRecepcionOrAdmin`.

2. **Fase imp2 - Backend paginación + summary**:
   - `user.repository`: `findAndCountAllPaginated` con LIKE keyword nombre/email + optional `rol` filter.
   - `user.service`: `getAllPaginated` devuelve `{items, meta}`. Items incluyen counters via aggregate o via query adicional de Reservation counts.
   - `GET /users` acepta `keyword, page, limit, rol` en query; backwards compat sin params → default pag 1, limit 10.

3. **Fase imp3 - Backend update/delete permisos granulares**:
   - Endpoint `GET /users/:id/summary`: eager `reserva_count, ingreso_total, ultima_reserva`.
   - Controller `update`: si `me.rol === RECEPCION` solo puede actualizar usuarios con `rol === HUESPED` y no puede cambiar rol. ADMIN = full update (incluir cambiar rol).

4. **Fase imp4 - Frontend types + services + queryKeys + hooks**:
   - Types payloads y ClientesListItem.
   - `user.service.ts` axios.
   - `queryKeys.ts` users family.
   - `useUsers.ts` hooks paginación optimistic invalidate cross-page.
   - Barrel exports actualizados.

5. **Fase imp5 - Frontend UI ClientesTable + ClienteModal**:
   - Nuevo `ClientesTable` con columnas resumen + acciones.
   - Nuevo `ClienteModal` zod schema, permisos UI condicionales según `me?.rol`.

6. **Fase imp6 - Frontend integración Tab Clientes en Dashboard**:
   - 4to tab Clientes en `admin/page.tsx`.
   - Summary KPIs.
   - Buscador + filtros Rol chips + Pagination.
   - Integración mutate update/delete con Dialogs.

7. **Fase imp7 - Quality gates**:
   - Syntax backend node --check.
   - npm run typecheck frontend (tsc).
   - npx vitest run (agregar dummy payloads donde User types sean requeridos en tests existentes).
   - Opcional: npm run build para confirmar 0 errores static gen.

---

## Dependencies and Considerations

- **Permissions Matrix (debe quedar igual que este plan)**:
  | Endpoint / UI | HUESPED | RECEPCION | ADMIN |
  |---|---|---|---|
  | GET /users (lista paginada, clientes) | 403 | 200 | 200 |
  | GET /users/:id/summary | 403 (o self, decidir) | 200 | 200 |
  | PUT /users/:id (editar nombre/email) | self only | solo si es HUESPED | 200 todos |
  | PUT cambiar rol | 403 | 403 | 200 |
  | DELETE /users/:id | 403 | 403 | 200 |
  | Tab "Clientes" visible | no | sí (solo lectura) | sí (CRUD) |

- **Backwards compat**:
  - Reservaciones siguen mostrando `reservation.usuario?.nombre` sin cambios (ya funcionaba).
  - El endpoint `GET /users` no rompe: si no hay pagination params usa defaults page=1 limit=10. Si se necesita lista completa para algún lookup futuro, se agregará endpoint separado o `limit=100`.

- **Seguridad password leak**:
  - Refactor crítico: serializar User controller a `{ id, nombre, email, rol, createdAt, updatedAt }` en TODAS las respuestas. NUNCA devolver `password` hash aunque el endpoint sea ADMIN-only. Evitamos leak futuro accidental.

- **Pagination en tabla clientes sigue exactamente el patrón implementado para Etiquetas** (mismos params, mismo `keepPreviousData`, misma estructura Pagination UI). Consistencia.

- **Reservas eager en Repository User**: Los summary counters (reservaciones_count, ingreso_total) NO se calculan en raw sequelize aggregate query con MySQL para mantener simpleza; se hace COUNT y SUM via `ReservationRepository` adicional en el servicio. Esto es más mantenible.

---

## Validation

- Manual smoke: Login `recepcion@hotel.com / Recepcion123` → Tab Clientes visible, 4 KPIs, listado 8 usuarios paginados, buscador funciona, BOTÓN EDITAR y ELIMINAR ESTÁN OCULTOS / DESHABILITADOS → intento manual PUT /users/:id cambiando rol a ADMIN → 403 Forbidden.
- Manual smoke: Login `admin@hotel.com / Admin123` → Tab Clientes → Editar un cliente, cambiar nombre → 200 → cambia en lista sin F5 (invalidate). Cambiar rol de HUESPED a RECEPCION → guarda OK. Eliminar cliente sin reservas → 200 confirm Dialog.
- Intentar eliminar cliente CON reservas asociadas → debe fallar con `ForbiddenError / ConstraintError` (onDelete: RESTRICT ya definido en asociación). UI must toast error.
- `GET /users` sin query params: devuelve pag meta.
- Typecheck 0 errors, vitest 22/22, syntax backend 0, Next build 8/8.

---

## Risks

1. **Riesgo [ALTO]**: Hoy `GET /users` es isAdmin-only. Cambiarlo a isRecepcionOrAdmin podría exponer datos sensibles si el controller sigue devolviendo password hash. **Mitigación**: serialize function estricta implementada ANTES de cambiar el middleware, primer paso de imp1.
2. **Riesgo [MEDIO]**: RECEPCION podría intentar cambiar rol de su propio usuario o de otros via PUT manual. **Mitigación**: Controller `update` valida ownership y bloquea cambiar rol a menos que `me.rol === ADMIN`.
3. **Riesgo [BAJO]**: Seed inicial crea 1 admin + 1 recepcion + 6-8 huespedes. Primera página del paginador OK; si hay menos de 8 no se rompe, Pagination ya soporta 1 página.
4. **Riesgo [BAJO]**: Eliminar usuario HUESPED tiene ON DELETE RESTRICT con reservaciones; si tiene reservas no se borra. **Mitigación**: UI toast explicativo "No se puede eliminar porque tiene reservas asociadas" antes que el 500 genérico.
