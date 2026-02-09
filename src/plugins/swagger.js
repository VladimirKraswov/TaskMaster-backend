const fp = require('fastify-plugin');
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');

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

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });
});