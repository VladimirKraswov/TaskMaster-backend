import fp from "fastify-plugin"
import { FastifyPluginAsync } from "fastify"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "TaskMaster API",
        description: "API для управления задачами и досками",
        version: "1.0.0"
      },
      servers: [
        {
          url: "https://task-master.xserver-krv.ru",
          description: "Production server"
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      },
      tags: [
        { name: "auth", description: "Аутентификация" },
        { name: "boards", description: "Управление досками" },
        { name: "tasks", description: "Управление задачами" }
      ]
    }
  })

  await fastify.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    },
    staticCSP: false,
    transformStaticCSP: (header) => header
  })
}

export default fp(swaggerPlugin)