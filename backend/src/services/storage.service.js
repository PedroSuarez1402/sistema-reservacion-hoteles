import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const UPLOADS_ROOT = path.join(PROJECT_ROOT, 'uploads');
const ROOMS_UPLOADS = path.join(UPLOADS_ROOT, 'rooms');

const WEB_MAX_WIDTH = 1600;
const WEB_QUALITY = 82;
const THUMB_MAX_WIDTH = 320;
const THUMB_QUALITY = 80;

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function ensureRoomDir(roomId) {
  const base = path.join(ROOMS_UPLOADS, String(roomId));
  const original = path.join(base, 'original');
  const web = path.join(base, 'web');
  const thumb = path.join(base, 'thumb');
  ensureDirSync(original);
  ensureDirSync(web);
  ensureDirSync(thumb);
  return { base, original, web, thumb };
}

export function sanitizeFilename(original) {
  if (!original) return 'archivo';
  let name = String(original);
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot >= 0 ? name.slice(lastDot + 1).toLowerCase() : '';
  const stem = lastDot >= 0 ? name.slice(0, lastDot) : name;
  const safe = stem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'archivo';
  return ext ? `${safe}.${ext}` : safe;
}

export function generateStoragePaths(roomId, ext) {
  const dirs = ensureRoomDir(roomId);
  const uuid = randomUUID();
  const safeExt = (ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const fileName = `${uuid}.${safeExt}`;
  const originalAbs = path.join(dirs.original, fileName);
  const webAbs = path.join(dirs.web, fileName);
  const thumbAbs = path.join(dirs.thumb, fileName);
  const baseRel = path.relative(PROJECT_ROOT, dirs.base).split(path.sep).join('/');
  return {
    originalAbs,
    webAbs,
    thumbAbs,
    rutaOriginal: `${baseRel}/original/${fileName}`,
    rutaWeb: `${baseRel}/web/${fileName}`,
    rutaMiniatura: `${baseRel}/thumb/${fileName}`,
  };
}

export function deleteIfExists(absPath) {
  try {
    if (absPath && fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch {
    // ignore
  }
}

export function deleteRoomImageFiles(pathsObj) {
  if (!pathsObj) return;
  if (pathsObj.originalAbs) deleteIfExists(pathsObj.originalAbs);
  if (pathsObj.webAbs) deleteIfExists(pathsObj.webAbs);
  if (pathsObj.thumbAbs) deleteIfExists(pathsObj.thumbAbs);
}

export function deleteRoomFolder(roomId) {
  if (!roomId) return;
  const base = path.join(ROOMS_UPLOADS, String(roomId));
  try {
    if (fs.existsSync(base)) {
      fs.rmSync(base, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }
}

export async function processImageBuffer(buffer, pathsObj, mime) {
  const isPng = mime === 'image/png';
  const sharpInst = sharp(buffer, { failOnError: false }).rotate();

  await Promise.all([
    sharp(buffer, { failOnError: false }).rotate().toFile(pathsObj.originalAbs),
    sharpInst
      .clone()
      .resize(WEB_MAX_WIDTH, undefined, { withoutEnlargement: true, fit: 'inside' })
      [isPng ? 'png' : 'jpeg']({ quality: isPng ? 90 : WEB_QUALITY })
      .toFile(pathsObj.webAbs),
    sharpInst
      .clone()
      .resize(THUMB_MAX_WIDTH, undefined, { withoutEnlargement: true, fit: 'inside' })
      [isPng ? 'png' : 'jpeg']({ quality: isPng ? 88 : THUMB_QUALITY })
      .toFile(pathsObj.thumbAbs),
  ]);
}

export function resolvePublicUrl(relativePath) {
  if (!relativePath) return '';
  let clean = String(relativePath).replace(/^\/+/, '');
  if (clean.startsWith('uploads/')) {
    clean = clean.slice('uploads/'.length);
  }
  return `/api/uploads/${clean}`;
}

export default {
  ensureRoomDir,
  sanitizeFilename,
  generateStoragePaths,
  deleteRoomImageFiles,
  deleteRoomFolder,
  processImageBuffer,
  resolvePublicUrl,
  UPLOADS_ROOT,
  PROJECT_ROOT,
};
