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
import usersData from './data/users.js';
import clientesData from './data/clientes.js';
import acompanantesData from './data/acompanantes.js';
import reservationsData from './data/reservations.js';
import serviciosData from './data/servicios.js';
import paquetesData from './data/paquetes.js';

// Seeder BOOKING-SERVICE: 100% ORM Sequelize
async function runSeeder() {
  try {
    console.log('========================================');
    console.log('🌱 SEEDER BOOKING SERVICE (ORM Sequelize)');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión MySQL establecida correctamente.\n');

    // Recreación limpia de esquemas vía ORM (sin SQL nativo)
    console.log('🔄 Sincronizando esquemas con el ORM (sequelize.sync force)...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Tablas sincronizadas limpiamente vía Sequelize.\n');

    // 1. Servicios Adicionales
    console.log('💆 Insertando servicios adicionales...');
    for (const servData of serviciosData) {
      await Servicio.create(servData);
      console.log(`   + ${servData.nombre} ($${servData.precio})`);
    }
    console.log(`✅ ${serviciosData.length} servicios adicionales insertados.\n`);

    // 2. Paquetes Turísticos
    console.log('🎁 Insertando paquetes turísticos...');
    for (const pkgData of paquetesData) {
      const { servicios_incluidos, ...datosPaquete } = pkgData;
      const paquete = await Paquete.create(datosPaquete);
      console.log(`   + [${paquete.nombre}] (${paquete.descuento_porcentaje}% descuento)`);

      if (servicios_incluidos && servicios_incluidos.length > 0) {
        for (const item of servicios_incluidos) {
          await PaqueteServicio.create({
            paquete_id: paquete.id,
            servicio_id: item.servicio_id,
            cantidad: item.cantidad,
          });
        }
      }
    }
    console.log(`✅ ${paquetesData.length} paquetes turísticos creados con sus servicios asociados.\n`);

    // 3. Usuarios de Sistema (Staff únicamente: ADMIN y RECEPCION)
    console.log('👤 Insertando usuarios de sistema (Staff)...');
    for (const userData of usersData) {
      const user = await User.create(userData);
      console.log(`   + ${user.email}  [rol=${user.rol}]`);
    }
    console.log(`✅ ${usersData.length} usuarios de personal insertados (Sin huéspedes en usuarios).\n`);

    // 4. Clientes Huéspedes
    console.log('🏨 Insertando clientes huéspedes...');
    for (const cliData of clientesData) {
      const cliente = await Cliente.create(cliData);
      console.log(`   + ${cliente.nombre}  [Doc: ${cliente.documento}]`);
    }
    console.log(`✅ ${clientesData.length} clientes registrados en tabla propia clientes.\n`);

    // 5. Reservaciones
    console.log('📅 Insertando reservaciones vinculadas a clientes...');
    for (const resData of reservationsData) {
      const r = await Reservation.create(resData);
      console.log(`   + id=${r.id.slice(0, 8)}...  cliente_id=${r.cliente_id.slice(0, 8)}...  ${r.fecha_inicio}→${r.fecha_fin} $${r.precio_total} [${r.estado}]`);
    }
    console.log(`✅ ${reservationsData.length} reservaciones creadas.\n`);

    // 6. Acompañantes
    console.log('👥 Insertando acompañantes...');
    for (const acompData of acompanantesData) {
      const a = await Acompanante.create(acompData);
      console.log(`   + ${a.nombre} (${a.parentesco}) [Doc: ${a.documento || 'S/D'}]`);
    }
    console.log(`✅ ${acompanantesData.length} acompañantes asociados.\n`);

    console.log('========================================');
    console.log('🎉 SEEDING COMPLETADO EXITOSAMENTE VÍA ORM');
    console.log('========================================');
    console.log('\n🔐 Credenciales de acceso:');
    console.log('   ADMIN      → admin@hotel.com      / Admin123');
    console.log('   RECEPCION  → recepcion@hotel.com  / Recepcion123');
    console.log('\n🏨 Directorio de clientes inicial:');
    clientesData.forEach((c) => {
      console.log(`   - ${c.nombre} (Doc: ${c.documento}, ${c.email})`);
    });
    console.log('');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error en el seeder de booking-service:');
    console.error(err.message || err);
    try { await sequelize.close(); } catch (_) {}
    process.exit(1);
  }
}

runSeeder();
