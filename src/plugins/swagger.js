const fp = require('fastify-plugin');
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');
const path = require('path');

module.exports = fp(async function (fastify, opts) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'TaskMaster API',
        description: 'API для управления задачами и досками',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'http://192.168.31.32:3000',
          description: 'Local network server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'auth', description: 'Аутентификация' },
        { name: 'boards', description: 'Управление досками' },
        { name: 'tasks', description: 'Управление задачами' },
      ],
    },
  });

  // Регистрируем статические файлы для Swagger UI
  await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '..', 'node_modules', 'swagger-ui-dist'),
    prefix: '/documentation/static/',
    decorateReply: false,
    wildcard: false
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: false, // Отключаем CSP для локального использования
    transformStaticCSP: (header) => header,
    uiHooks: {
      onRequest: function (request, reply, next) { next(); },
      preHandler: function (request, reply, next) { next(); }
    }
  });
});