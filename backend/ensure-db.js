import mysql from 'mysql2/promise';

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

const DB_NAME = process.env.DB_NAME || 'sistema-reservas';

// Verifica y crea base de datos si no existe
async function ensureDb() {
  try {
    const conn = await mysql.createConnection(config);
    const [rows] = await conn.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [DB_NAME]
    );
    if (rows.length === 0) {
      console.log(`🆕 Base de datos '${DB_NAME}' no existe, creando...`);
      await conn.query(
        `CREATE DATABASE \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ Base de datos '${DB_NAME}' creada exitosamente.`);
    } else {
      console.log(`✅ Base de datos '${DB_NAME}' ya existe.`);
    }
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error verificando/creando BD:', err.message);
    process.exit(1);
  }
}

ensureDb();
