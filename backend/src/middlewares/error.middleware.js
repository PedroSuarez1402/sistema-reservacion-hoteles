import { ValidationError, UniqueConstraintError } from 'sequelize';
import { AppError, InternalServerError, NotFoundError } from '../utils/errors.util.js';

// Middleware global: maneja errores y normaliza respuestas HTTP
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    if (error instanceof ValidationError) {
      const validationErrors = error.errors.map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación',
        errors: validationErrors,
      });
    }

    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        status: 'error',
        message: 'Conflicto: el registro ya existe',
      });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      const notFound = new NotFoundError('Alguno de los registros relacionados no existe');
      return res.status(notFound.statusCode).json({
        status: 'error',
        message: notFound.message,
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token inválido',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expirado, inicia sesión de nuevo',
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Archivo no permitido',
      });
    }

    if (error.type === 'entity.too.large' || error.statusCode === 413) {
      return res.status(413).json({
        status: 'error',
        message: 'La carga es demasiado grande',
      });
    }

    if (error.statusCode || error.status) {
      const statusCode = Number(error.statusCode || error.status) || 500;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Error en la solicitud',
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('[ERROR NO CONTROLADO]', error);
    }

    const internal = new InternalServerError();
    return res.status(internal.statusCode).json({
      status: 'error',
      message: internal.message,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', error.message);
    if (error.stack) {
      console.debug('[STACK]', error.stack);
    }
  }

  res.status(error.statusCode).json({
    status: 'error',
    message: error.message,
  });
};

export default errorHandler;
