import { FastifyPluginAsync } from "fastify"
import db from "../utils/database"

interface Board {
  id: number
  name: string
  user_id: number
  created_at: string
  updated_at: string
}

interface IdParams {
  id: number
}

interface CreateBoardBody {
  name: string
}

const boardsRoutes: FastifyPluginAsync = async (fastify) => {
  /*
  =====================================================
  GET ALL BOARDS
  =====================================================
  */
  fastify.get(
    "/boards",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["boards"],
        summary: "Получить все доски пользователя",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                name: { type: "string" },
                user_id: { type: "number" },
                created_at: { type: "string", format: "date-time" },
                updated_at: { type: "string", format: "date-time" }
              }
            }
          }
        }
      } as any
    },
    async (request): Promise<Board[]> => {
      return db("boards")
        .where("user_id", request.user.id)
        .orderBy("created_at", "desc")
    }
  )

  /*
  =====================================================
  GET BOARD BY ID
  =====================================================
  */
  fastify.get<{ Params: IdParams }>(
    "/boards/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["boards"],
        summary: "Получить доску по ID",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "number" }
          }
        }
      } as any
    },
    async (request, reply) => {
      const board = await db("boards")
        .where({
          id: request.params.id,
          user_id: request.user.id
        })
        .first()

      if (!board) {
        return reply.code(404).send({ error: "Board not found" })
      }

      return board
    }
  )

  /*
  =====================================================
  CREATE BOARD
  =====================================================
  */
  fastify.post<{ Body: CreateBoardBody }>(
    "/boards",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["boards"],
        summary: "Создать новую доску",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 }
          }
        }
      } as any
    },
    async (request, reply) => {
      const [id] = await db("boards").insert({
        name: request.body.name,
        user_id: request.user.id
      })

      return reply.code(201).send({
        id,
        name: request.body.name,
        user_id: request.user.id
      })
    }
  )

  /*
  =====================================================
  UPDATE BOARD
  =====================================================
  */
  fastify.put<{ Params: IdParams; Body: CreateBoardBody }>(
    "/boards/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["boards"],
        summary: "Обновить доску",
        security: [{ bearerAuth: [] }]
      } as any
    },
    async (request, reply) => {
      const updated = await db("boards")
        .where({
          id: request.params.id,
          user_id: request.user.id
        })
        .update({ name: request.body.name })

      if (!updated) {
        return reply.code(404).send({ error: "Board not found" })
      }

      return { message: "Board updated successfully" }
    }
  )

  /*
  =====================================================
  DELETE BOARD
  =====================================================
  */
  fastify.delete<{ Params: IdParams }>(
    "/boards/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["boards"],
        summary: "Удалить доску",
        security: [{ bearerAuth: [] }]
      } as any
    },
    async (request, reply) => {
      const deleted = await db("boards")
        .where({
          id: request.params.id,
          user_id: request.user.id
        })
        .del()

      if (!deleted) {
        return reply.code(404).send({ error: "Board not found" })
      }

      return { message: "Board deleted successfully" }
    }
  )
}

export default boardsRoutes