import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/database.js';

// Modelo Sequelize Usuario
class User extends Model {
  // Compara password candidato con hash almacenado
  comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM('HUESPED', 'ADMIN', 'RECEPCION'),
      defaultValue: 'HUESPED',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'usuarios',
    hooks: {
      // Hook: normaliza email y nombre antes validar
      beforeValidate: (user) => {
        if (user.email) {
          user.email = user.email.trim().toLowerCase();
        }
        if (user.nombre) {
          user.nombre = user.nombre.trim();
        }
      },
      // Hook: encripta password antes de crear
      beforeCreate: async (user) => {
        if (user.password) {
          const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
      // Hook: re-encripta password al actualizar
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
    },
  }
);

export default User;
