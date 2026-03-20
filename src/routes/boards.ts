import { FastifyPluginAsync } from "fastify"
import db from "../utils/database"
import { createBoardSchema, deleteBoardSchema, editBoardSchema, getBoardSchema, getBoardsSchema } from "../schemas/boards"

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

interface GetBoardsQuery {
  search?: string

  createdFrom?: string
  createdTo?: string

  updatedFrom?: string
  updatedTo?: string

  sortBy?: "created_at" | "updated_at" | "name"
  sortOrder?: "asc" | "desc"

  limit?: number
  offset?: number
}

const boardsRoutes: FastifyPluginAsync = async (fastify) => {
  /*
  =====================================================
  GET ALL BOARDS
  =====================================================
  */
  fastify.get<{Querystring: GetBoardsQuery}>(
    "/boards",
    {
      preHandler: [fastify.authenticate],
      schema: getBoardsSchema
    },
    async (request): Promise<Board[]> => {
      const query = request.query

      const {
        search,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        sortBy = "created_at",
        sortOrder = "desc",
        limit = 20,
        offset = 0
      } = query

      const qb = db("boards").where("user_id", request.user.id)
      if(search){
        qb.andWhere("name", "like", `%${search}%`)
      }
      if (createdFrom) {
        qb.andWhere("created_at", ">=", createdFrom)
      }

      if (createdTo) {
        qb.andWhere("created_at", "<=", createdTo)
      }

      if (updatedFrom) {
        qb.andWhere("updated_at", ">=", updatedFrom)
      }

      if (updatedTo) {
        qb.andWhere("updated_at", "<=", updatedTo)
      }
      qb.orderBy(sortBy ?? "created_at", sortOrder)
      qb.limit(limit).offset(offset)
      return await qb
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
      schema: getBoardSchema
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
      schema: createBoardSchema
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
      schema: editBoardSchema
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
      schema: deleteBoardSchema
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