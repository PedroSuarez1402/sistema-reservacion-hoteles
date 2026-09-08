import sequelize, { testConnection } from '../config/database.js';
import User from './User.js';
import Room from './Room.js';
import Reservation from './Reservation.js';
import RoomImage from './RoomImage.js';
import Tag from './Tag.js';
import HabitacionEtiqueta from './HabitacionEtiqueta.js';

User.hasMany(Reservation, {
  foreignKey: 'usuario_id',
  onDelete: 'RESTRICT',
});

Reservation.belongsTo(User, {
  foreignKey: 'usuario_id',
});

Room.hasMany(Reservation, {
  foreignKey: 'habitacion_id',
  onDelete: 'RESTRICT',
});

Reservation.belongsTo(Room, {
  foreignKey: 'habitacion_id',
});

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
