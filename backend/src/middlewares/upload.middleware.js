import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { BadRequestError, InternalServerError } from '../utils/errors.util.js';
import {
  sanitizeFilename,
  generateStoragePaths,
  deleteRoomImageFiles,
  processImageBuffer,
} from '../services/storage.service.js';

const MAX_BYTES_PER_FILE = 10 * 1024 * 1024;
const MAX_FILES = 20;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const memoryStorage = multer.memoryStorage();

const multerRoomImages = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_BYTES_PER_FILE,
    files: MAX_FILES,
  },
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase();
    const name = String(file.originalname || '').toLowerCase();
    const extOk = /\.(jpe?g|png|webp)$/i.test(name);
    const mimeOk = ALLOWED_MIME.has(mime);
    if (!mimeOk || !extOk) {
      return cb(
        new BadRequestError(
          `Archivo "${file.originalname || 'sin nombre'}" no permitido. Solo se aceptan JPG, PNG y WebP.`
        )
      );
    }
    cb(null, true);
  },
});

export function uploadRoomImagesArray(req, res, next) {
  const handler = multerRoomImages.array('images', MAX_FILES);
  handler(req, res, function onDone(err) {
    if (err) {
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return next(
              new BadRequestError(
                `El archivo "${err.field || 'images'}" supera el tamaño máximo de 10MB.`
              )
            );
          case 'LIMIT_FILE_COUNT':
            return next(
              new BadRequestError(`No puedes subir más de ${MAX_FILES} imágenes por solicitud.`)
            );
          case 'LIMIT_UNEXPECTED_FILE':
            return next(
              new BadRequestError(
                `Campo inesperado "${err.field}". Usa el campo "images" para enviar los archivos.`
              )
            );
          default:
            return next(new BadRequestError(`Error al procesar los archivos: ${err.message}`));
        }
      }
      return next(err);
    }
    next();
  });
}

export async function validateImageBuffer(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new BadRequestError('Archivo vacío o inválido');
  }
  if (file.buffer.length === 0) {
    throw new BadRequestError(`El archivo "${file.originalname}" está vacío.`);
  }
  if (file.buffer.length > MAX_BYTES_PER_FILE) {
    throw new BadRequestError(
      `El archivo "${file.originalname}" supera el tamaño máximo de 10MB.`
    );
  }
  const detected = await fileTypeFromBuffer(file.buffer).catch(() => null);
  if (!detected) {
    throw new BadRequestError(
      `No se pudo determinar el tipo del archivo "${file.originalname}". Verifica que sea una imagen válida.`
    );
  }
  const mime = detected.mime.toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new BadRequestError(
      `El archivo "${file.originalname}" tiene contenido no permitido (${mime}). Solo JPG, PNG y WebP.`
    );
  }
  return {
    mime,
    ext: MIME_TO_EXT[mime] || detected.ext || 'jpg',
  };
}

export async function processAndPersistRoomImage(roomId, file, orden, esPrincipal = false) {
  const createdFiles = [];
  try {
    const { mime, ext } = await validateImageBuffer(file);
    const paths = generateStoragePaths(roomId, ext);
    createdFiles.push(paths);
    await processImageBuffer(file.buffer, paths, mime);
    return {
      habitacion_id: roomId,
      ruta_original: paths.rutaOriginal,
      ruta_web: paths.rutaWeb,
      ruta_miniatura: paths.rutaMiniatura,
      nombre_original: sanitizeFilename(file.originalname || 'imagen'),
      tamano_original_bytes: file.buffer.length,
      tipo_mime: mime,
      es_principal: !!esPrincipal,
      orden: Number.isFinite(orden) ? orden : 0,
      _paths: paths,
    };
  } catch (err) {
    createdFiles.forEach(deleteRoomImageFiles);
    throw err;
  }
}

export async function batchProcessRoomImages(roomId, files, startOrden = 0, firstIsMain = false) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new BadRequestError('No se enviaron archivos para procesar');
  }
  if (files.length > MAX_FILES) {
    throw new BadRequestError(`Máximo ${MAX_FILES} imágenes por solicitud`);
  }
  const results = [];
  const rollback = [];
  try {
    for (let i = 0; i < files.length; i += 1) {
      const orden = startOrden + i;
      const esPrincipal = firstIsMain && i === 0;
      const attrs = await processAndPersistRoomImage(roomId, files[i], orden, esPrincipal);
      if (attrs._paths) rollback.push(attrs._paths);
      results.push(attrs);
    }
    return results;
  } catch (err) {
    rollback.forEach(deleteRoomImageFiles);
    if (err instanceof BadRequestError || err.statusCode === 400) throw err;
    throw new InternalServerError('Error al procesar las imágenes: ' + err.message);
  }
}

export default {
  MAX_BYTES_PER_FILE,
  MAX_FILES,
  ALLOWED_MIME,
  uploadRoomImagesArray,
  validateImageBuffer,
  processAndPersistRoomImage,
  batchProcessRoomImages,
};
