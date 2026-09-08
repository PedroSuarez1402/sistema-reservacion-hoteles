# Plan Implementación Etiquetas (N:M) + Descripción Habitación

## Repository Research

### Estado actual Backend
- Modelo `Room.js` (tabla `habitaciones`): `id (UUID PK)`, `numero (STR unique)`, `tipo (ENUM)`, `precio_noche (DECIMAL)`, `estado (ENUM)`. **No existe campo `descripcion`** actualmente.
- Relaciones existentes: `Room → 1:N → Reservation`, `Room → 1:N → RoomImage`. **No hay modelo Tag ni relación N:M**.
- Arquitectura por capas existente para **images** y **rooms** (repository → service → controller → routes).
- `sync-db.js --alter` soporta actualizaciones de esquema sin borrar datos.
- Middleware auth `verifyToken + isAdmin` ya implementado y usado en `room.routes.js` imágenes.

### Estado actual Frontend
- **[RoomModal.tsx](file:///c:/laragon/www/sistema-reservacion-hoteles/frontend/src/components/RoomModal.tsx)**: solo 4 campos (numero/tipo/precio/estado) + sección imágenes modo edit. **Falta campo descripción textarea y selector de etiquetas**.
- **[RoomCard.tsx](file:///c:/laragon/www/sistema-reservacion-hoteles/frontend/src/components/RoomCard.tsx) + [home page](file:///c:/laragon/www/sistema-reservacion-hoteles/frontend/src/app/(site)/page.tsx)**: las amenidades/descripción mostradas son **fallbacks hardcodeados por tipo** SENCILLA/DOBLE/SUITE desde `roomTypeMedia` helper `getRoomAmenidades/getRoomDescripcion/enrichRoomWithMedia` en [lib/utils.ts](file:///c:/laragon/www/sistema-reservacion-hoteles/frontend/src/lib/utils.ts#L108-L250). **No hay etiquetas reales del backend** en este momento.
- **Interface `Room`** en [types/index.ts](file:///c:/laragon/www/sistema-reservacion-hoteles/frontend/src/types/index.ts#L40-L51): ya tenía los campos opcionales `descripcion?: string` y `amenidades?: string[]` (preparados hace tiempo, no usados). Se reemplazará `amenidades[]` por la relación real `etiquetas: Tag[]`.
- Dashboard admin: página [page.tsx (site/dashboard/admin)](file:///c:/laragon/www/sistema-reservacion-hoteles/frontend/src/app/(site)/dashboard/admin/page.tsx) solo gestiona habitaciones. **Falta sección/tab Gestión de Etiquetas CRUD**.
- Hooks React Query existentes: rooms, reservas, images habitación. **No hay `useTags`**.

---

## Files and Modules

### Backend (Nuevos 9 + Modificados 6 = 15 archivos)
| Archivo | Cambio |
|---|---|
| `backend/src/models/Tag.js` | **NUEVO**. Modelo `etiquetas`: id UUID, nombre UNIQUE (100 chars), descripcion nullable TEXT, timestamps. |
| `backend/src/models/HabitacionEtiqueta.js` | **NUEVO**. Tabla pivot `habitaciones_etiquetas` (Through): `habitacion_id` FK CASCADE, `etiqueta_id` FK CASCADE, PK compuesta. |
| `backend/src/models/Room.js` | **MODIFICAR**. Añadir campo `descripcion TEXT NOT NULL DEFAULT ''` + `Room.belongsToMany(Tag, { through: HabitacionEtiqueta as: 'etiquetas' })`. |
| `backend/src/models/index.js` | **MODIFICAR**. Barrel export Tag + asociaciones N:M bidireccionales `Tag.belongsToMany(Room...)`. |
| `backend/src/repositories/tag.repository.js` | **NUEVO**. `findAll() / findById() / create() / update() / remove() / countByNameExcludingId()` (unique check update). |
| `backend/src/services/tag.service.js` | **NUEVO**. Validaciones nombre (trim, max 100, unique), CRUD con errores descriptivos 409 conflicto / 404. |
| `backend/src/controllers/tag.controller.js` | **NUEVO**. Handlers CRUD REST: `index 200 / store 201 / show 200 / update 200 / destroy 200` + serialize. |
| `backend/src/routes/tag.routes.js` | **NUEVO**. `/api/v1/tags*` con `verifyToken + isAdmin` en mutaciones, `index` permitido a todos los roles (para TagSelector multi-select). |
| `backend/src/app.js` | **MODIFICAR**. Montar `app.use('/api/v1/tags', tagRoutes)` antes del 404 handler. |
| `backend/src/repositories/room.repository.js` | **MODIFICAR**. `includeImagesQuery` extendido → añade `include: [{ model: Tag, as: 'etiquetas', attributes: ['id','nombre','descripcion'] }]` en `getAll, getById, getAvailable`. |
| `backend/src/services/room.service.js` | **MODIFICAR**. `create()` recibe opcional `tag_ids?: string[]` y `descripcion?: string`. Transaccional: crea Room + `room.setEtiquetas(tag_ids)` en sequelize, retorna room con etiqutas eager. `update()` igual: permite actualizar `tag_ids[]` (reemplazo completo con diff clear/set). |
| `backend/src/controllers/room.controller.js` | **MODIFICAR**. `serializeRoom()`: transformar `plain.etiquetas` → mantener array Tag serializado (passthrough). Mantener compatibilidad: también se puede seguir llenando el antiguo campo `amenidades[]` con nombres para consumers legacy, pero preferible mantener solo `etiquetas[]` (el frontend usará este). |
| `backend/src/seeders/tagSeeder.js` | **NUEVO**. Seed inicial: insertar 18 etiquetas reales hardcodeadas (las ya mostradas fallback + extras: `Cama Queen Size, TV Smart TV 43", Aire acondicionado, Wi-Fi 100 Mbps, Escritorio, Baño con ducha, Cafetera, Toallas premium, 2 camas Dobles, Sofá auxiliar, Balcón privado, Smart TV 50", Minibar, Baño con tina, Secadora de cabello, Caja fuerte, Cama King Size, Jacuzzi privado, ...`) para que administrador ya tenga catálogo base y así no tenga que crear desde cero. |

### Frontend (Nuevos 5 + Modificados 9 = 14 archivos)
| Archivo | Cambio |
|---|---|
| `frontend/src/types/index.ts` | **MODIFICAR**. Añadir `interface Tag { id, nombre, descripcion?, createdAt? }`. Room `etiquetas?: Tag[]` (mantener amenidades/descripcion por legacy fallback). Payloads `CreateRoomPayload` añadir `descripcion: string` + `tag_ids?: string[]`; `UpdateRoomPayload` igual. |
| `frontend/src/services/tag.service.ts` | **NUEVO**. axios CRUD: `getAll, create, update, remove(id)`. |
| `frontend/src/services/room.service.ts` | **MODIFICAR**. `create()` y `update()` enviar `descripcion` y `tag_ids[]` en el body JSON. |
| `frontend/src/hooks/query/useTags.ts` | **NUEVO**. `useTags(query)` + `useCreateTag(options)` + `useUpdateTag(options)` + `useDeleteTag(options)` con invalidaciones `queryKeys.tags.*` y optimistic updates. |
| `frontend/src/hooks/query/queryKeys.ts` | **MODIFICAR** (si no existe crear). Añadir `tags` namespace: `tags.lists()` / `tags.detail(id)`. |
| `frontend/src/components/ui/Textarea.tsx` | **NUEVO**. Componente `<Textarea label placeholder error {...register}>` con misma API visual que `<Input>` (label arriba, mensaje error rojo abajo, clases tailwind consistentes, `rows={3-5}`). |
| `frontend/src/components/TagSelector.tsx` | **NUEVO**. Multi-select tags: (1) botón desplegable searchable lista etiquetas del backend; (2) chips seleccionados con `x` para eliminar; (3) botón `+ Nueva etiqueta` inline abre `TagModal` para añadir al vuelo y refrescar selector. UX: wrap chips 4 cols responsive. |
| `frontend/src/components/TagModal.tsx` | **NUEVO**. Dialog CRUD igual que RoomModal: create/edit con 2 campos (`nombre` Input + `descripcion` Textarea) + footer Cancelar/Guardar. Reutilizable (props: open/onClose/initialValue/onSubmit/isLoading). |
| `frontend/src/components/RoomModal.tsx` | **MODIFICAR**. Formulario añadir (row 100%): `<Textarea descripcion rows={4} placeholder="Descripción detallada de la habitación..." min(10) required>` + `<TagSelector value={formValues.tag_ids} onChange={ids => setValue('tag_ids', ids)} />` tanto en CREATE como en EDIT mode. Zod `createRoomSchema` extender: `descripcion: z.string().min(10, "Descripción al menos 10 caracteres").max(2000)`, `tag_ids: z.array(z.string().uuid()).optional()`. Payload en `handleValidSubmit` enviar `descripcion + tag_ids`. |
| `frontend/src/app/(site)/dashboard/admin/page.tsx` | **MODIFICAR**. Añadir Tabs UI (2 tabs) en la parte superior: **1. Habitaciones** (contenido actual: header + stats + botón crear + grid RoomCards admin actions) y **2. Etiquetas** (nuevo contenido: heading "Catálogo de etiquetas" + Button "Nueva etiqueta" + Tabla/Botroller lista chips (nombre, descripción, acciones Editar/Eliminar) con confirmación Dialog antes de borrar (igual que delete room)). |
| `frontend/src/components/RoomCard.tsx` | **MODIFICAR**. Render amenidades: reemplazar `enhanced.amenidades.slice(0,4)` por **prioridad 1** `room.etiquetas?.map(t => t.nombre).slice(0,4)`, **prioridad 2** `enhanced.amenidades.slice(0,4)` (fallback hardcodeado por tipo, para habitaciones sin etiquetar). Esto garantiza backwards compatible (todas las habitaciones existentes siguen viéndose bien). |
| `frontend/src/app/(site)/page.tsx` | **MODIFICAR**. Dialog detalle habitación LG (grid amenidades): misma lógica prioridad `room.etiquetas` reales → else fallback `getRoomAmenidades`. |
| `frontend/src/lib/utils.ts` | **MODIFICAR**. `getRoomAmenidades(room)`: primero `if (Array.isArray(room.etiquetas) && room.etiquetas.length > 0) return room.etiquetas.map(t => String(t.nombre));` luego fallback actual por tipo. `getRoomDescripcion`: ya tenía `if (room.descripcion) return room.descripcion;` → CORRECTO no cambiar. `enrichRoomWithMedia`: priorizar `etiquetas` para no sobrescribir reales con fallback hardcodeado. |
| `frontend/src/components/index.ts` | **MODIFICAR**. Barrel exports: `Textarea, TagSelector, TagModal`. |
| `frontend/src/hooks/index.ts` | **MODIFICAR**. Barrel exports: `useTags, useCreateTag, useUpdateTag, useDeleteTag` (types). |

---

## Implementation Steps (Orden dependencias estricto)

### Fase 1 — Backend: Schema & API (BD + endpoints)
1. **Modelos + Relaciones**: Crear `Tag.js` + `HabitacionEtiqueta.js` pivot. Modificar `Room.js` añadir `descripcion TEXT NOT NULL DEFAULT ''` y belongsToMany. Actualizar barrel `models/index.js` exports + Tag.belongsToMany(Room).
2. **Repositorio + Servicio Tags**: Crear `tag.repository.js` (CRUD unique name check) + `tag.service.js` (validaciones nombre, errores Conflict/NotFound).
3. **Controlador + Rutas Tags**: Crear `tag.controller.js` + `tag.routes.js` con permisos `verifyToken + isAdmin` mutaciones, index público. Montar `tag.routes` en `app.js`.
4. **Extender Rooms**: Modificar `room.repository.js` eager include etiquetas. Modificar `room.service.js` create/update aceptar `descripcion` + `tag_ids[]` (transaccional setEtiquetas). Actualizar `room.controller.js serializeRoom` no romper.
5. **Seed Inicial**: Crear `seeders/tagSeeder.js` con catálogo ~18 etiquetas base.
6. **Run migrate**: Ejecutar `cd backend ; node --env-file=.env sync-db.js --alter` → comprobar tablas `etiquetas` + `habitaciones_etiquetas` + `habitaciones.descripcion` creadas. Ejecutar seed.

### Fase 2 — Frontend: Types, Services, Hooks
7. **Actualizar Types** `types/index.ts`: Tag interface, Room etiquetas, payloads create/update.
8. **Services**: Crear `tag.service.ts`, actualizar `room.service.ts` enviar descripcion/tag_ids.
9. **Hooks**: Actualizar `queryKeys.ts`, crear `useTags.ts` (queries + 3 mutations optimistic updates + invalidaciones cruzadas rooms.lists()/rooms.detail() al asociar etiquetas — porque cuando admin crea/edita una habitación las tarjetas reflejen los tags inmediatamente).
10. **Nuevos componentes UI**: Textarea.tsx + TagSelector.tsx (chips + dropdown + "+ Nueva etiqueta") + TagModal.tsx CRUD.

### Fase 3 — Integración UI
11. **RoomModal**: Añadir campo descripcion Textarea + TagSelector, actualizar zod schema, enviar payload con descripcion+tag_ids.
12. **Dashboard Admin**: Tabs Habitaciones/Etiquetas; tab etiquetas (crear, listar tabla, editar, eliminar confirm).
13. **Visualización (Card + Home Detalle)**: Actualizar RoomCard, page.tsx detalle Dialog, utils `getRoomAmenidades/enrichRoomWithMedia` prioridad tags reales → fallback hardcode.

### Fase 4 — Validación y Quality Gates
14. Syntax check backend (`node --check *.js` 0 errores), Typecheck frontend (`tsc --noEmit 0`), vitest 22/22, build Next OK.
15. **Smoke tests E2E funcionales**:
   a. Tabla `etiquetas` existe MySQL con índice unique nombre, pivot `habitaciones_etiquetas` PK + FKs CASCADE.
   b. CRUD `/api/v1/tags`: ADMIN 201/200, RECEPCIÓN devuelve 403, nombre duplicado 409 Conflict.
   c. Crear habitación nueva (formulario 6 campos: numero/tipo/precio/estado/descripcion/etiquetas) → 201 Created + `room.etiquetas[]` asociadas.
   d. Editar habitación existente (sin etiquetas): asignar 5 etiquetas → guardar → RoomCard muestra 4 tags REALES (no fallback).
   e. Eliminar habitación → pivot rows desaparecen (CASCADE). Eliminar una etiqueta → desasociación automática.
   f. Habitaciones antiguas sin etiquetar → siguen mostrando los fallbacks hardcodeados por tipo (Cama Queen, Wi-Fi 100, etc.) — BACKWARD COMPATIBLE ✅.

---

## Dependencies and Considerations
- **Campo descripción OBLIGATORIO usuario**. Pero al hacer `sync-db --alter` hay habitaciones existentes sin valor. **Mitigación**: `descripcion TEXT NOT NULL DEFAULT ''` (permite ALTER sin romper) y validación front+back en creación `z.string().min(10)` (el admin no podrá enviar vacía al crear habitación nueva, aunque las antiguas permanezcan con "" y `getRoomDescripcion` las complete por fallback tipo).
- **Nombre de etiqueta único**: Normalización `trim()`. Service emite `ConflictError` 409 con mensaje claro.
- **ON DELETE CASCADE pivot**: Al eliminar habitación o al eliminar etiqueta, las filas through se borran automáticamente sin necesidad de código adicional.
- **UX TagSelector**: Opción `+ Nueva etiqueta` inline. Admin no necesita cambiar de pestaña para añadir un tag nuevo que no exista mientras crea/edita habitación → flujo cómodo.
- **Stale times**: `tags.list` staleTime 5 minutos (casi nunca cambian). `rooms.list` 2 minutos (igual que actualmente).
- **Optimistic updates**: Delete Tag → elimina fila inmediatamente, onError rollback. Set etiquetas en habitación → actualiza cache room.detail al toque (sin esperar refetch).

---

## Validation (Checklist)
- [ ] **BD**: `DESCRIBE habitaciones` muestra `descripcion TEXT NOT NULL DEFAULT ''`. `SHOW CREATE TABLE etiquetas` unique nombre. `habitaciones_etiquetas` PK(habitacion_id, etiqueta_id).
- [ ] **Endpoints**: POST/PATCH/DELETE tags ADMIN 2xx; RECEPCIÓN 403; mismo nombre 409.
- [ ] **Form crear habitación**: 6 campos (numero/tipo/precio/estado/descripcion/etiquetas) + validaciones 10 car descripción + tags seleccionables chips.
- [ ] **Dashboard Etiquetas**: Pestaña 2, listar, crear, editar, eliminar (confirmación dialog).
- [ ] **RoomCard inventario**: Etiquetas REALES si existen. Fallback hardcodeado si no. Sin errores.
- [ ] **Detalle Home (público)**: Mismo comportamiento que RoomCard (tags reales > fallback).
- [ ] **0 TS errors** frontend. `npm run build` compilado OK. `npx vitest run` 22/22 PASS.
- [ ] **0 Syntax errors** backend JS. Smoke test server start OK (sin fallos import).

---

## Risks & Fallbacks
| Riesgo | Impacto | Mitigación / Fallback |
|---|---|---|
| `sync-db --alter` MySQL no permite agregar `NOT NULL` con datos existentes | 💥 Alto | Usar `NOT NULL DEFAULT ''` (MySQL lo permite). Si aún falla, 2 pasos: 1 `ALTER ADD descripcion TEXT NULL`, 2 `UPDATE habitaciones SET descripcion='' WHERE descripcion IS NULL`, 3 `ALTER MODIFY descripcion TEXT NOT NULL DEFAULT ''`. |
| Seed etiquetas se ejecuta 2 veces y viola unique nombre | 🟡 Medio | Seed usa `bulkCreate({ ignoreDuplicates: true })` (Sequelize `updateOnDuplicate: false`/`ignoreDuplicates`) → solo inserta las que no existan. Idempotente. |
| Admin elimina una etiqueta en uso por 10 habitaciones | 🟡 Medio | El Dialog de confirmar delete muestra: "Esta etiqueta está asociada a X habitaciones, ¿eliminar? Se desasignará automáticamente". El valor X lo calcula con `count by pivot` antes de mostrar confirm. (Si da tiempo, si no: Dialog normal "Está seguro?") |
| RoomModal se llena demasiado (descripcion + tags + uploader → scroll) | 🟢 Bajo | Se aplicó antes el fix Dialog flex-col max-h-[90vh] body scroll, footer sticky. Sigue funcionando. Si es necesario subir `lg → xl` edit size pero dialog scroll ya lo soluciona. |
| Frontend antiguo consumer no actualiza `room.etiquetas` undefined | 🟡 Medio | Legacy fallback `if (!etiquetas?.length) return roomTypeMedia[tipo].amenidades` = 100% backwards compatible. Ninguna habitación se verá vacía. |
