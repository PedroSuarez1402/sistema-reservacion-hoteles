import UserService from '../services/user.service.js';
import { signToken } from '../middlewares/auth.middleware.js';
import {
  BadRequestError,
  ForbiddenError,
} from '../utils/errors.util.js';

// Controlador peticiones HTTP Usuarios
class UserController {
  // Obtiene lista todos los usuarios
  static async getAll(req, res, next) {
    try {
      const users = await UserService.getAll();
      res.status(200).json({
        success: true,
        message: 'Usuarios obtenidos correctamente',
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtiene un usuario por su ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserService.getById(id);
      res.status(200).json({
        success: true,
        message: 'Usuario obtenido correctamente',
        data: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Crea un nuevo usuario y genera token
  static async create(req, res, next) {
    try {
      const user = await UserService.create(req.body);
      const token = signToken({
        id: user.id,
        email: user.email,
        rol: user.rol,
      });
      res.status(201).json({
        success: true,
        message: 'Usuario creado correctamente',
        data: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  // Inicia sesión: valida credenciales y devuelve token
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new BadRequestError('Email y contraseña son requeridos');
      }
      const user = await UserService.loginWithPassword(email, password);
      const token = signToken({
        id: user.id,
        email: user.email,
        rol: user.rol,
      });
      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtiene perfil del usuario autenticado
  static async me(req, res, next) {
    try {
      const user = await UserService.getById(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Perfil obtenido correctamente',
        data: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Actualiza datos de un usuario existente
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const esAdmin = req.user && req.user.rol === 'ADMIN';
      if (!esAdmin && req.user.id !== id) {
        throw new ForbiddenError('No tienes permiso para modificar este usuario');
      }
      const updateData = { ...req.body };
      if (!esAdmin) {
        delete updateData.rol;
      }
      const user = await UserService.update(id, updateData);
      res.status(200).json({
        success: true,
        message: 'Usuario actualizado correctamente',
        data: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Elimina un usuario por su ID
  static async remove(req, res, next) {
    try {
      const { id } = req.params;
      await UserService.delete(id);
      res.status(200).json({
        success: true,
        message: 'Usuario eliminado correctamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default UserController;
