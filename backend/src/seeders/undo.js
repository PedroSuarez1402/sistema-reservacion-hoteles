import sequelize from '../config/database.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Reservation from '../models/Reservation.js';

async function runUndo() {
  try {
    console.log('========================================');
    console.log('🧹 Limpiando datos de la base de datos (sin sembrar)');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente.\n');

    const options = { cascade: true, force: true };
    console.log('🗑️  Eliminando reservaciones...');
    const r1 = await Reservation.destroy({ where: {}, truncate: options });
    console.log(`   → ${r1} registros eliminados.`);

    console.log('🗑️  Eliminando habitaciones...');
    const r2 = await Room.destroy({ where: {}, truncate: options });
    console.log(`   → ${r2} registros eliminados.`);

    console.log('🗑️  Eliminando usuarios...');
    const r3 = await User.destroy({ where: {}, truncate: options });
    console.log(`   → ${r3} registros eliminados.\n`);

    console.log('========================================');
    console.log('✅ Base de datos limpiada exitosamente.');
    console.log('========================================');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error limpiando la base de datos:');
    console.error(err);
    try { await sequelize.close(); } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

runUndo();
