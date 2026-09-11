import sequelize from '../config/database.js';
import User from '../models/User.js';
import Reservation from '../models/Reservation.js';

// Limpia datos BD del booking-service (usuarios y reservaciones)
// NOTA: Room, Tags y HabitacionEtiquetas NO se manejan aquí, pertenecen a room-service.
async function runUndo() {
  try {
    console.log('========================================');
    console.log('🧹 [BOOKING] Limpiando datos (usuarios + reservaciones)');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente.\n');

    const options = { cascade: true, force: true };
    console.log('🗑️  Eliminando reservaciones...');
    const r1 = await Reservation.destroy({ where: {}, truncate: options });
    console.log(`   → ${r1} registros eliminados.`);

    console.log('🗑️  Eliminando usuarios...');
    const r3 = await User.destroy({ where: {}, truncate: options });
    console.log(`   → ${r3} registros eliminados.\n`);

    console.log('========================================');
    console.log('✅ Base de datos BOOKING limpiada exitosamente.');
    console.log('========================================');
    console.log('ℹ️  Nota: Habitaciones / Etiquetas NO se tocaron (son room-service).');
    console.log('    Usa services/room-service/src/seeders/undo.js para el catálogo.\n');

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
