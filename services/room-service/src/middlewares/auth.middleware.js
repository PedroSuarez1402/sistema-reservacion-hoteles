import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.util.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Firma token JWT con payload y expiración
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Middleware: verifica token JWT y adjunta req.user
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
      throw new UnauthorizedError('No se proporcionó el token de autorización');
    }

    const parts = String(authHeader).split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Formato de token inválido. Usa "Bearer <token>"');
    }

    const token = parts[1];
    if (!token) {
      throw new UnauthorizedError('Token no proporcionado');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expirado, inicia sesión de nuevo'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Token inválido'));
    }
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    next(error);
  }
}

// Factory middleware: valida que rol usuario esté en lista permitida
export function requireRole(...allowedRoles) {
  // Middleware interno: chequea rol contra lista
  return function checkRole(req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Autenticación requerida');
      }
      if (!allowedRoles.includes(req.user.rol)) {
        throw new ForbiddenError('No tienes permiso para realizar esta acción');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Middleware: verifica que usuario tenga rol ADMIN
export function isAdmin(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Autenticación requerida');
    }
    if (req.user.rol !== 'ADMIN') {
      throw new ForbiddenError('Se requiere rol de administrador');
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Middleware: verifica rol RECEPCION o ADMIN
export function isRecepcionOrAdmin(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Autenticación requerida');
    }
    if (req.user.rol !== 'ADMIN' && req.user.rol !== 'RECEPCION') {
      throw new ForbiddenError('Se requiere rol de recepción o administrador');
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Factory middleware: permite dueño recurso o ADMIN
export function isOwnerOrAdmin(getOwnerIdFn) {
  // Middleware interno: valida ownership o rol admin
  return function checkOwner(req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Autenticación requerida');
      }
      if (req.user.rol === 'ADMIN') {
        return next();
      }
      const ownerId = typeof getOwnerIdFn === 'function'
        ? getOwnerIdFn(req)
        : getOwnerIdFn;
      if (ownerId && req.user.id !== String(ownerId)) {
        throw new ForbiddenError('No tienes permiso para acceder a este recurso');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Objeto exportado middleware Autenticación Autorización
export default {
  signToken,
  verifyToken,
  requireRole,
  isAdmin,
  isRecepcionOrAdmin,
  isOwnerOrAdmin,
};
