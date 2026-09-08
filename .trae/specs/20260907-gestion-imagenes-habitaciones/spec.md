# Especificación — Gestión Completa de Imágenes de Habitaciones

- **Versión**: 1.0
- **Fecha**: 2026-09-07
- **Área**: Backend (API) + Frontend (Dashboard Admin > Habitaciones > Editar)
- **Idioma UI / Especificación**: Español

---

## 1. Contexto y Problema

El módulo de inventario de habitaciones del dashboard de administración (`/dashboard/admin`) actualmente permite crear/editar/eliminar habitaciones pero **no existe forma de adjuntar imágenes**. La visualización de la galería de fotos implementada recientemente en `Home` (RoomCard + ImageCarousel) usa placeholders generados vía URL porque no hay datos persistidos.

El objetivo es:
1. **Persistir** imágenes asociadas a cada habitación en disco + BD, con relación 1:N.
2. **Subir** imágenes en el formulario de edición de habitación (RoomModal) como ADMIN.
3. **Gestionarlas**: marcar imagen principal, reordenar visualización, eliminar.
4. **Procesarlas**: generar miniatura + versión web optimizada además del original.
5. **Seguridad**: autenticación obligatoria (solo ADMIN), validación tipo/tamaño, escaneo magic-number (no solo extensión).

---

## 2. Usuarios y Roles

| Actor | Acciones permitidas |
|---|---|
| ADMIN | Subir, reordenar, marcar principal, eliminar imágenes de cualquier habitación |
| RECEPCIÓN | **Ninguna** (sin permisos; solo lectura). Se alinea con restricción actual de `update / delete` habitación que es `isAdmin`. |
| HUÉSPED / NO AUTENTICADO | **Ninguna** (solo lectura de imágenes ya publicadas en la Home) |

---

## 3. Objetivos (Goals)

- **G1**: Cualquier habitación puede tener de 0 a N imágenes asociadas (1:N) con orden explícito y una única imagen principal.
- **G2**: Subida drag&drop + selector de archivos (múltiple) con validación inmediata en cliente.
- **G3**: Procesamiento automático en servidor de miniatura + versión web optimizada.
- **G4**: CRUD endpoints robustos con autenticación/autorización + validación archivos (magic number + tamaño 10MB).
- **G5**: Integración transparente con Home (RoomCard + ImageCarousel ya existente) — empiezan a renderizar las imágenes reales sin cambios adicionales de código UI.
- **G6**: Zero downtime en BD — usa `ALTER TABLE / CREATE TABLE` incremental que corre al iniciar el server.

## 4. No objetivos (Non-Goals)

- ❌ Integración con buckets cloud (S3 / Cloudinary / R2) en esta entrega; solo storage local `backend/uploads/`.
- ❌ Editor de imágenes (crop / rotate / filters) en frontend.
- ❌ Tags / metadatos EXIF custom.
- ❌ Versión móvil nativa.
- ❌ Galería vista solo en dashboard recepción (lo usa ADMIN).
- ❌ Historial de versiones de imágenes.

---

## 5. Requisitos Funcionales (FR)

### Backend — Base de datos

- **FR-B1**: Debe existir una tabla `imagenes_habitacion` en MySQL con los campos:
  - `id` (UUID, PK)
  - `habitacion_id` (UUID, FK a `habitaciones.id`, NOT NULL, ON DELETE CASCADE)
  - `ruta_original` (VARCHAR 512, NOT NULL)
  - `ruta_web` (VARCHAR 512, NOT NULL)
  - `ruta_miniatura` (VARCHAR 512, NOT NULL)
  - `nombre_original` (VARCHAR 255, NOT NULL)
  - `tamano_original_bytes` (BIGINT UNSIGNED, NOT NULL)
  - `tipo_mime` (VARCHAR 50, NOT NULL)
  - `es_principal` (TINYINT(1)/BOOLEAN, default false, NOT NULL)
  - `orden` (INT UNSIGNED, default 0, NOT NULL)
  - `created_at`, `updated_at` (TIMESTAMP, Sequelize defaults)
- **FR-B2**: Relación Sequelize `Room.hasMany(RoomImage, { as: 'imagenes', foreignKey: 'habitacion_id', onDelete: 'CASCADE' })` y `RoomImage.belongsTo(Room, { as: 'habitacion' })`.
- **FR-B3**: Única imagen principal por habitación. `GET /rooms` y `GET /rooms/:id` deben devolver las habitaciones con su `imagenes[]` ordenado por `orden ASC, created_at ASC`.

