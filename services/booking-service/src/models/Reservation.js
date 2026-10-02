import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

// ======================================================================
//  MODELO RESERVATION - BOOKING SERVICE (DESACOPLADO DE ROOM)
//
//  DECISIÓN ARQUITECTÓNICA (Siguiendo instrucciones del usuario):
//  - habitacion_id YA NO ES ForeignKey hacia la tabla habitaciones
//  - Es un campo INTEGER SIMPLE sin references (desacoplamiento DB)
//  - NO existe belongsTo(Room) ni belongsToMany(Tag) en este servicio
//  - NO existe el hook beforeCreate que importaba Room.js
//    (el cálculo de precio_total es responsabilidad del service/controllers
//     que pueden consultar al room-service vía REST si es necesario)
// ======================================================================

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
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
    cliente_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'clientes',
        key: 'id',
      },
    },
    habitacion_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    paquete_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'paquetes',
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
    metodo_pago: {
      type: DataTypes.ENUM('EFECTIVO', 'TRANSFERENCIA', 'TARJETA'),
      defaultValue: 'EFECTIVO',
      allowNull: false,
    },
    tipo_reserva: {
      type: DataTypes.ENUM('INMEDIATA', 'ANTICIPADA'),
      defaultValue: 'ANTICIPADA',
      allowNull: false,
    },
    es_prorroga: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    anticipo: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
    },
    observaciones_recepcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Reservation',
    tableName: 'reservaciones',
    indexes: [
      { fields: ['fecha_inicio', 'fecha_fin'] },
      { fields: ['estado'] },
      { fields: ['usuario_id'] },
      { fields: ['cliente_id'] },
      { fields: ['habitacion_id'] },
    ],
    validate: {
      fechaFinMayorQueInicio() {
        const inicio = new Date(this.fecha_inicio);
        const fin = new Date(this.fecha_fin);
        if (fin <= inicio) {
          throw new Error('La fecha de fin debe ser mayor que la fecha de inicio');
        }
      },
    },
  }
);

export default Reservation;
