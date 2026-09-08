# Plan de Implementación — Gestión Imágenes Habitaciones

- **Espejo spec**: `.trae/specs/20260907-gestion-imagenes-habitaciones/spec.md`
- **Cobertura**: Todos los AC-R y AC-X del spec.

> Notación: TR = Test Requirement local por tarea (rule / rubric).

---

## Task 1: Setup backend — instalar deps + tabla Sequelize `RoomImage`

**Descripción**: Añadir modelo `RoomImage.js`, asociaciones `Room ↔ RoomImage`, actualizar `sync-db.js` para que cree la tabla y relaciones, instalar `multer`, `sharp`, `file-type`, `fs-extra`. Agregar `backend/uploads/` a `.gitignore`.

**Prioridad**: `high`
**Status**: `pending`
**Dependencias**: —
**Implementación read-first**: `backend/src/models/Room.js`, `backend/src/models/index.js`, `backend/sync-db.js`, `backend/.gitignore`, `backend/package.json`

**TRs**:
- **T1-R1 (rule)**: `RoomImage.init()` define TODOS los campos del FR-B1. Evidencia: `cat RoomImage.js` contiene `id, habitacion_id, ruta_original, ruta_web, ruta_miniatura, nombre_original, tamano_original_bytes, tipo_mime, es_principal, orden, timestamps`.
- **T1-R2 (rule)**: `Room.hasMany(RoomImage, { as: 'imagenes', onDelete: 'CASCADE' })` y `RoomImage.belongsTo(Room)` registrados en `models/index.js`.
- **T1-R3 (rule)**: Carpeta `backend/uploads` existe y está en `.gitignore` (no commitear).
- **T1-R4 (rule)**: `GET /rooms/:id` ahora hace `include: [{ model: RoomImage, as: 'imagenes', order: [...] }]`.
- **T1-X1 (rubric)**: Código idéntico estilo a `User.js` / `Reservation.js` existentes (nombres as, camelCase, etc.). ≥ 2/3.

---

## Task 2: Backend — Storage service + middleware validación archivos (multer + magic number)

**Descripción**: Crear `backend/src/services/storage.service.js` con: `ensureDir`, `sanitizeFilename`, `generateStoragePaths`, `deleteRoomImageFiles`. Crear `backend/src/middlewares/upload.middleware.js` que usa `multer` (memory storage, 10MB limit, 20 files). Validación magic-number con `file-type.fromBuffer()`.

**Prioridad**: `high`
**Status**: `pending`
**Dependencias**: Task 1

**TRs**:
- **T2-R1 (rule)**: `multer` está configurado con `storage: memoryStorage`, límites 10MB/file y 20 files max. `LIMIT_UNEXPECTED_FILE` y `LIMIT_FILE_SIZE` mapean a `BadRequestError`.
- **T2-R2 (rule)**: Antes de guardar en disco, `validateImageBuffer(buffer)` devuelve `{ ok, mime, ext }` o lanza `BadRequestError`. Chequea `file-type` Y whitelist mime: `image/jpeg`, `image/png`, `image/webp`.
- **T2-R3 (rule)**: `nombre_original` se sanitiza antes de insertar en BD.
- **T2-R4 (rule)**: Sharp produce 3 archivos: original (copy buffer), `web` (1600 ancho max, fit inside, sin upscale, quality 82 jpeg/webp según input), `thumb` (320px ancho, quality 80).
- **T2-R5 (rule)**: Cuando falla `sharp` o `mkdir` se hace rollback archivos ya creados en la transacción.
- **T2-X1 (rubric)**: Legibilidad del storage service (funciones puras, nombres claros, catch manejados). ≥ 3/3.

---

## Task 3: Backend — Image Controller + Repository + Service + Rutas

**Descripción**: Crear `room-image.controller.js`, `room-image.repository.js`, `room-image.service.js`, `room-image.routes.js`. Registrar rutas en `routes/index.js` bajo `/rooms/:habitacionId/images` con `verifyToken, isAdmin`. Implementar 5 operaciones: upload, reorden, setMain, removeById, list (ya incluida en rooms/:id).

**Prioridad**: `high`
**Status**: `pending`
**Dependencias**: Task 2

