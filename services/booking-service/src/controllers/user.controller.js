import UserService from '../services/user.service.js';
import { signToken } from '../middlewares/auth.middleware.js';
import {
  BadRequestError,
  ForbiddenError,
} from '../utils/errors.util.js';

function serializeUser(user) {
  if (!user) return null;
  const obj = typeof user.get === 'function' ? user.get({ plain: true }) : user;
  const out = {
    id: obj.id,
    nombre: obj.nombre,
    email: obj.email,
    rol: obj.rol,
    createdAt: obj.createdAt ?? obj.created_at ?? undefined,
    updatedAt: obj.updatedAt ?? obj.updated_at ?? undefined,
  };
  if (typeof obj.reservaciones_count !== 'undefined') {
    out.reservaciones_count = Number(obj.reservaciones_count) ?? 0;
  }
  if (typeof obj.ingreso_total !== 'undefined') {
    out.ingreso_total = obj.ingreso_total ?? null;
  }
  if (typeof obj.ultima_reserva_fecha !== 'undefined') {
    out.ultima_reserva_fecha = obj.ultima_reserva_fecha ?? null;
  }
  if (typeof obj.ultima_reserva_estado !== 'undefined') {
    out.ultima_reserva_estado = obj.ultima_reserva_estado ?? null;
  }
  return out;
}

function logUserControllerError(context, error, req) {
  const now = new Date().toISOString();
  console.error(`[${now}] [CONTROLLER ERROR][User.${context}] method=${req?.method} url=${req?.originalUrl} user=${req?.user?.id ?? '(anon)'} rol=${req?.user?.rol ?? '—'}`);
  console.error(`  message: ${error?.message ?? '(no message)'}`);
  if (error?.name) console.error(`  errorName: ${error.name}`);
  if (error?.stack) {
    const head = error.stack.split('\n').slice(0, 2).join('\n');
    console.error(`  stack:\n${head}`);
  }
}

// Controlador peticiones HTTP Usuarios
class UserController {
  static serialize = serializeUser;

  // Obtiene lista paginada de usuarios (ADMIN / RECEPCION)
  static async getAll(req, res, next) {
    try {
      const { keyword, page, limit, rol } = req.query || {};
      const result = await UserService.getAllPaginated({ keyword, page, limit, rol });
      return res.status(200).json({
        success: true,
        message: 'Usuarios obtenidos correctamente',
        data: result.items.map(serializeUser),
        meta: result.meta,
      });
    } catch (error) {
      logUserControllerError('getAll', error, req);
      if (error instanceof TypeError && /\.get is not a function|serialize/.test(error.message || '')) {
        return next(new InternalServerError('Error interno al serializar los datos del usuario'));
      }
      if (error?.name && error.name.includes('EagerLoadingError')) {
        return next(new InternalServerError('Error al cargar los usuarios del sistema'));
      }
      next(error);
    }
  }

  // Obtiene resumen de un usuario + contadores
  static async getSummary(req, res, next) {
    try {
      const { id } = req.params;
      const summary = await UserService.getByIdWithSummary(id);
      return res.status(200).json({
        success: true,
        message: 'Resumen de usuario cargado correctamente',
        data: serializeUser(summary),
      });
    } catch (error) {
      logUserControllerError('getSummary', error, req);
      next(error);
    }
  }

  // Obtiene un usuario por su ID (self or admin/recepción)
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const me = req.user;
      const esAdminORecepcion = me && (me.rol === 'ADMIN' || me.rol === 'RECEPCION');
      if (!esAdminORecepcion && me && me.id !== id) {
        throw new ForbiddenError('No tienes permiso para ver este usuario');
      }
      const user = await UserService.getById(id);
      return res.status(200).json({
        success: true,
        message: 'Usuario obtenido correctamente',
        data: serializeUser(user),
      });
    } catch (error) {
      logUserControllerError('getById', error, req);
      next(error);
    }
  }

  // Crea un nuevo usuario y genera token (auto-registro)
  static async create(req, res, next) {
    try {
      const user = await UserService.create(req.body || {});
      const token = signToken({
        id: user.id,
        email: user.email,
        rol: user.rol,
      });
      return res.status(201).json({
        success: true,
        message: 'Usuario creado correctamente',
        data: serializeUser(user),
        token,
      });
    } catch (error) {
      logUserControllerError('create', error, req);
      next(error);
    }
  }

  // Inicia sesión: valida credenciales y devuelve token
  static async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        throw new BadRequestError('Email y contraseña son requeridos');
      }
      const user = await UserService.loginWithPassword(email, password);
      const token = signToken({
        id: user.id,
        email: user.email,
        rol: user.rol,
      });
      return res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: serializeUser(user),
        token,
      });
    } catch (error) {
      logUserControllerError('login', error, req);
      next(error);
    }
  }

  // Obtiene perfil del usuario autenticado
  static async me(req, res, next) {
    try {
      const user = await UserService.getById(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Perfil obtenido correctamente',
        data: serializeUser(user),
      });
    } catch (error) {
      logUserControllerError('me', error, req);
      next(error);
    }
  }

  // Actualiza datos de un usuario existente
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const me = req.user;
      const esAdmin = me && me.rol === 'ADMIN';
      const esRecepcion = me && me.rol === 'RECEPCION';
      const updateData = { ...(req.body || {}) };

      if (!esAdmin && !esRecepcion && me && me.id !== id) {
        throw new ForbiddenError('No tienes permiso para modificar este usuario');
      }

      const target = await UserService.getById(id);

      if (esRecepcion && target.rol !== 'HUESPED') {
        throw new ForbiddenError('Recepción solo puede actualizar datos de huéspedes');
      }

      if (!esAdmin) {
        delete updateData.rol;
      } else if (updateData.rol !== undefined) {
        const allowedRols = ['HUESPED', 'ADMIN', 'RECEPCION'];
        if (!allowedRols.includes(String(updateData.rol))) {
          throw new BadRequestError('Rol inválido');
        }
      }

      const user = await UserService.update(id, updateData);
      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado correctamente',
        data: serializeUser(user),
      });
    } catch (error) {
      logUserControllerError('update', error, req);
      next(error);
    }
  }

  // Elimina un usuario por su ID (solo ADMIN)
  static async remove(req, res, next) {
    try {
      const { id } = req.params;
      await UserService.delete(id);
      return res.status(200).json({
        success: true,
        message: 'Usuario eliminado correctamente',
      });
    } catch (error) {
      logUserControllerError('remove', error, req);
      if (error && error.name && error.name.includes('ForeignKeyConstraintError')) {
        return next(new ForbiddenError('No se puede eliminar el usuario porque tiene reservas asociadas'));
      }
      next(error);
    }
  }
}

export default UserController;
