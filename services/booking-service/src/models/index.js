import sequelize, { testConnection } from '../config/database.js';
import User from './User.js';
import Reservation from './Reservation.js';
import Paquete from './Paquete.js';
import Servicio from './Servicio.js';
import PaqueteServicio from './PaqueteServicio.js';

// =========================================================
//  ASOCIACIONES CENTRALIZADAS - BOOKING SERVICE
// =========================================================

// --- Usuario <--> Reservación ---
User.hasMany(Reservation, {
  foreignKey: 'usuario_id',
  as: 'reservaciones',
  onDelete: 'RESTRICT',
});
Reservation.belongsTo(User, {
  foreignKey: 'usuario_id',
  as: 'usuario',
});

// --- Paquete <--> Servicio (N:M a través de PaqueteServicio) ---
Paquete.belongsToMany(Servicio, {
  through: PaqueteServicio,
  foreignKey: 'paquete_id',
  otherKey: 'servicio_id',
  as: 'servicios',
});
Servicio.belongsToMany(Paquete, {
  through: PaqueteServicio,
  foreignKey: 'servicio_id',
  otherKey: 'paquete_id',
  as: 'paquetes',
});

// --- Paquete <--> Reservación (1:N) ---
Paquete.hasMany(Reservation, {
  foreignKey: 'paquete_id',
  as: 'reservaciones',
  onDelete: 'SET NULL',
});
Reservation.belongsTo(Paquete, {
  foreignKey: 'paquete_id',
  as: 'paquete',
});

export {
  sequelize,
  testConnection,
  User,
  Reservation,
  Paquete,
  Servicio,
  PaqueteServicio,
};
