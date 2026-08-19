import sequelize from '../config/database.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Reservation from '../models/Reservation.js';
import usersData from './data/users.js';
import roomsData from './data/rooms.js';
import reservationsData from './data/reservations.js';

async function runSeeder() {
  try {
    console.log('========================================');
    console.log('🌱 Iniciando seeding de la base de datos');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente.\n');

    const options = { cascade: true, force: true };
    console.log('🗑️  Eliminando tablas en orden: Reservas → Habitaciones → Usuarios');
    await Reservation.destroy({ where: {}, truncate: options });
    await Room.destroy({ where: {}, truncate: options });
    await User.destroy({ where: {}, truncate: options });
    console.log('✅ Tablas limpiadas.\n');

    console.log('👤 Insertando usuarios...');
    const createdUsers = [];
    for (const userData of usersData) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`   + ${user.email} (${user.rol})`);
    }
    console.log(`✅ ${createdUsers.length} usuarios insertados.\n`);

    console.log('🏨 Insertando habitaciones...');
    const createdRooms = [];
    for (const roomData of roomsData) {
      const room = await Room.create(roomData);
      createdRooms.push(room);
      console.log(`   + Hab. ${room.numero} (${room.tipo} - $${room.precio_noche}/noche) [${room.estado}]`);
    }
    console.log(`✅ ${createdRooms.length} habitaciones insertadas.\n`);

    console.log('📅 Insertando reservaciones...');
    const createdReservations = [];
    for (const resData of reservationsData) {
      const reservation = await Reservation.create(resData);
      createdReservations.push(reservation);
      const usuario = createdUsers.find((u) => u.id === reservation.usuario_id);
      const habitacion = createdRooms.find((r) => r.id === reservation.habitacion_id);
      console.log(
        `   + Hab. ${habitacion.numero} | ${usuario.nombre} | ` +
        `${reservation.fecha_inicio} → ${reservation.fecha_fin} | $${reservation.precio_total} [${reservation.estado}]`
      );
    }
    console.log(`✅ ${createdReservations.length} reservaciones insertadas.\n`);

    console.log('========================================');
    console.log('🎉 Seeding completado exitosamente!');
    console.log('========================================');
    console.log('\n🔐 Credenciales de prueba:');
    console.log(`   ADMIN      → admin@hotel.com       / Admin123`);
    console.log(`   RECEPCION  → recepcion@hotel.com   / Recepcion123`);
    console.log(`   HUESPEDES  → juan.perez@example.com / ana.gomez@example.com / carlos.ruiz@example.com`);
    console.log(`                Password común: Huesped123\n`);

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error durante el seeding:');
    console.error(err);
    try { await sequelize.close(); } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

runSeeder();