### Backend — Storage & Procesamiento

- **FR-B4**: Almacenamiento local en `backend/uploads/` con estructura:
  - `backend/uploads/rooms/<habitacion_id>/original/<UUID>.<ext>`
  - `backend/uploads/rooms/<habitacion_id>/web/<UUID>.<ext>` (optimizada, calidad 82%)
  - `backend/uploads/rooms/<habitacion_id>/thumb/<UUID>.<ext>` (320px ancho, calidad 80%)
- **FR-B5**: Exposición estática de la carpeta `uploads` vía `express.static('/api/v1/uploads', ...)` con URL base `GET /api/v1/uploads/rooms/...`.
- **FR-B6**: Procesamiento con `sharp` en formato de salida: `JPEG` si input JPEG, `WEBP` en otros casos. La miniatura y la web se entregan en WEBP si sharp lo permite.
- **FR-B7**: Cleanup: al eliminar una imagen de la BD o al eliminar la habitación, borrar los 3 archivos (original/web/thumb) del sistema de archivos.

### Backend — Validaciones

- **FR-B8**: Cada imagen individual NO debe superar los **10 MB**. Request multipart con máximo 20 archivos por llamada.
- **FR-B9**: Solo se aceptan formatos **JPG / JPEG / PNG / WebP** detectados por:
  1. Extensión en whitelist.
  2. Magic numbers en los **primeros bytes** del buffer (no confiar solo en la extensión ni en `mimetype` del browser).
- **FR-B10**: Si cualquiera de los N archivos falla la validación, la transacción completa de subida de ese lote falla. Ningún archivo se guarda en disco. Retornar `400` con array `errors[]` por archivo.
- **FR-B11**: Sanitización de `nombre_original` antes de almacenar. Regex: solo caracteres latinos, números, guiones y guiones bajos; máximo 255 caracteres.

### Backend — Endpoints

Todos los endpoints bajo `/api/v1/rooms/:habitacionId/images`. Todos requieren `verifyToken` + `isAdmin`.

| Método | Endpoint | Payload | Descripción | Código OK |
|---|---|---|---|---|
| `GET` | `/rooms/:id` (ya existe) | - | Devuelve `data.imagenes[]` (sorted) | 200 |
| `POST` | `/rooms/:habitacionId/images` | `multipart/form-data` campo `images` (File[]) | Subir lote, asociar a habitación, asignar orden a continuación de las existentes | 201 |
| `PATCH` | `/rooms/:habitacionId/images/order` | JSON `{ ids: [imgId1, imgId2, ...] }` | Re-ordena (campo `orden` = posición en array) | 200 |
| `PATCH` | `/rooms/:habitacionId/images/:id/set-main` | — | Marca la imagen como principal; la anterior principal se quita | 200 |
| `DELETE` | `/rooms/:habitacionId/images/:id` | — | Borra imagen de BD + 3 archivos del storage | 200 |

### Backend — Seguridad y errores

- **FR-B12**: Middleware auth correcto en todos los nuevos endpoints; `401` sin token, `403` rol no autorizado, `404` habitación no exista, `404` imagen no pertenece a la habitación.
- **FR-B13**: Errores descriptivos consistentes con `ApiErrorResponse` `{ success: false, message: string }`. Nunca leakear rutas absolutas de filesystem.

---

### Frontend — Integración RoomModal

- **FR-F1**: El modal `RoomModal.tsx` debe renderizar una **nueva sección** `Imágenes de la habitación` **SOLO en modo `edit`** (cuando `initialValue` no es nulo). En modo `create` no aparece la sección (la habitación aún no tiene id para asociar imágenes).
- **FR-F2**: La sección de imágenes debe incluir un componente **`RoomImageUploader`** con:
  - Área de drop-zone (`drag&drop`) para archivos múltiples.
  - Botón `Seleccionar archivos` que abre `<input type="file" multiple accept="image/png,image/jpeg,image/webp">`.
  - Texto helper: `"JPG, PNG o WebP. Máx 10MB por archivo."`.
