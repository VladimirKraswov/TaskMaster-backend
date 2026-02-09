const fastify = require('fastify');
require('dotenv').config();

async function buildApp() {
  const app = fastify({
    trustProxy: true,
    logger: {
      level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  // Регистрация плагинов
  // Используем исправленный плагин documentation вместо swagger
  await app.register(require('./plugins/documentation'));
  
  // CORS плагин - ДОБАВЬТЕ ЭТО!
  await app.register(require('@fastify/cors'), {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });
  
  // JWT плагин
  await app.register(require('@fastify/jwt'), {
    secret: process.env.ACCESS_SECRET || 'your-access-secret',
  });
  
  await app.register(require('./plugins/authenticate'));

  // Регистрация маршрутов
  await app.register(require('./routes/auth'), { prefix: '/api' });
  await app.register(require('./routes/boards'), { prefix: '/api' });
  await app.register(require('./routes/tasks'), { prefix: '/api' });

  // Health check
  app.get('/health', {
    schema: {
      tags: ['system'],
      summary: 'Проверка состояния сервера',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  });

  // Корневой маршрут
  app.get('/', {
    schema: {
      tags: ['system'],
      summary: 'Информация о API',
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            documentation: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return {
      name: 'TaskMaster API',
      version: '1.0.0',
      documentation: '/documentation',
    };
  });

  // OpenAPI JSON (для документации)
  app.get('/openapi.json', async (request, reply) => {
    try {
      const spec = app.swagger();
      reply.send(spec);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to generate OpenAPI spec' });
    }
  });

  // Обработка ошибок
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    
    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        details: error.validation,
      });
    }

    reply.code(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
    });
  });

  return app;
}

module.exports = buildApp;