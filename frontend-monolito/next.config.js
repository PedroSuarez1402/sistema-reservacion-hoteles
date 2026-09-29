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
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';
    return [
      // Proxy: alias /api/auth/* → endpoint de usuarios en el monolito
      {
        source: '/api/auth/:path*',
        destination: `${BACKEND_URL}/users/:path*`,
      },
      // Proxy: todas las rutas de API (/api/rooms, /api/tags, /api/reservations, /api/users, /api/paquetes)
      // se redirigen a http://localhost:4000/api/v1/*
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
      // Proxy: uploads / imágenes estáticas servidas por el backend monolítico
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:4000/api/v1/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

