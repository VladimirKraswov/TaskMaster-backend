import { FastifyPluginAsync } from "fastify"
import db from "../utils/database"

interface BoardParams {
  boardId: number
}

interface TaskParams {
  id: number
}

interface ColumnParams {
  boardId: number
  columnId: number
}

interface CreateColumnBody {
  title: string
}

interface UpdateColumnBody {
  title: string
  display_order: string
}

interface CreateTaskBody {
  title: string
  colId: number
  description?: string
}

interface UpdateTaskBody {
  title?: string
  completed?: boolean
  col_id?: number
  description?: string
  display_order?: string
}

const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  /*
  =====================================================
  GET BOARD TASKS (columns + tasks)
  =====================================================
  */
  fastify.get<{ Params: BoardParams }>(
    "/boards/:boardId/tasks",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["tasks"],
        summary: "Получить задачи доски",
        security: [{ bearerAuth: [] }]
      } as any
    },
    async (request, reply) => {
      const { boardId } = request.params

      const board = await db("boards")
        .where({ id: boardId })
        .first()

      if (!board) {
        return reply.code(404).send({ error: "Board not found" })
      }

      const cols = await db("cols")
        .where("board_id", boardId)
        .orderBy("display_order", "asc")

      if (!cols.length) return []

      const colIds = cols.map((c) => c.id)

      const tasks = await db("tasks")
        .whereIn("col_id", colIds)
        .orderBy("display_order", "asc")

      const tasksByCol: Record<number, any[]> = {}

      for (const task of tasks) {
        if (!tasksByCol[task.col_id]) {
          tasksByCol[task.col_id] = []
        }
        tasksByCol[task.col_id].push(task)
      }

      return cols.map((col) => ({
        ...col,
        tasks: tasksByCol[col.id] ?? []
      }))
    }
  )

  /*
  =====================================================
  GET TASK BY ID
  =====================================================
  */
  fastify.get<{ Params: TaskParams }>(
    "/tasks/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["tasks"],
        summary: "Получить задачу по ID",
        security: [{ bearerAuth: [] }]
      } as any
    },
    async (request, reply) => {
      const task = await db("tasks")
        .where({ id: request.params.id })
        .first()

      if (!task) {
        return reply.code(404).send({ error: "Task not found" })
      }

      return task
    }
  )

  /*
  =====================================================
  CREATE COLUMN
  =====================================================
  */
  fastify.post<{ Params: BoardParams; Body: CreateColumnBody }>(
    "/boards/:boardId/columns",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["tasks"],
        summary: "Создать колонку"
      } as any
    },
    async (request, reply) => {
      const { boardId } = request.params
      const { title } = request.body

      const board = await db("boards")
        .where({ id: boardId })
        .first()

      if (!board) {
        return reply.code(404).send({ error: "Board not found" })
      }

      const [id] = await db("cols").insert({
        title,
        board_id: boardId
      })

      return reply.code(201).send({
        id,
        title,
        board_id: boardId
      })
    }
  )

  /*
  =====================================================
  UPDATE COLUMN
  =====================================================
  */
  fastify.put<{ Params: ColumnParams; Body: UpdateColumnBody }>(
    "/boards/:boardId/columns/:columnId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["tasks"],
        summary: "Обновить колонку"
      } as any
    },
    async (request, reply) => {
      const { boardId, columnId } = request.params
      const { title, display_order } = request.body

      const column = await db("cols")
        .where({ id: columnId, board_id: boardId })
        .first()

      if (!column) {
        return reply.code(404).send({ error: "Column not found" })
      }

      await db("cols")
        .where({ id: columnId })
        .update({ title, display_order })

      return { id: columnId, title, board_id: boardId }
    }
  )

  /*
  =====================================================
  DELETE COLUMN
  =====================================================
  */
  fastify.delete<{ Params: ColumnParams }>(
    "/boards/:boardId/columns/:columnId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["tasks"],
        summary: "Удалить колонку"
      } as any
    },
    async (request, reply) => {
      const deleted = await db("cols")
        .where({
          id: request.params.columnId,
          board_id: request.params.boardId
        })
        .delete()

      if (!deleted) {
        return reply.code(404).send({ error: "Column not found" })
      }

      return reply.code(204).send()
    }
  )

  /*
  =====================================================
  CREATE TASK
  =====================================================
  */
  fastify.post<{ Params: BoardParams; Body: CreateTaskBody }>(
    "/boards/:boardId/tasks",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["tasks"],
        summary: "Создать задачу"
      } as any
    },
    async (request, reply) => {
      const { boardId } = request.params
      const { title, colId, description } = request.body

      const col = await db("cols")
        .where({ id: colId, board_id: boardId })
        .first()

      if (!col) {
        return reply.code(400).send({ error: "Invalid data" })
      }

      const [id] = await db("tasks").insert({
        title,
        col_id: colId,
        description: description ?? "",
        completed: false
      })

      return reply.code(201).send({
        id,
        title,
        board_id: boardId,
        col_id: colId
      })
    }
  )

  /*
  =====================================================
  UPDATE TASK
  =====================================================
  */
  fastify.put<{ Params: TaskParams; Body: UpdateTaskBody }>(
    "/tasks/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["tasks"],
        summary: "Обновить задачу"
      } as any
    },
    async (request, reply) => {
      const task = await db("tasks")
        .where({ id: request.params.id })
        .first()

      if (!task) {
        return reply.code(404).send({ error: "Task not found" })
      }

      const updateData: Partial<UpdateTaskBody> & {
        updated_at?: any
      } = {}

      if (request.body.title !== undefined)
        updateData.title = request.body.title
      if (request.body.completed !== undefined)
        updateData.completed = request.body.completed
      if (request.body.col_id !== undefined)
        updateData.col_id = request.body.col_id
      if (request.body.description !== undefined)
        updateData.description = request.body.description
      if (request.body.display_order !== undefined)
        updateData.display_order = request.body.display_order

      updateData.updated_at = db.fn.now()

      await db("tasks")
        .where({ id: request.params.id })
        .update(updateData)

      return { message: "Task updated successfully" }
    }
  )

  /*
  =====================================================
  DELETE TASK
  =====================================================
  */
  fastify.delete<{ Params: TaskParams }>(
    "/tasks/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["tasks"],
        summary: "Удалить задачу"
      } as any
    },
    async (request, reply) => {
      const deleted = await db("tasks")
        .where({ id: request.params.id })
        .delete()

      if (!deleted) {
        return reply.code(404).send({ error: "Task not found" })
      }

      return { message: "Task deleted successfully" }
    }
  )
}

export default tasksRoutes