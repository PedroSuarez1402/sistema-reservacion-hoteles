// Datos iniciales de prueba para paquetes turísticos
export default [
  {
    id: 'b0000001-0000-0000-0000-000000000001',
    nombre: 'Paquete Romántico',
    descripcion: 'Una velada romántica inolvidable. Incluye cena gourmet de 3 tiempos y una botella de vino reserva en la habitación.',
    descuento_porcentaje: 10.00,
    estado: 'ACTIVO',
    servicios_incluidos: [
      {
        servicio_id: 'a0000001-0000-0000-0000-000000000003', // Cena Gourmet 3 Tiempos
        cantidad: 1,
      },
      {
        servicio_id: 'a0000001-0000-0000-0000-000000000004', // Botella de Vino Reserva
        cantidad: 1,
      },
    ],
  },
  {
    id: 'b0000001-0000-0000-0000-000000000002',
    nombre: 'Paquete Bienestar & Relax',
    descripcion: 'Recarga energías y desconéctate del estrés con acceso completo a nuestro circuito de spa y sauna más desayuno buffet diario.',
    descuento_porcentaje: 15.00,
    estado: 'ACTIVO',
    servicios_incluidos: [
      {
        servicio_id: 'a0000001-0000-0000-0000-000000000002', // Circuito Spa & Sauna
        cantidad: 1,
      },
      {
        servicio_id: 'a0000001-0000-0000-0000-000000000001', // Desayuno Buffet
        cantidad: 1,
      },
    ],
  },
];
