import app from './src/app.js';
import { sequelize, testConnection } from './src/models/index.js';

const PORT = Number(process.env.PORT) || 3000;

// Inicia servidor y configura shutdown graceful
async function bootstrap() {
  try {
    console.log('========================================');
    console.log('🚀 Iniciando servidor...');
    console.log('========================================');

    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }

    await sequelize.sync({ alter: false });
    console.log('✅ Modelos sincronizados correctamente.');

    // Callback al iniciar servidor HTTP
    const server = app.listen(PORT, function onListen() {
      console.log('========================================');
      console.log('✅ Servidor corriendo exitosamente!');
      console.log('📍 URL Base : http://localhost:' + PORT);
      console.log('🩺 Health  : http://localhost:' + PORT + '/api/v1/health');
      console.log('📚 Docs    : http://localhost:' + PORT + '/');
      console.log('========================================');
    });

    // Cierra servidor y conexión BD limpiamente
    async function gracefulShutdown(signal) {
      console.log('\n📡 Señal recibida:', signal);
      console.log('🛑 Cerrando servidor HTTP...');
      // Callback cuando servidor HTTP se cierra
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
      // Callback timeout: fuerza salida tras 10s
      setTimeout(function onTimeout() {
        console.error('⏱️ Timeout: Forzando salida.');
        process.exit(1);
      }, 10000);
    }

    // Manejador señal SIGINT (Ctrl+C)
    process.on('SIGINT', function onSigint() {
      gracefulShutdown('SIGINT');
    });
    // Manejador señal SIGTERM
    process.on('SIGTERM', function onSigterm() {
      gracefulShutdown('SIGTERM');
    });
    // Manejador excepciones no capturadas
    process.on('uncaughtException', function onUncaughtException(err) {
      console.error('💥 Uncaught Exception:', err);
      process.exit(1);
    });
    // Manejador promesas sin reject
    process.on('unhandledRejection', function onUnhandledRejection(reason) {
      console.error('💥 Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

bootstrap();
