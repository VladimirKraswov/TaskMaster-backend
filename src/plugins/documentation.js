const fp = require('fastify-plugin');
const swagger = require('@fastify/swagger');

module.exports = fp(async function (fastify, opts) {
  // Генерация OpenAPI спецификации
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
          url: `http://${process.env.HOST || '0.0.0.0'}:${process.env.PORT || 3000}`,
          description: 'Current server',
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

  // Простая документация
  fastify.get('/documentation', async (request, reply) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TaskMaster API Documentation</title>
      <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.12.0/swagger-ui.css">
      <style>
        html { box-sizing: border-box; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
        #swagger-ui { padding: 20px; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.12.0/swagger-ui-bundle.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.12.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "StandaloneLayout",
            docExpansion: 'list',
            defaultModelsExpandDepth: 3,
            defaultModelExpandDepth: 3
          });
          window.ui = ui;
        }
      </script>
    </body>
    </html>
    `;
    
    reply.type('text/html').send(html);
  });
});