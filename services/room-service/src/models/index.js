import sequelize, { testConnection } from '../config/database.js';
import Room from './Room.js';
import RoomImage from './RoomImage.js';
import Tag from './Tag.js';
import HabitacionEtiqueta from './HabitacionEtiqueta.js';

// =========================================================
//  ASOCIACIONES CENTRALIZADAS - ROOM SERVICE
//  Dominio: Catálogo, Habitaciones, Imágenes y Etiquetas
//  NO existen User ni Reservation en este servicio
// =========================================================

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
  Room,
  RoomImage,
  Tag,
  HabitacionEtiqueta,
};
