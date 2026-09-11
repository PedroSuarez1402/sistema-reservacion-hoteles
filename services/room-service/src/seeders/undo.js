import sequelize from '../config/database.js';
import Room from '../models/Room.js';
import Tag from '../models/Tag.js';

// Limpia datos de ROOM-SERVICE (catálogo): Etiquetas + Habitaciones + HabitacionEtiquetas
// NOTA: Usuarios y Reservaciones NO se manejan aquí → usa booking-service/src/seeders/undo.js.
async function runUndo() {
  try {
    console.log('========================================');
    console.log('🧹 [ROOM SERVICE] Limpiando catálogo (habitaciones + etiquetas)');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente.\n');

    const options = { cascade: true, force: true };
    console.log('🗑️  Eliminando asociaciones Habitaciones-Etiquetas...');
    try {
      const { HabitacionEtiqueta } = await import('../models/index.js');
      const r = await HabitacionEtiqueta.destroy({ where: {}, truncate: options });
      console.log(`   → ${r} asociaciones eliminadas.`);
    } catch (_) {
      console.log('   (omitido: no existe HabitacionEtiqueta en este entorno)');
    }

    console.log('🗑️  Eliminando habitaciones...');
    const r2 = await Room.destroy({ where: {}, truncate: options });
    console.log(`   → ${r2} registros eliminados.`);

    console.log('🗑️  Eliminando etiquetas...');
    const r3 = await Tag.destroy({ where: {}, truncate: options });
    console.log(`   → ${r3} registros eliminados.\n`);

    console.log('========================================');
    console.log('✅ Base de datos ROOM SERVICE limpiada exitosamente.');
    console.log('========================================');
    console.log('ℹ️  Nota: Usuarios / Reservaciones NO se tocaron (son booking-service).');
    console.log('    Usa services/booking-service/src/seeders/undo.js para esos datos.\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error limpiando la base de datos ROOM SERVICE:');
    console.error(err);
    try { await sequelize.close(); } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

runUndo();
