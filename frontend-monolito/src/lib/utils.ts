import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Room, RoomImage } from '../types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value);
}

function toLocalDate(date: string | Date): Date {
  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }
  const str = (date || '').trim();
  if (!str) return new Date(NaN);
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (isoDateMatch) {
    const [, y, m, d] = isoDateMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  }
  const d = new Date(str);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function formatDate(date: string | Date): string {
  const d = toLocalDate(date);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

export function calculateNights(fechaInicio: string, fechaFin: string): number {
  const inicio = toLocalDate(fechaInicio);
  const fin = toLocalDate(fechaFin);
  const diffMs = fin.getTime() - inicio.getTime();
  return Math.max(1, Math.round(diffMs / 86400000));
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export const reservationStatusStyles: Record<
  string,
  { label: string; className: string }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    className:
      'bg-amber-100 text-amber-800 border border-amber-200',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    className:
      'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  CANCELADA: {
    label: 'Cancelada',
    className: 'bg-rose-100 text-rose-800 border border-rose-200',
  },
  FINALIZADA: {
    label: 'Finalizada',
    className:
      'bg-slate-100 text-slate-700 border border-slate-200',
  },
};

export const roomStatusStyles: Record<
  string,
  { label: string; className: string }
> = {
  ACTIVA: {
    label: 'Activa',
    className:
      'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  MANTENIMIENTO: {
    label: 'Mantenimiento',
    className: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  ELIMINADA: {
    label: 'Eliminada',
    className: 'bg-slate-200 text-slate-600 border border-slate-300',
  },
};

export const roomTypeLabels: Record<string, string> = {
  SENCILLA: 'Sencilla',
  DOBLE: 'Doble',
  SUITE: 'Suite',
};

export const roleLabels: Record<string, string> = {
  HUESPED: 'Huésped',
  ADMIN: 'Administrador',
  RECEPCION: 'Recepción',
};

export const roleStyles: Record<
  string,
  { label: string; className: string }
> = {
  HUESPED: {
    label: 'Huésped',
    className: 'bg-sky-100 text-sky-800 border border-sky-200',
  },
  ADMIN: {
    label: 'Administrador',
    className: 'bg-purple-100 text-purple-800 border border-purple-200',
  },
  RECEPCION: {
    label: 'Recepción',
    className: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
};

const imagen = (prompt: string, size: 'landscape_16_9' | 'portrait_4_3' | 'square_hd' = 'landscape_16_9') =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;

const roomTypeMedia: Record<
  string,
  {
    imagenes: [string, string, string, string];
    descripcion: string;
    amenidades: string[];
  }
> = {
  SENCILLA: {
    imagenes: [
      imagen('Fotografía profesional habitación de hotel sencilla, una cama queen size con sábanas blancas limpias, cabecero tapizado color crema, mesa de noche con lámpara moderna, ventana grande con luz natural, suelo de madera, TV de pantalla plana en pared, aire acondicionado, ambiente minimalista, fotografía arquitectónica, 4k, foto realista hotel boutique', 'landscape_16_9'),
      imagen('Detalle primer plano cama individual habitación hotel, almohadas ordenadas cojines decorativos azul marino, mesa noche con revista y vaso de agua, iluminación cálida atardecer, foto estilo editorial hoteleria', 'landscape_16_9'),
      imagen('Baño pequeño habitación sencilla hotel, plato ducha mampara vidrio, lavabo porcelana blanco griferia cromada, toallas dobladas color blanco, jabón, ambiente limpio luminoso, espejo redondo, foto realista', 'landscape_16_9'),
      imagen('Vista general de trabajo escritorio pequeño habitación hotel sencilla, silla ergonómica, laptop, cafetera taza, vista parcial ventana ciudad al exterior, fotografía comercial 16 9', 'landscape_16_9'),
    ],
    descripcion:
      'Acogedora habitación individual pensada para viajeros solitarios o estancias cortas. Cama Queen Size, área de trabajo compacta y baño completo con ducha. Perfecta para descansar y mantener tu día con total comodidad.',
    amenidades: [
      'Cama Queen Size',
      'TV Smart TV 43"',
      'Aire acondicionado',
      'Wi‑Fi 100 Mbps',
      'Escritorio',
      'Baño con ducha',
      'Cafetera',
      'Toallas premium',
    ],
  },
  DOBLE: {
    imagenes: [
      imagen('Fotografía profesional habitación doble hotel dos camas dobles idénticas con sábanas blancas impecables, cabeceros tapizados color gris topo, dos mesitas de noche, lámparas colgantes, alfombra geométrica, televisor 50 pulgadas pared, balcón pequeño vista jardín, luz natural suave, fotografía arquitectónica interiorismo 4k realista', 'landscape_16_9'),
      imagen('Detalle vista desde la ventana balcón habitación doble hotel, sillas madera exterior, plantas verdes maceta, habitación doble hotel, atardecer cálido, estilo boutique lujo 5 estrellas, 16:9', 'landscape_16_9'),
      imagen('Baño completo habitación doble, tina bañera esmaltada, griferia oro cepillado, espejo con luz led, tocador doble lavabos separados, toallas ordenadas, ambiente spa, fotografía realista lujo', 'landscape_16_9'),
      imagen('Sofá cama adicional sala pequeña habitación doble familiar, mesita centro, decoración plantas verdes, luz cálida, fotografía interior hotelera comercial 16 9', 'landscape_16_9'),
    ],
    descripcion:
      'Amplia habitación con dos camas dobles, ideal para parejas, amigos o familias pequeñas. Cuenta con balcón privado y sala auxiliar con sofá para mayor confort.',
    amenidades: [
      '2 camas Dobles',
      'Sofá auxiliar',
      'Balcón privado',
      'Smart TV 50"',
      'Aire acondicionado',
      'Minibar',
      'Cafetera',
      'Baño con tina',
      'Secadora de cabello',
      'Caja fuerte',
    ],
  },
  SUITE: {
    imagenes: [
      imagen('Fotografía profesional suite hotel lujo 5 estrellas, cama king size con cabecero capitoné terciopelo verde botella, mesa noche mármol, lámpara de pie bronce, área sala sofá terciopelo rosa viejo, mesa centro, mesa comedor 4 puestos, piso madera parquet, ventanal vista espectacular ciudad, jacuzzi esquinero, foto realista ultra detallado 4k', 'landscape_16_9'),
      imagen('Detalle jacuzzi terraza suite lujo hotel, velas aromáticas, pétalos rosas, toallas toalla enrolladas, copas champán, atardecer, atmósfera romántica, fotografía editorial hoteleria 5 estrellas', 'landscape_16_9'),
      imagen('Baño principal suite baño mármol carrara, lavabo doble pedestal grifer dorada, espejo led, ducha lluvia efecto cascada, jacuzzi, sauna vapor, sauna pequeña, plantas orquídeas, 16:9 realista', 'landscape_16_9'),
      imagen('Comedor independiente suite presidencial hotel, mesa cristal templado, 4 sillas terciopelo azul marino, cuadros arte, iluminación colgante dorada, panorámica ventanal, fotografía comercial lujo, 16 9', 'landscape_16_9'),
    ],
    descripcion:
      'Suite de lujo con dormitorio independiente, sala de estar, comedor y jacuzzi privado. Pensada para viajes especiales, lunas de miel o estancias prolongadas de trabajo ejecutivo.',
    amenidades: [
      'Cama King Size',
      'Jacuzzi privado',
      'Sala independiente',
      'Comedor 4 personas',
      'Smart TV 65"',
      'Barra bar',
      'Minibar premium',
      'Aire acondicionado dual',
      'Caja fuerte ejecutiva',
      'Terraza / Balcón',
      'Servicio mayordomo',
    ],
  },
};

export function isRoomImageArray(value: unknown): value is RoomImage[] {
  return Array.isArray(value) && value.length > 0 && typeof (value[0] as any)?.id === 'string';
}

export function extractRoomImageUrls(room: { imagenes?: RoomImage[] | string[] } | undefined | null): string[] {
  if (!room?.imagenes || room.imagenes.length === 0) return [];
  if (isRoomImageArray(room.imagenes)) {
    return room.imagenes.map((img) => img?.url_web || img?.url_original || '').filter(Boolean);
  }
  return (room.imagenes as string[]).filter((x) => typeof x === 'string');
}

export function getMainRoomImageUrl(room: { imagenes?: RoomImage[] | string[] } | undefined | null): string | null {
  const imgs = room?.imagenes;
  if (!imgs || imgs.length === 0) return null;
  if (isRoomImageArray(imgs)) {
    const principal = imgs.find((i) => !!i?.es_principal);
    const chosen = principal ?? imgs[0];
    return chosen?.url_web || chosen?.url_original || null;
  }
  return (imgs as string[])[0] ?? null;
}

export function getRoomDescripcion(
  room: { tipo: string; descripcion?: string } | undefined | null
): string {
  if (room?.descripcion) return room.descripcion;
  const tipo = room?.tipo ?? 'SENCILLA';
  return roomTypeMedia[tipo]?.descripcion ?? roomTypeMedia.SENCILLA.descripcion;
}

export function getRoomAmenidades(
  room:
    | {
        tipo: string;
        amenidades?: string[];
        etiquetas?: Array<{ nombre: string } | string> | null;
      }
    | undefined
    | null
): string[] {
  if (
    Array.isArray(room?.etiquetas) &&
    (room!.etiquetas as Array<unknown>).length > 0
  ) {
    const fromTags = (room!.etiquetas as Array<unknown>)
      .map((t) => (typeof t === 'string' ? t : (t as { nombre?: string }).nombre))
      .filter((x): x is string => Boolean(x && typeof x === 'string' && x.trim().length > 0));
    if (fromTags.length > 0) return fromTags;
  }
  if (Array.isArray(room?.amenidades) && room!.amenidades.length > 0) {
    return room!.amenidades;
  }
  const tipo = room?.tipo ?? 'SENCILLA';
  return roomTypeMedia[tipo]?.amenidades ?? roomTypeMedia.SENCILLA.amenidades;
}

export function enrichRoomWithMedia<
  T extends {
    tipo: string;
    numero: string;
    imagenes?: RoomImage[] | string[];
    descripcion?: string | null;
    amenidades?: string[];
    etiquetas?: Array<{ nombre: string } | string> | null;
  }
>(
  room: T
): T & { imagenes: string[]; descripcion: string; amenidades: string[] } {
  const realUrls = extractRoomImageUrls(room);
  const hasReal = realUrls.length > 0;
  const media = roomTypeMedia[room.tipo] ?? roomTypeMedia.SENCILLA;
  const seedBase = Array.from(room.numero + room.tipo).reduce(
    (acc: number, ch: string) => acc + ch.charCodeAt(0),
    0
  );
  const seed: number = Math.abs(seedBase);
  const shuffled = [...media.imagenes]
    .map((url, idx) => ({
      url,
      score: (Number(seed) + idx * 13) % 5,
    }))
    .sort((a, b) => a.score - b.score)
    .map(({ url }) => url);
  const hasEtiquetas =
    Array.isArray(room.etiquetas) &&
    (room.etiquetas as Array<unknown>).some((t) =>
      typeof t === 'string' ? Boolean(t) : Boolean((t as { nombre?: string })?.nombre)
    );
  const hasAmenidades = Array.isArray(room.amenidades) && room.amenidades.length > 0;
  const resolvedAmenidades: string[] = hasEtiquetas
    ? getRoomAmenidades(room)
    : hasAmenidades
      ? room.amenidades!
      : media.amenidades;
  return {
    ...room,
    imagenes: hasReal ? realUrls : shuffled,
    descripcion: (room.descripcion && room.descripcion.trim().length > 0
      ? room.descripcion
      : media.descripcion) as string,
    amenidades: resolvedAmenidades,
  };
}

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

export function clientValidateImageFile(file: File): { ok: true } | { ok: false; message: string } {
  if (!file) return { ok: false, message: 'Archivo inválido' };
  if (!IMAGE_ALLOWED_EXT.test(file.name || '')) {
    return {
      ok: false,
      message: `El archivo "${file.name || 'sin nombre'}" no tiene una extensión permitida. Usa JPG, PNG o WebP.`,
    };
  }
  if (!IMAGE_ALLOWED_MIME.includes(file.type as any)) {
    return {
      ok: false,
      message: `El archivo "${file.name || 'sin nombre'}" tiene un tipo no permitido (${file.type}).`,
    };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return {
      ok: false,
      message: `El archivo "${file.name || 'sin nombre'}" supera el tamaño máximo de 10MB.`,
    };
  }
  return { ok: true };
}

export type { Room, RoomImage };
