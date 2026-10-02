import {
  sequelize,
  User,
  Cliente,
  Acompanante,
  Reservation,
  Paquete,
  Servicio,
  PaqueteServicio,
} from '../models/index.js';

// Limpia datos BD del booking-service en orden inverso de dependencias vía ORM
async function runUndo() {
  try {
    console.log('========================================');
    console.log('🧹 [BOOKING] Limpiando datos vía ORM...');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente.\n');

    console.log('🗑️  Eliminando acompañantes...');
    await Acompanante.destroy({ where: {}, force: true });

    console.log('🗑️  Eliminando reservaciones...');
    await Reservation.destroy({ where: {}, force: true });

    console.log('🗑️  Eliminando clientes...');
    await Cliente.destroy({ where: {}, force: true });

    console.log('🗑️  Eliminando paquete_servicios...');
    await PaqueteServicio.destroy({ where: {}, force: true });

    console.log('🗑️  Eliminando paquetes...');
    await Paquete.destroy({ where: {}, force: true });

    console.log('🗑️  Eliminando servicios...');
    await Servicio.destroy({ where: {}, force: true });

    console.log('🗑️  Eliminando usuarios...');
    await User.destroy({ where: {}, force: true });

    console.log('\n========================================');
    console.log('✅ Base de datos BOOKING limpiada exitosamente vía ORM.');
    console.log('========================================\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error limpiando la base de datos:');
    console.error(err.message || err);
    try { await sequelize.close(); } catch (_) {}
    process.exit(1);
  }
}

runUndo();