**TRs**:
- **T3-R1 (rule)**: `POST /:habitacionId/images` sube lote. Responde `201 data: RoomImage[]`.
- **T3-R2 (rule)**: `PATCH /:habitacionId/images/order` recibe `ids: string[]` y actualiza `orden` en BD; retorna `200 data: RoomImage[]`.
- **T3-R3 (rule)**: `PATCH /:habitacionId/images/:id/set-main` pone `es_principal = true` en la imagen, `es_principal = false` en las demás de la habitación (transacción).
- **T3-R4 (rule)**: `DELETE /:habitacionId/images/:id` borra 3 archivos + 1 fila BD. Si habitación no tiene ya principal y la que se borró lo era: no se asigna otra (dejar que usuario marque), pero sin romper.
- **T3-R5 (rule)**: Todos los nuevos endpoints pasan por `verifyToken` + `isAdmin`; 401/403 correctas.
- **T3-R6 (rule)**: `/api/v1/uploads` servido estáticamente; se puede GET cualquier `ruta_original/web/thumb` generada.
- **T3-R7 (rule)**: `RoomService.getAll` / `getById` devuelven `imagenes` dentro del objeto Room ordenado por `orden ASC`.
- **T3-X1 (rubric)**: Estructura de archivos igual a pattern existente `reservation.* / user.*` repositories/services/controllers/routes. ≥ 4/5.

---

## Task 4: Frontend — Tipos + room.service (métodos imagen) + queryKeys + useRooms hooks

**Descripción**: Añadir a `types/index.ts`: interface `RoomImage`. Añadir a `services/room.service.ts`: `uploadImages(id, formData, onProgress?)`, `reorderImages(id, ids[])`, `setMainImage(id, imageId)`, `deleteImage(id, imageId)`. Añadir mutaciones en `hooks/query/useRooms.ts` con invalidación `rooms.all + rooms.one(id)`.

**Prioridad**: `high`
**Status**: `pending`
**Dependencias**: Task 3 (necesita endpoint listos para tipar)

**TRs**:
- **T4-R1 (rule)**: `RoomImage` type = match 1:1 con campos BD.
- **T4-R2 (rule)**: `room.service.ts` tiene 4 métodos imagen definidos con tipos.
- **T4-R3 (rule)**: `useUploadImages` / `useReorderImages` / `useSetMainImage` / `useDeleteRoomImage` mutaciones con `onSuccess` que invalidan `queryKeys.rooms.one(id)`.
- **T4-R4 (rule)**: Upload usa `FormData` nativo + `axios`, `onUploadProgress` callback expuesto al componente.
- **T4-X1 (rubric)**: Consistencia hooks con `useCreateReservation` pattern. ≥ 4/5.

---

## Task 5: Frontend — Componente `RoomImageUploader.tsx`

**Descripción**: Nuevo componente reusable. Props: `roomId: string`. Contiene drop-zone (react-dropzone), validaciones previas 10MB + mime, preview `URL.createObjectURL`, lista archivos pendientes con progress individual. Subida lote vía `useUploadImages`.

**Prioridad**: `high`
**Status**: `pending`
**Dependencias**: Task 4

**TRs**:
- **T5-R1 (rule)**: Drag & drop funciona; `isDragActive` visualiza borde punteado azul.
- **T5-R2 (rule)**: Archivos > 10MB marcados en rojo; no se envían al backend.
- **T5-R3 (rule)**: Cada archivo muestra: preview miniatura, nombre, tamaño (KB/MB MB formateado), barra `<progress>` actualizada por `onUploadProgress`.
- **T5-R4 (rule)**: Errores por archivo (rechazado backend) se muestran inline.
- **T5-R5 (rule)**: Al finalizar la subida, se limpia la lista de pendientes; se muestra toast "X imágenes subidas correctamente".
- **T5-R6 (rule)**: Limpia `revokeObjectURL` en `useEffect cleanup`.
- **T5-X1 (rubric)**: UX / Responsive AC-X1. ≥ 4/5.
- **T5-X2 (rubric)**: Coherencia UI AC-X2. ≥ 2/3.

---

## Task 6: Frontend — Grilla gestionar imágenes existentes + `RoomImageGrid.tsx` con dnd-kit reorder

