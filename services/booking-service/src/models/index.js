import sequelize, { testConnection } from '../config/database.js';
import User from './User.js';
import Reservation from './Reservation.js';
import Paquete from './Paquete.js';
import Servicio from './Servicio.js';
import PaqueteServicio from './PaqueteServicio.js';
import Cliente from './Cliente.js';
import Acompanante from './Acompanante.js';

// =========================================================
//  ASOCIACIONES CENTRALIZADAS - BOOKING SERVICE
// =========================================================

// --- Cliente <--> Reservación (1:N) ---
Cliente.hasMany(Reservation, {
  foreignKey: 'cliente_id',
  as: 'reservaciones',
  onDelete: 'SET NULL',
});
Reservation.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente',
});

// --- Cliente <--> Acompañante (1:N) ---
Cliente.hasMany(Acompanante, {
  foreignKey: 'cliente_id',
  as: 'acompanantes',
  onDelete: 'CASCADE',
});
Acompanante.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente',
});

// --- Reservación <--> Acompañante (1:N) ---
Reservation.hasMany(Acompanante, {
  foreignKey: 'reserva_id',
  as: 'acompanantes',
  onDelete: 'SET NULL',
});
Acompanante.belongsTo(Reservation, {
  foreignKey: 'reserva_id',
  as: 'reservacion',
});

// --- Usuario (Staff) <--> Reservación ---
User.hasMany(Reservation, {
  foreignKey: 'usuario_id',
  as: 'reservaciones',
  onDelete: 'SET NULL',
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
  Cliente,
  Acompanante,
  Reservation,
  Paquete,
  Servicio,
  PaqueteServicio,
};
