import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import Room from './Room.js';

// Modelo Sequelize Reservación
class Reservation extends Model {}

Reservation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
    habitacion_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'habitaciones',
        key: 'id',
      },
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    precio_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'FINALIZADA'),
      defaultValue: 'PENDIENTE',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Reservation',
    tableName: 'reservaciones',
    indexes: [
      {
        fields: ['fecha_inicio', 'fecha_fin'],
      },
      {
        unique: true,
        fields: ['habitacion_id', 'fecha_inicio', 'fecha_fin'],
      },
    ],
    validate: {
      // Valida fecha fin sea mayor que inicio
      fechaFinMayorQueInicio() {
        const inicio = new Date(this.fecha_inicio);
        const fin = new Date(this.fecha_fin);
        if (fin <= inicio) {
          throw new Error('La fecha de fin debe ser mayor que la fecha de inicio');
        }
      },
    },
    hooks: {
      // Hook: calcula precio_total según noches y precio habitación
      beforeCreate: async (reservation) => {
        const room = await Room.findByPk(reservation.habitacion_id);
        if (!room) {
          throw new Error('La habitación no existe');
        }

        const inicio = new Date(reservation.fecha_inicio);
        const fin = new Date(reservation.fecha_fin);
        const diffMs = fin.getTime() - inicio.getTime();
        const noches = Math.ceil(diffMs / 86400000);

        reservation.precio_total = (noches * parseFloat(room.precio_noche)).toFixed(2);
      },
    },
  }
);

export default Reservation;