**Descripción**: Componente grilla (sortable) con imagenes de `room.imagenes`. Tres acciones por card: `SetMain` (⭐), `Eliminar` (Dialog confirm), drag handle para reordenar. Uso `@dnd-kit/sortable`. Integración con mutaciones de Task 4.

**Prioridad**: `high`
**Status**: `pending`
**Dependencias**: Task 4, Task 5

**TRs**:
- **T6-R1 (rule)**: Grilla responsive 1/2/3 columnas según ancho.
- **T6-R2 (rule)**: Drag-handle visible; drag & drop cambia la posición visual y envía PATCH order; optimistic update.
- **T6-R3 (rule)**: `Establecer como principal` marca estrella, desmarca anterior, sync backend vía `useSetMainImage`.
- **T6-R4 (rule)**: Eliminar pide confirmación; luego dispara DELETE y actualiza grilla.
- **T6-R5 (rule)**: Imagen principal = badge `⭐ Principal` + borde highlight color primario.
- **T6-R6 (rule)**: Si no hay imágenes muestra estado vacío: `📷 Esta habitación no tiene imágenes aún. Sube la primera arriba.`.
- **T6-X1 (rubric)**: Coherencia visual AC-X2. ≥ 2/3.

---

## Task 7: Frontend — Integrar `RoomImageUploader + RoomImageGrid` en `RoomModal.tsx`

**Descripción**: Condición `if (initialValue)` (modo edit) renderiza nueva sección: `Imágenes de la habitación`. Añade uploader + grid. En modo create: texto helper `"Una vez creada la habitación puedes editarla para agregar imágenes."`.

**Prioridad**: `high`
**Status**: `pending`
**Dependencias**: Task 5, Task 6

**TRs**:
- **T7-R1 (rule)**: Modo create NO muestra grid ni uploader; muestra helper.
- **T7-R2 (rule)**: Modo edit muestra ambos componentes y refresca imágenes cuando suben/eliminan.
- **T7-R3 (rule)**: `RoomModal` no rompe el `onSubmit` original (submit sigue guardando numero/tipo/precio sin tocar imágenes).
- **T7-R4 (rule)**: Dashboard admin `/dashboard/admin` al renderizar `RoomModal` ya obtiene imágenes actualizadas al recargar lista porque `useRooms.getAll` invalida.
- **T7-X1 (rubric)**: UI coherente AC-X2. ≥ 3/3.

---

## Task 8: Backend + Frontend — Seguridad final, integración Home, smoke tests manuales

**Descripción**: Verificar que RoomCard lee de `room.imagenes[]` reales y deja de usar el enricher cuando hay datos. Ajustar permisos `uploads/` en Express (helmet `contentSecurityPolicy` permite imágenes self). `ensure-db.js` y `sync-db.js` sincroniza la tabla. Documentar `.env.example` si hay nuevos vars (STORAGE_PATH).

**Prioridad**: `medium`
**Status**: `pending`
**Dependencias**: Task 3, Task 7

**TRs**:
- **T8-R1 (rule)**: Login Huesped → Home → habitación con imágenes subidas → ImageCarousel muestra las reales.
- **T8-R2 (rule)**: Intentar subir archivo con extensión `.jpg` pero binario PDF (renombrado) → bloqueado.
- **T8-R3 (rule)**: Eliminar habitación → archivos eliminados de uploads.
- **T8-R4 (rule)**: Usuario RECEPCIÓN intenta POST imagenes → 403.
- **T8-R5 (rule)**: `npm run dev` (backend + frontend) no muestra warnings en consola.
- **T8-X1 (rubric)**: Seguridad uploader AC-X3 = 3/3.

---

## Task 9: Verificación final independiente (Review)

**Descripción**: Run `typecheck` frontend, lint básico, `npm run build` sin errores. Ejecutar checklist ACs spec.

**Prioridad**: `high`
**Status**: `pending`
**Dependencias**: Tasks 1–8

---

# Estado del Plan

## Resumen status actual

| # Task | Estado |
|---|---|
| 1 | pending |
| 2 | pending |
| 3 | pending |
| 4 | pending |
| 5 | pending |
| 6 | pending |
| 7 | pending |
| 8 | pending |
| 9 | pending |

### Blocked / Cancelled items

- Ninguno.
