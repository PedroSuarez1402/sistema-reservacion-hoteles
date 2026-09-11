import sequelize from '../config/database.js';
import Room from '../models/Room.js';
import Tag from '../models/Tag.js';
import roomsData from './data/rooms.js';
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

// Ejecuta seeding COMPLETO DEL CATÁLOGO (room-service): Habitaciones + Etiquetas + asociaciones
// NOTA: Usuarios y Reservaciones NO pertenecen a este servicio — usa booking-service/src/seeders.
async function runSeeder() {
  try {
    console.log('========================================');
    console.log('🌱 [ROOM SERVICE] Seeding catálogo: Habitaciones + Etiquetas');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente.\n');

    const options = { cascade: true, force: true };
    console.log('🗑️  Limpiando en orden: HabitacionesEtiquetas → Habitaciones → Etiquetas');
    try {
      const { HabitacionEtiqueta } = await import('../models/index.js');
      await HabitacionEtiqueta.destroy({ where: {}, truncate: options });
    } catch (_) {
      // ignore
    }
    await Room.destroy({ where: {}, truncate: options });
    await Tag.destroy({ where: {}, truncate: options });
    console.log('✅ Catálogo limpiado.\n');

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

    console.log('========================================');
    console.log('🎉 [ROOM SERVICE] Seeding catálogo completado exitosamente!');
    console.log('========================================');
    console.log('\nℹ️  Usuarios / Reservaciones son gestionados por booking-service.');
    console.log('   Corre `node src/seeders/index.js` en services/booking-service para esos datos.\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error durante el seeding de ROOM SERVICE:');
    console.error(err);
    try { await sequelize.close(); } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

runSeeder();
