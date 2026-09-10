// Clase base errores operacionales de la app
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error HTTP 400: Solicitud malformada
export class BadRequestError extends AppError {
  constructor(message = 'Solicitud incorrecta') {
    super(message, 400);
  }
}

// Error HTTP 401: Falta autenticación o token inválido
export class UnauthorizedError extends AppError {
  constructor(message = 'Autenticación requerida') {
    super(message, 401);
  }
}

// Error HTTP 403: Autenticado pero sin permisos
export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
  }
}

// Error HTTP 404: Recurso no encontrado
export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

// Error HTTP 409: Conflicto estado recurso (único, etc.)
export class ConflictError extends AppError {
  constructor(message = 'Conflicto con un registro existente') {
    super(message, 409);
  }
}

// Error HTTP 422: Entidad sintácticamente correcta semánticamente no
export class UnprocessableEntityError extends AppError {
  constructor(message = 'Entidad no procesable') {
    super(message, 422);
  }
}

// Error HTTP 500: Error interno servidor inesperado
export class InternalServerError extends AppError {
  constructor(message = 'Error interno del servidor') {
    super(message, 500);
  }
}

// Helper: lanza error si valor es null/undefined/string vacío
export function assertRequired(value, message, ErrorClass = BadRequestError) {
  if (value === undefined || value === null || value === '') {
    throw new ErrorClass(message);
  }
  return value;
}

// Objeto exportado utilidad Errores y helpers
export default {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  InternalServerError,
  assertRequired,
};
