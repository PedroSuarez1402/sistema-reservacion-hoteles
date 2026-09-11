import app from './src/app.js';
import { sequelize, testConnection } from './src/models/index.js';
import http from 'http';

const PORT = Number(process.env.PORT) || 4001;

function printBanner(port) {
  console.log('========================================');
  console.log('✅ ROOM SERVICE corriendo exitosamente!');
  console.log('📍 Puerto   : ' + port);
  console.log('🩺 Health  : http://localhost:' + port + '/api/health');
  console.log('🏨 API Habitaciones: http://localhost:' + port + '/api/rooms');
  console.log('🏷️  API Etiquetas   : http://localhost:' + port + '/api/tags');
  console.log('========================================');
}

async function bootstrap() {
  try {
    console.log('========================================');
    console.log('🚀 Iniciando ROOM SERVICE...');
    console.log('========================================');

    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }

    await sequelize.sync({ alter: false });
    console.log('✅ Modelos Room sincronizados correctamente.');

    const server = http.createServer(app);

    server.on('error', function onError(err) {
      if (err && err.code === 'EADDRINUSE') {
        console.error(
          '💥 EADDRINUSE: El puerto ' + PORT + ' ya está ocupado. ' +
          'Usa en PowerShell: Get-NetTCPConnection -LocalPort ' + PORT + ' | %% { Stop-Process -Id $_.OwningProcess -Force }'
        );
        process.exit(1);
      }
      console.error('💥 Error del servidor HTTP:', err);
      process.exit(1);
    });

    server.listen(PORT, function onListen() {
      printBanner(PORT);
    });

    async function gracefulShutdown(signal) {
      console.log('\n📡 Señal recibida:', signal);
      console.log('🛑 Cerrando servidor HTTP...');
      server.close(async function onClosed() {
        console.log('🛑 Servidor HTTP cerrado.');
        try { await sequelize.close(); console.log('🛑 BD cerrada.'); } catch (err) { console.error('❌ Error cerrando BD:', err.message); }
        process.exit(0);
      });
      setTimeout(function timeout() {
        console.error('⏱️ Timeout graceful shutdown (10s). Forzando salida.');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGINT', function () { gracefulShutdown('SIGINT'); });
    process.on('SIGTERM', function () { gracefulShutdown('SIGTERM'); });
    process.on('uncaughtException', function (err) {
      console.error('💥 Uncaught Exception:', err && err.stack ? err.stack : err);
      gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', function (reason) {
      console.error('💥 Unhandled Rejection:', reason);
    });
  } catch (error) {
    console.error('❌ Error al iniciar ROOM SERVICE:', error && error.stack ? error.stack : error);
    process.exit(1);
  }
}

bootstrap();