- **FR-F3**: **Previsualización inmediata** en cliente (antes de subir) usando `URL.createObjectURL`. Cada preview muestra: miniatura, nombre original, tamaño formateado.
- **FR-F4**: Validación **previa** en cliente (antes de hacer la llamada):
  - Si un archivo excede 10MB → marca error, no sube ese archivo.
  - Si archivo no está en accept list → error.
- **FR-F5**: Barra de **progreso por archivo** durante el upload (usa `onUploadProgress` de axios / FormData).
- **FR-F6**: Después de una subida exitosa, los archivos nuevos se agregan **instantáneamente** a la grilla (sin refrescar página); react-query invalida la habitación o `useMutation onSuccess` hace update optimista.

### Frontend — Gestión de la grilla

- **FR-F7**: Grilla responsive de imágenes existentes (thumbnails) mostrando:
  - Imagen versión `miniatura` para cargar rápido.
  - Badge "⭐ Principal" en la imagen que tiene `es_principal === true`.
  - Tres acciones por card: `Establecer como principal`, `Eliminar`, y drag-handle para **reordenar**.
- **FR-F8**: **Reordenamiento drag & drop** dentro de la grilla. Al soltar, envía un `PATCH /order` con los IDs ordenados. Optimistic update.
- **FR-F9**: Acción **Eliminar imagen**: modal confirmación ligero (¿Eliminar la imagen? No se puede deshacer.). Elimina BD + storage.
- **FR-F10**: **Acción Establecer principal**: marca estrella; la anterior estrella se quita visualmente + sync backend.
- **FR-F11**: El componente `RoomCard` y el `ImageCarousel` de Home deben empezar a usar las imágenes reales devueltas por el backend (ya tienen lógica `room.imagenes ?? fallback enrichRoomWithMedia`; no hay código extra que escribir).

---

## 6. Requisitos No Funcionales (NFR)

- **NFR-1 (Performance)**:
  - Subida 20 imágenes × 10MB debe completar < 90s en dev (local).
  - Respuesta `GET /rooms` con 30 habitaciones × 5 imágenes cada una debe responder en < 300ms.
- **NFR-2 (Seguridad)**:
  - Todo endpoint de mutación de imágenes requiere token válido + rol `ADMIN`.
  - No ejecutar `eval`, `child_process`, ni extraer contenido EXIF.
  - Los archivos subidos **NO** son ejecutables: carpeta `uploads` servida con `Content-Type` estricto (no `application/octet-stream` por defecto) + sin `x-content-type-options: nosniff` removido (mantener).
  - Los nombres de archivos generados por el servidor usan UUID, no `nombre_original` (previene path traversal).
- **NFR-3 (Compatibilidad browsers)**: Chrome 120+, Edge 120+, Safari 17+, Firefox 120+. Drag&drop HTML5 nativo.
- **NFR-4 (a11y)**: Drop-zone con `role="button"`, `aria-label`, `aria-describedby`; botones con tooltip visible en foco; mensajes de error live-region.
- **NFR-5 (Responsive)**: Uploader + grilla responsive mobile (1 columna < 640px, 2 cols < 1024, 3 cols ≥ 1024).
- **NFR-6 (Persistencia)**: Todos los nuevos campos se crean vía Sequelize `sync({ alter: true })` o migration-style helper incluido en `backend/sync-db.js` ya existente.

---

## 7. Restricciones / Dependencias / Suposiciones

### Dependencias nuevas que se instalarán

| Lado | Paquete | Propósito |
|---|---|---|
| Backend | `multer` | Parseo multipart/form-data |
| Backend | `sharp` | Generar thumb / web version |
| Backend | `file-type` | Detección mime-type por magic number buffer |
| Backend | `fs-extra` | `mkdirp` + remove seguro (alternativa `node:fs/promises` está OK, decidir implementador) |
| Frontend | `react-dropzone` | Drag & drop + pre-validación mime |
| Frontend | `@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities` | Reordenar la grilla con drag handle |

### Suposiciones

1. Existe `frontend/.env` con `NEXT_PUBLIC_API_URL` y backend cors aceptando origin para multipart.
2. El usuario actual ADMIN ya puede loguearse (no hay cambios en auth).
3. Carpeta `backend/uploads` debe ser agregada a `.gitignore` (no commitear archivos user-uploaded).

---

## 8. Preguntas abiertas / Decisiones registradas

