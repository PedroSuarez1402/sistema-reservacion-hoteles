import app from './src/app.js';
import { sequelize, testConnection } from './src/models/index.js';

const PORT = Number(process.env.PORT) || 4001;

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

    const server = app.listen(PORT, function onListen() {
      console.log('========================================');
      console.log('✅ ROOM SERVICE corriendo exitosamente!');
      console.log('📍 Puerto   : ' + PORT);
      console.log('🩺 Health  : http://localhost:' + PORT + '/api/health');
      console.log('🏨 API Habitaciones: http://localhost:' + PORT + '/api/rooms');
      console.log('🏷️  API Etiquetas   : http://localhost:' + PORT + '/api/tags');
      console.log('========================================');
    });

    async function gracefulShutdown(signal) {
      console.log('\n📡 Señal recibida:', signal);
      console.log('🛑 Cerrando servidor HTTP...');
      server.close(async function onServerClosed() {
        console.log('🛑 Servidor HTTP cerrado.');
        try {
          await sequelize.close();
          console.log('🛑 Conexión a base de datos cerrada.');
        } catch (err) {
          console.error('❌ Error cerrando BD:', err.message);
        }
        process.exit(0);
      });
      setTimeout(function onTimeout() {
        console.error('⏱️ Timeout: Forzando salida.');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGINT', function onSigint() { gracefulShutdown('SIGINT'); });
    process.on('SIGTERM', function onSigterm() { gracefulShutdown('SIGTERM'); });
    process.on('uncaughtException', function onUncaughtException(err) {
      console.error('💥 Uncaught Exception:', err);
      process.exit(1);
    });
    process.on('unhandledRejection', function onUnhandledRejection(reason) {
      console.error('💥 Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Error al iniciar ROOM SERVICE:', error.message);
    process.exit(1);
  }
}

bootstrap();
