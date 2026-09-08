import sequelize, { testConnection } from '../config/database.js';
import User from './User.js';
import Room from './Room.js';
import Reservation from './Reservation.js';
import RoomImage from './RoomImage.js';
import Tag from './Tag.js';
import HabitacionEtiqueta from './HabitacionEtiqueta.js';

// =========================================================
//  ASOCIACIONES CENTRALIZADAS (evita dependencias cíclicas)
//  Todos los modelos ya están inicializados (clases + init)
//  antes de ejecutar .hasMany/.belongsTo/.belongsToMany
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

// --- Habitación <--> Reservación ---
Room.hasMany(Reservation, {
  foreignKey: 'habitacion_id',
  as: 'reservaciones',
  onDelete: 'RESTRICT',
});
Reservation.belongsTo(Room, {
  foreignKey: 'habitacion_id',
  as: 'habitacion',
});

// --- Habitación <--> ImagenHabitacion ---
Room.hasMany(RoomImage, {
  foreignKey: 'habitacion_id',
  as: 'imagenes',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
RoomImage.belongsTo(Room, {
  foreignKey: 'habitacion_id',
  as: 'habitacion',
});

// --- Habitación <--N:M--> Etiqueta (a través de HabitacionEtiqueta) ---
Room.belongsToMany(Tag, {
  through: HabitacionEtiqueta,
  as: 'etiquetas',
  foreignKey: 'habitacion_id',
  otherKey: 'etiqueta_id',
  onDelete: 'CASCADE',
});
Tag.belongsToMany(Room, {
  through: HabitacionEtiqueta,
  as: 'habitaciones',
  foreignKey: 'etiqueta_id',
  otherKey: 'habitacion_id',
  onDelete: 'CASCADE',
});

export {
  sequelize,
  testConnection,
  User,
  Room,
  Reservation,
  RoomImage,
  Tag,
  HabitacionEtiqueta,
};
