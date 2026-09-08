// Calcula fecha ISO con offset días desde hoy
function getDate(offsetDays, hour = 12) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

const reservations = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    usuario_id: '00000000-0000-0000-0000-000000000003',
    habitacion_id: '10000000-0000-0000-0000-000000000001',
    fecha_inicio: getDate(2),
    fecha_fin: getDate(5),
    precio_total: '135.00',
    estado: 'CONFIRMADA',
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    usuario_id: '00000000-0000-0000-0000-000000000004',
    habitacion_id: '10000000-0000-0000-0000-000000000003',
    fecha_inicio: getDate(7),
    fecha_fin: getDate(11),
    precio_total: '300.00',
    estado: 'PENDIENTE',
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    usuario_id: '00000000-0000-0000-0000-000000000005',
    habitacion_id: '10000000-0000-0000-0000-000000000005',
    fecha_inicio: getDate(10),
    fecha_fin: getDate(14),
    precio_total: '600.00',
    estado: 'CONFIRMADA',
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    usuario_id: '00000000-0000-0000-0000-000000000003',
    habitacion_id: '10000000-0000-0000-0000-000000000002',
    fecha_inicio: getDate(-6),
    fecha_fin: getDate(-2),
    precio_total: '180.00',
    estado: 'FINALIZADA',
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    usuario_id: '00000000-0000-0000-0000-000000000004',
    habitacion_id: '10000000-0000-0000-0000-000000000004',
    fecha_inicio: getDate(1),
    fecha_fin: getDate(4),
    precio_total: '240.00',
    estado: 'CANCELADA',
  },
];

export default reservations;
