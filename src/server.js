const buildApp = require('./app');

async function startServer() {
  const app = await buildApp();
  
  try {
    const port = parseInt(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    
    console.log(`🚀 Server is running on http://${host}:${port}`);
    console.log(`📚 API Documentation: http://${host}:${port}/documentation`);
    console.log(`🏥 Health check: http://${host}:${port}/health`);
    
    // Обработка сигналов завершения
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        app.log.info(`Received ${signal}, shutting down gracefully...`);
        await app.close();
        process.exit(0);
      });
    });
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Запуск сервера
startServer();