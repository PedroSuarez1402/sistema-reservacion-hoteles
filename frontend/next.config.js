/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Permite cargar imágenes desde cualquier dominio HTTPS en producción
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // REWRITES (Proxy / API Gateway a nivel de Next.js)
  //
  // ¿Qué hace?
  //   Intercepta peticiones HTTP que coinciden con `source` y las REDIRIGE
  //   internamente hacia `destination`, SIN cambiar la URL visible en el
  //   navegador. A diferencia de los redirects (301/302), es transparente
  //   para el cliente.
  //
  // ¿Para qué sirve en este proyecto?
  //   Evita configuraciones complejas de CORS en el backend. El frontend
  //   llama a /api/* en su MISMO origen (localhost:3000) y Next.js reenvía
  //   la petición al backend real (localhost:4001/4002). Para el navegador
  //   es la misma URL → no hay preflight CORS.
  //
  // Patrón de software al que pertenece:
  //   - API GATEWAY / REVERSE PROXY patrón.
  //   - Desacopla clientes (frontend) de los endpoints reales (backends).
  //   - Permite rutas amigables, balanceo, versión de APIs sin tocar clientes.
  //   - Aprovecha el principio de "Single Origin" evitando configuraciones CORS.
  // ---------------------------------------------------------------------------
  async rewrites() {
    return [
      // Proxy: módulo Habitaciones → backend de inventario (puerto 4001)
      {
        source: '/api/rooms/:path*',
        destination: 'http://localhost:4001/api/rooms/:path*',
      },
      // Proxy: módulo Etiquetas → backend de inventario (puerto 4001)
      {
        source: '/api/tags/:path*',
        destination: 'http://localhost:4001/api/tags/:path*',
      },
      // Proxy: módulo Reservaciones → backend de reservas (puerto 4002)
      {
        source: '/api/reservations/:path*',
        destination: 'http://localhost:4002/api/reservations/:path*',
      },
      // Proxy: módulo Usuarios → backend de reservas (puerto 4002)
      {
        source: '/api/users/:path*',
        destination: 'http://localhost:4002/api/users/:path*',
      },
      // Proxy: alias /api/auth/* → mismo endpoint de usuarios
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:4002/api/users/:path*',
      },
      // Proxy: fallback CATCH-ALL → cualquier otra /api/* va al puerto 4002
      {
        source: '/api/:path*',
        destination: 'http://localhost:4002/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

