import { Sequelize } from 'sequelize';

const isProduction = process.env.NODE_ENV === 'production';
const shouldLog = !isProduction;

const sslConfig = process.env.DB_SSL === 'true'
  ? { require: true, rejectUnauthorized: false }
  : false;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: shouldLog ? (...msg) => console.log('[SEQUELIZE]', msg[0]) : false,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 5),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      idle: Number(process.env.DB_POOL_IDLE || 10000),
    },
    dialectOptions: sslConfig ? { ssl: sslConfig } : {},
    define: {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
    },
    timezone: '-05:00',
  }
);

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a MySQL:', error.message);
    return false;
  }
};

export default sequelize;
