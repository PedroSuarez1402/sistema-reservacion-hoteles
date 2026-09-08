import sequelize from '../config/database.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Reservation from '../models/Reservation.js';
import Tag from '../models/Tag.js';
import usersData from './data/users.js';
import roomsData from './data/rooms.js';
import reservationsData from './data/reservations.js';
import etiquetasData from './data/tags.js';

const tagsPorTipo = {
  SENCILLA: [
    'Cama Queen Size',
    'TV Smart TV 43"',
    'Aire acondicionado',
    'Wi-Fi 100 Mbps',
    'Escritorio',
    'Baño con ducha',
    'Cafetera',
    'Toallas premium',
  ],
  DOBLE: [
    '2 camas Dobles',
    'Sofá auxiliar',
    'Balcón privado',
    'Smart TV 50"',
    'Aire acondicionado',
    'Minibar',
    'Cafetera',
    'Baño con tina',
    'Secadora de cabello',
    'Caja fuerte',
  ],
  SUITE: [
    'Cama King Size',
    'Jacuzzi privado',
    'Sala independiente',
    'Comedor 4 personas',
    'Smart TV 65"',
    'Barra bar',
    'Minibar premium',
    'Aire acondicionado dual',
    'Caja fuerte ejecutiva',
    'Terraza / Balcón',
    'Servicio mayordomo',
  ],
};

// Ejecuta seeding completo base datos demo
async function runSeeder() {
  try {
    console.log('========================================');
    console.log('🌱 Iniciando seeding de la base de datos');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente.\n');

    const options = { cascade: true, force: true };
    console.log('🗑️  Eliminando tablas en orden: Reservas → HabitacionesEtiquetas → Habitaciones → Usuarios → Etiquetas');
    await Reservation.destroy({ where: {}, truncate: options });
    try {
      const { HabitacionEtiqueta } = await import('../models/index.js');
      await HabitacionEtiqueta.destroy({ where: {}, truncate: options });
    } catch (_) {
      // ignore
    }
    await Room.destroy({ where: {}, truncate: options });
    await Tag.destroy({ where: {}, truncate: options });
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

    console.log('🏷️  Insertando etiquetas...');
    const createdTags = new Map();
    for (const t of etiquetasData) {
      try {
        const tag = await Tag.create(t);
        createdTags.set(tag.nombre, tag);
        console.log(`   + [tag] ${tag.nombre}`);
      } catch (err) {
        console.log(`   - [tag] skip ${t.nombre} (${err.message})`);
      }
    }
    console.log(`✅ ${createdTags.size} etiquetas insertadas.\n`);

    console.log('🏨 Insertando habitaciones + asociando etiquetas por tipo...');
    const createdRooms = [];
    for (const roomData of roomsData) {
      const room = await Room.create(roomData);
      const tipo = room.tipo;
      const nombres = tagsPorTipo[tipo] || [];
      const ids = nombres.map((n) => createdTags.get(n)?.id).filter(Boolean);
      if (ids.length > 0) {
        try {
          await room.setEtiquetas(ids);
        } catch (err) {
          console.log(`   ⚠ Hab. ${room.numero} no se pudieron asignar etiquetas: ${err.message}`);
        }
      }
      createdRooms.push(room);
      console.log(`   + Hab. ${room.numero} (${room.tipo} - $${room.precio_noche}/noche) [${room.estado}] · ${ids.length} etiquetas`);
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
    console.log('\n🏷️  Etiquetas preseedadas:');
    for (const t of createdTags.keys()) {
      console.log(`   · ${t}`);
    }

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
