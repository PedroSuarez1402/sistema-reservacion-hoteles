import sequelize, { testConnection } from '../config/database.js';
import User from './User.js';
import Room from './Room.js';
import Reservation from './Reservation.js';

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

export { sequelize, testConnection, User, Room, Reservation };