| # | Tema | Decisión final (antes aprobación) |
|---|---|---|
| 1 | Storage local vs. cloud | **Local** (asumido por cero credenciales). En producción cambiar provider. |
| 2 | Subir imágenes **antes** de guardar habitación nueva (modo create)? | **No** (por la FK `habitacion_id NOT NULL`). Primero crear habitación, luego editarla y subir imágenes. Se explica texto helper en UI. |
| 3 | Máximo número de imágenes por habitación? | **Límite soft 20** en validación frontend + backend. |
| 4 | Orden inicial al subir un lote? | Orden en BD = `último orden existente + 1, +2, ...` respetando el orden en el FormData. |

---

## 9. Criterios de Aceptación (Acceptance Criteria)

**Tipos:**
- `rule`: Condición binaria objetiva (pass / no pass).
- `rubric`: Evaluación cualitativa con escala.

### Reglas

- **AC-R1 (rule)**: Backend tiene tabla `imagenes_habitacion` con todos los campos obligatorios del FR-B1, FK correcta, `ON DELETE CASCADE`. **Evidencia**: `SHOW CREATE TABLE imagenes_habitacion`; o sync-db.js no arroja error con campos verificados via Sequelize describe.
- **AC-R2 (rule)**: `GET /rooms/:id` devuelve `data.imagenes[]` con orden correcto y `es_principal: true` máximo una por habitación. **Evidencia**: curl/Thunder Client.
- **AC-R3 (rule)**: Subida de archivo > 10MB es rechazada tanto en frontend (`toast error`) como en backend (`400 payload too large`). **Evidencia**: Intentar subir ZIP 11MB JPG; backend responde 400.
- **AC-R4 (rule)**: Subida de archivo malicioso con extensión `.jpg` pero payload real PDF o EXE detectado via magic-number: rechazado 400, NADA se guarda en `uploads/`. **Evidencia**: Reproducir con archivo renombrado.
- **AC-R5 (rule)**: Solo usuario `ADMIN` puede `POST / PATCH / DELETE` imágenes. Huésped y recepción reciben `403`. **Evidencia**: Login `recepcion@hotel.com` + POST → 403.
- **AC-R6 (rule)**: Eliminar una habitación elimina en cascada TODOS sus registros de `imagenes_habitacion` y TODOS sus 3 archivos por imagen. **Evidencia**: `ls backend/uploads/rooms/<deleted-id>` → 404 / carpeta vacía borrada.
- **AC-R7 (rule)**: RoomCard en Home muestra imágenes reales del backend en `ImageCarousel` cuando la habitación tiene ≥1 imagen guardada. **Evidencia**: Subir imagen real y refrescar Home; aparece en carrusel.
- **AC-R8 (rule)**: Reordenar la grilla con drag&drop persiste correctamente; orden mostrado = orden mostrado en carrusel Home. **Evidencia**: Reordenar 3 imgs A B C → C A B; Home renderiza C, A, B.
- **AC-R9 (rule)**: Botón "⭐ Principal" funciona; solo una por habitación en todo momento.
- **AC-R10 (rule)**: Barra de progreso visible por archivo durante la subida (0 → 100%).
- **AC-R11 (rule)**: Formato fecha/hora creado en BD, `ruta_web` y `ruta_miniatura` son archivos que existen en disco y se sirven vía `/api/v1/uploads/...`.

### Rúbricas

- **AC-X1 (rubric)**: Calidad UX del Uploader. Escala 0-5. Umbral ≥ 4.
  - 0 = sin UX / errores no visibles.
  - 2 = básico (botón seleccionar, sin drag).
  - 4 = drag&drop, previsualización, progreso, errores inline, textos helper, responsive.
  - 5 = todo lo anterior + accesibilidad labels, drag visual feedback, toast exitoso/fallido, undo temporal opcional.
- **AC-X2 (rubric)**: Coherencia visual / UI con el resto del dashboard. Escala 0-3. Umbral ≥ 2.
  - 0 = diseño totalmente diferente.
  - 2 = reutiliza `Button, Card, Toast, Dialog, Badge, Input` existentes; tailwind tokens primarios.
  - 3 = coherencia 100% (spacings, radius, hover states, focus rings, loading states).
- **AC-X3 (rubric)**: Seguridad / Sanitización del upload. Escala 0-3. Umbral ≥ 3.
  - 1 = solo extensión whitelist.
  - 2 = extension + mimetype browser.
  - 3 = extensión + magic-number real buffer + carpeta sin ejecución + nombres UUID.
