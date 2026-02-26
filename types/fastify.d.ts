// types/fastify.d.ts
import "fastify"
import "@fastify/jwt"

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ) => Promise<void>
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: number
      username: string
    }
    user: {
      id: number
      username: string
    }
  }
}