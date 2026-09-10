import sequelize, { testConnection } from '../config/database.js';
import User from './User.js';
import Reservation from './Reservation.js';

// =========================================================
//  ASOCIACIONES CENTRALIZADAS - BOOKING SERVICE
//  Dominio: Usuarios, Autenticación y Reservaciones
//  NO existen Room, RoomImage, Tag, HabitacionEtiqueta en este servicio
//  NO existe belongsTo(Room) — Reservation está DESACOPLADO de Room
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

export {
  sequelize,
  testConnection,
  User,
  Reservation,
};
