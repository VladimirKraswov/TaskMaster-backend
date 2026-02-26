import fp from "fastify-plugin"
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify"

const authenticatePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
        await request.jwtVerify()
      } catch {
        reply.code(401).send({ error: "Unauthorized" })
      }
    }
  )
}

export default fp(authenticatePlugin)