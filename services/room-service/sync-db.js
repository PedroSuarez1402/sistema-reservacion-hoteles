import sequelize from './src/config/database.js';
import './src/models/index.js';

// Sincroniza modelos Sequelize con BD
async function sync() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión BD establecida.');
    const force = process.argv.includes('--force');
    const alter = process.argv.includes('--alter');
    console.log(
      force
        ? '⚠️  Sincronizando con force=true (sobrescribe tablas)'
        : alter
          ? '🔧 Sincronizando tablas (alter: true)'
          : '🔄 Sincronizando tablas (alter: false)'
    );
    await sequelize.sync({ force, alter: alter || false });
    console.log('✅ Modelos sincronizados correctamente.');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error sync:', err.message);
    try { await sequelize.close(); } catch (_) {}
    process.exit(1);
  }
}

sync();
