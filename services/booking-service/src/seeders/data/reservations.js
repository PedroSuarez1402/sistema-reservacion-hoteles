// Calcula fecha ISO con offset días desde hoy
function getDate(offsetDays) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

const reservations = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    cliente_id: '00000000-0000-0000-0000-000000000003', // Juan Pérez
    usuario_id: '00000000-0000-0000-0000-000000000002', // Recepcionista María
    habitacion_id: '10000000-0000-0000-0000-000000000001', // Habitación 101 ($45)
    fecha_inicio: getDate(2),
    fecha_fin: getDate(5),
    precio_total: '135.00',
    anticipo: '67.50', // 50% abono
    estado: 'CONFIRMADA',
    metodo_pago: 'EFECTIVO',
    tipo_reserva: 'ANTICIPADA',
    observaciones_recepcion: 'Cliente frecuente, viaja con esposa e hija. Abonó 50%.',
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    cliente_id: '00000000-0000-0000-0000-000000000006', // Pedro Suárez
    usuario_id: '00000000-0000-0000-0000-000000000002', // Recepcionista María
    habitacion_id: '10000000-0000-0000-0000-000000000003', // Habitación 201 ($75)
    fecha_inicio: getDate(7),
    fecha_fin: getDate(11),
    precio_total: '300.00',
    anticipo: '150.00',
    estado: 'CONFIRMADA',
    metodo_pago: 'TRANSFERENCIA',
    tipo_reserva: 'ANTICIPADA',
    observaciones_recepcion: 'Check-in esperado después de las 3:00 PM con su hijo Santiago.',
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    cliente_id: '00000000-0000-0000-0000-000000000007', // Andrea Valdiri
    usuario_id: '00000000-0000-0000-0000-000000000002', // Recepcionista María
    habitacion_id: '10000000-0000-0000-0000-000000000005', // Habitación 301 Suite ($150)
    fecha_inicio: getDate(10),
    fecha_fin: getDate(14),
    precio_total: '600.00',
    anticipo: '600.00', // 100% pagado
    estado: 'CONFIRMADA',
    metodo_pago: 'TARJETA',
    tipo_reserva: 'ANTICIPADA',
    observaciones_recepcion: 'Suite decorada para aniversario. Pago total recibido.',
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    cliente_id: '00000000-0000-0000-0000-000000000004', // Ana Gómez
    usuario_id: '00000000-0000-0000-0000-000000000002',
    habitacion_id: '10000000-0000-0000-0000-000000000002', // Habitación 102 ($45)
    fecha_inicio: getDate(-6),
    fecha_fin: getDate(-2),
    precio_total: '180.00',
    anticipo: '180.00',
    estado: 'FINALIZADA',
    metodo_pago: 'EFECTIVO',
    tipo_reserva: 'ANTICIPADA',
    observaciones_recepcion: 'Estadía finalizada sin novedades.',
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    cliente_id: '00000000-0000-0000-0000-000000000005', // Carlos Ruiz
    usuario_id: '00000000-0000-0000-0000-000000000002',
    habitacion_id: '10000000-0000-0000-0000-000000000004', // Habitación 202 ($80)
    fecha_inicio: getDate(1),
    fecha_fin: getDate(4),
    precio_total: '240.00',
    anticipo: '0.00',
    estado: 'CANCELADA',
    metodo_pago: 'EFECTIVO',
    tipo_reserva: 'ANTICIPADA',
    observaciones_recepcion: 'Cancelación solicitada por motivo de fuerza mayor.',
  },
];

export default reservations;
