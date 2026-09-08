import sequelize from '../config/database.js';
import { Tag, Room } from '../models/index.js';
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

// Seed etiquetas y asocia a habitaciones
async function run() {
  try {
    await sequelize.authenticate();
    console.log('🔗 Conexión BD OK\n');
    console.log('🏷️  Insertando etiquetas (ignore duplicates)...');
    const createdTags = new Map();
    for (const t of etiquetasData) {
      const nombre = t.nombre.trim();
      try {
        const [tag, _created] = await Tag.findOrCreate({
          where: { nombre },
          defaults: { descripcion: t.descripcion || null },
        });
        createdTags.set(nombre, tag);
        console.log(`   · ${nombre}`);
      } catch (err) {
        console.log(`   - skip ${nombre}: ${err.message}`);
      }
    }
    console.log(`✅ ${createdTags.size} etiquetas procesadas.\n`);

    console.log('🏨 Asociando etiquetas a habitaciones existentes (sin etiquetas aún)...');
    const rooms = await Room.findAll({ include: [{ association: 'etiquetas' }] });
    let asociadas = 0;
    for (const r of rooms) {
      const current = (r.etiquetas || []).length;
      if (current > 0) {
        console.log(`   · Hab. ${r.numero} ya tiene ${current} etiquetas. Skip.`);
        continue;
      }
      const nombres = tagsPorTipo[r.tipo] || [];
      const ids = nombres.map((n) => createdTags.get(n)?.id).filter(Boolean);
      if (ids.length === 0) continue;
      try {
        await r.setEtiquetas(ids);
        asociadas++;
        console.log(`   + Hab. ${r.numero} (${r.tipo}) · ${ids.length} etiquetas asignadas`);
      } catch (err) {
        console.log(`   ! Hab. ${r.numero} error: ${err.message}`);
      }
    }
    console.log(`\n🎉 Listo. Etiquetas asignadas a ${asociadas} habitación(es).`);
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    try { await sequelize.close(); } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

run();
