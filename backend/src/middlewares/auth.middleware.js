import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      status: 'error',
      message: 'No se proporcionó el token de autorización',
    });
  }

  const parts = String(authHeader).split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      status: 'error',
      message: 'Formato de token inválido. Usa "Bearer <token>"',
    });
  }

  const token = parts[1];
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Token no proporcionado',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expirado, inicia sesión de nuevo',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token inválido',
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'No se pudo verificar el token',
    });
  }
}

export function requireRole(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Autenticación requerida',
      });
    }
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para realizar esta acción',
      });
    }
    next();
  };
}

export function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Autenticación requerida',
    });
  }
  if (req.user.rol !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Se requiere rol de administrador',
    });
  }
  next();
}

export function isRecepcionOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Autenticación requerida',
    });
  }
  if (req.user.rol !== 'ADMIN' && req.user.rol !== 'RECEPCION') {
    return res.status(403).json({
      status: 'error',
      message: 'Se requiere rol de recepción o administrador',
    });
  }
  next();
}

export function isOwnerOrAdmin(getOwnerIdFn) {
  return function checkOwner(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Autenticación requerida',
      });
    }
    if (req.user.rol === 'ADMIN') {
      return next();
    }
    const ownerId = typeof getOwnerIdFn === 'function' ? getOwnerIdFn(req) : getOwnerIdFn;
    if (ownerId && req.user.id !== String(ownerId)) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para acceder a este recurso',
      });
    }
    next();
  };
}

export default {
  signToken,
  verifyToken,
  requireRole,
  isAdmin,
  isRecepcionOrAdmin,
  isOwnerOrAdmin,
};
