import sequelize from '../config/database.js';
import User from '../models/User.js';
import Reservation from '../models/Reservation.js';
import usersData from './data/users.js';
import reservationsData from './data/reservations.js';

// Seeder BOOKING-SERVICE (solo User + Reservation)
async function runSeeder() {
  try {
    console.log('========================================');
    console.log('🌱 Seeding BOOKING SERVICE (Users + Reservations)');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión MySQL establecida.\n');

    console.log('🗑️  Truncando reservaciones → usuarios');
    await Reservation.destroy({ where: {} });
    await User.destroy({ where: {} });
    console.log('✅ Tablas limpias.\n');

    console.log('👤 Insertando usuarios (3 roles)...');
    const createdUsers = [];
    for (const userData of usersData) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`   + ${user.email}  rol=${user.rol}`);
    }
    console.log(`✅ ${createdUsers.length} usuarios insertados.\n`);

    console.log('📅 Insertando reservaciones demo...');
    const createdReservations = [];
    for (const resData of reservationsData) {
      try {
        const r = await Reservation.create(resData);
        createdReservations.push(r);
        const u = createdUsers.find(x => x.id === r.usuario_id);
        console.log(`   + id=${r.id}  habitacion_id=${r.habitacion_id}  ${u ? '(usuario ' + u.email.split('@')[0] + ')' : ''}  ${r.fecha_inicio}→${r.fecha_fin} $${r.precio_total} [${r.estado}]`);
      } catch (err) {
        console.log(`   - skip: ${err.message}`);
      }
    }
    console.log(`✅ ${createdReservations.length} reservaciones insertadas.\n`);

    console.log('========================================');
    console.log('🎉 BOOKING SEEDED EXITOSAMENTE');
    console.log('========================================');
    console.log('\n🔐 Credenciales prueba:');
    console.log('   ADMIN      → admin@hotel.com      / Admin123');
    console.log('   RECEPCION  → recepcion@hotel.com  / Recepcion123');
    console.log('   HUESPED    → huesped@hotel.com    / Huesped123');
    console.log('                juan.perez@example.com / ana.gomez@example.com / carlos.ruiz@example.com');
    console.log('                Pass Huesped123\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error seeding booking-service:');
    console.error(err.message || err);
    try { await sequelize.close(); } catch (_) {}
    process.exit(1);
  }
}

runSeeder();
