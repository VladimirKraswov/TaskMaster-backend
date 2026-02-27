import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from 'fastify';
import 'dotenv/config'; // загружает переменные окружения из .env
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swaggerUiPlugin from './plugins/swagger-ui';
import authenticatePlugin from './plugins/authenticate';
import authRoutes from './routes/auth';
import boardsRoutes from './routes/boards';
import tasksRoutes from './routes/tasks';
import columnRoutes from './routes/columns';

// Расширяем интерфейс FastifyInstance для метода swagger(), добавляемого плагином swagger-ui
interface FastifyInstanceWithSwagger extends FastifyInstance {
  swagger(): any; // или более точный тип, если известен
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: true,
    logger: {
      level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  }) as FastifyInstanceWithSwagger; // приводим к расширенному типу для доступа к .swagger()

  // Регистрация плагинов
  await app.register(swaggerUiPlugin);

  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.ACCESS_SECRET || 'your-access-secret',
  });

  await app.register(authenticatePlugin);

  // Маршруты
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(boardsRoutes, { prefix: '/api' });
  await app.register(tasksRoutes, { prefix: '/api' });
  await app.register(columnRoutes, { prefix: '/api' });

  // Health check
  app.get(
    '/health',
    {
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
    },
    async () => {
      return {
        status: 'OK',
        timestamp: new Date().toISOString(),
      };
    }
  );

  // Корневой маршрут
  app.get(
    '/',
    {
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
    },
    async () => {
      return {
        name: 'TaskMaster API',
        version: '1.0.0',
        documentation: '/documentation',
      };
    }
  );

  // OpenAPI JSON (для документации)
  app.get('/openapi.json', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const spec = app.swagger(); // теперь метод доступен благодаря приведению типа
      reply.send(spec);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to generate OpenAPI spec' });
    }
  });

  // Глобальный обработчик ошибок
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
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

export default buildApp;