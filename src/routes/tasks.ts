import { FastifyPluginAsync } from "fastify"
import db from "../utils/database"
import { createTaskSchema, deleteTaskSchema, editTaskSchema, getAllTasksBoardSchema, getTaskByIdSchema, moveTaskSchema } from "../schemas/tasks"
import { LexoRank } from "lexorank"

interface BoardParams {
  boardId: number
}

interface TaskParams {
  id: number
}

interface MoveTaskBody{
  colId: number
  targetTaskId?: number;
  positionVersion: number
  placement: 'before' | 'after' | 'start' | 'end'
}

interface CreateTaskBody {
  title: string
  colId: number
  description?: string
  tags?: string
}

interface UpdateTaskBody {
  title?: string
  description?: string
  user_id?: number
  contentVersion: number
  tags?: string
}

type TasksQuery = {
  search?: string

  userId?: number
  noUser?: boolean

  createdFrom?: string
  createdTo?: string

  tags?: string

  updatedFrom?: string
  updatedTo?: string

  sortBy?: 'created_at' | 'updated_at' | 'title' | 'display_order'
  sortOrder?: 'asc' | 'desc'

  limit?: number
  offset?: number
}

const tagsCompire = (tags: string | null | undefined, search: string | null | undefined) => {
  if(!search)return true
  if(!tags) return false
  const tagList = tags.split(",").map(i=>i.trim())
  const searchList = search.split(",").map(i=>i.trim())
  return searchList.every(s=>tagList.includes(s))
}

const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  /*
  =====================================================
  GET BOARD TASKS (columns + tasks)
  =====================================================
  */
  fastify.get<{ Params: BoardParams, Querystring: TasksQuery }>(
    "/boards/:boardId/tasks",
    {
      preHandler: [fastify.authenticate],
      schema: getAllTasksBoardSchema,
    },
    async (request, reply) => {
      const { boardId } = request.params
      const { search, userId, noUser, createdFrom, createdTo, updatedFrom, updatedTo } = request.query

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

      const query = db("tasks")
        .select('id', 'title', 'col_id', 'user_id', 'display_order', 'contentVersion', 'positionVersion', 'tags')
        .whereIn("col_id", colIds)

      if(search){
        query.andWhere((qb)=>{
          qb.whereLike('title', `%${search}%`)
          .orWhereLike('description', `%${search}%`)
          .orWhereLike(`tags`, `%${search}%`)
        })
      }

      if (userId) {
        query.where('user_id', userId)
      }

      if (noUser) {
        query.whereNull('user_id')
      }

      if (createdFrom) {
        query.where('created_at', '>=', createdFrom)
      }

      if (createdTo) {
        query.where('created_at', '<=', createdTo)
      }

      if (updatedFrom) {
        query.where('updated_at', '>=', updatedFrom)
      }

      if (updatedTo) {
        query.where('updated_at', '<=', updatedTo)
      }

      const sortBy = request.query.sortBy || 'display_order'
      const sortOrder = request.query.sortOrder || 'asc'

      const tasksCond = await query.orderBy(sortBy, sortOrder)

      const tasks = tasksCond.filter(item=>tagsCompire(item.tags, request.query.tags))
       
      const tasksByCol: Record<number, any[]> = {}

      for (const task of tasks) {
        if (!tasksByCol[task.col_id]) {
          tasksByCol[task.col_id] = []
        }
        tasksByCol[task.col_id].push(task)
      }

      const resData = cols.map((col) => ({
        ...col,
        tasks: tasksByCol[col.id] ?? []
      }))
      return{
        items: resData
      }
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
      schema: getTaskByIdSchema
    },
    async (request, reply) => {
      const task = await db("tasks")
        .join("cols", "tasks.col_id", "cols.id")
        .select(
          "tasks.*",
          "cols.board_id"
        )
        .where("tasks.id", request.params.id)
        .first();

      if (!task) {
        return reply.code(404).send({ error: "Task not found" })
      }

      return task
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
      schema: createTaskSchema
    },
    async (request, reply) => {
      const { boardId } = request.params
      const { title, colId, description, tags } = request.body

      const col = await db("cols")
        .where({ id: colId, board_id: boardId })
        .first()

      if (!col) {
        return reply.code(400).send({ error: "Invalid data" })
      }


      const lastTask = await db("tasks")
        .where("col_id", colId)
        .orderBy("display_order", "desc").first()
      
      let display_order = LexoRank.middle().toString()
      if(lastTask){
        const last = LexoRank.parse(lastTask.display_order)
        display_order = last.genNext().toString()
      }

      const [id] = await db("tasks").insert({
        title,
        col_id: colId,
        description: description ?? "",
        completed: false,
        display_order,
        tags
      })

      return reply.code(201).send({
        id,
        title,
        board_id: boardId,
        col_id: colId,
        tags
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
      schema: editTaskSchema
    },
    async (request, reply) => {
      const task = await db("tasks")
        .join("cols", "tasks.col_id", "cols.id")
        .select(
          "tasks.*",
          "cols.board_id"
        )
        .where("tasks.id", request.params.id)
        .first()

      if (!task) {
        return reply.code(404).send({ error: "Task not found" })
      }

      if (task.contentVersion !== request.body.contentVersion) {
        return reply.code(409).send({
          error: "Position conflict",
          message: "The task has been moved by another user. Please refresh and try again.",
          data: task
        });
      }

      const updateData: Partial<UpdateTaskBody> & {
        updated_at?: any
      } = {}

      if (request.body.title !== undefined)
        updateData.title = request.body.title
      if (request.body.description !== undefined)
        updateData.description = request.body.description
      if (request.body.tags !== undefined)
        updateData.tags = request.body.tags
      if (request.body.user_id !== undefined)
        updateData.user_id = request.body.user_id
      updateData.contentVersion = task.contentVersion + 1 

      updateData.updated_at = db.fn.now()

      await db("tasks")
        .where({ id: request.params.id})
        .update(updateData)

      return { message: "Task updated successfully" }
    }
  )


  /*
  =====================================================
  Move TASK
  =====================================================
  */
  fastify.put<{ Params: TaskParams; Body: MoveTaskBody }>(
    "/tasks/:id/move",
    {
      preHandler: [fastify.authenticate],
      schema: moveTaskSchema
    },
    async (request, reply) => {
      const { id } = request.params
      const { placement, targetTaskId, colId, positionVersion } = request.body
      // 1. Проверяем существование перемещаемой колонки и её принадлежность доске
      const task = await db('tasks')
        .join("cols", "tasks.col_id", "cols.id")
        .select(
          "tasks.*",
          "cols.board_id"
        )
        .where("tasks.id", request.params.id)
        .first();
      if (!task) {
        return reply.code(404).send({ error: 'task not found ' });
      }

      // 2. Проверяем версию позиции
      if (task.positionVersion !== positionVersion) {
        return reply.code(409).send({
          error: "Position conflict",
          message: "The task has been moved by another user. Please refresh and try again.",
          data: task
        });
      }

      // 3. Если указана целевая колонка, проверяем её
      if (targetTaskId) {
        const targetTask = await db('tasks')
          .where({ id: targetTaskId, col_id: colId })
          .first();
        if (!targetTask) {
          return reply.code(404).send({ error: 'Target task not found' });
        }
        // Нельзя перемещать колонку относительно самой себя
        if (targetTaskId === id) {
          return reply.code(400).send({ error: 'Cannot move task relative to itself' });
        }
      }

      let newOrder: string;

      const getPrevColumn = async (order: string) => {
        return db('tasks')
          .where('col_id', colId)
          .andWhere('display_order', '<', order)
          .orderBy('display_order', 'desc')
          .first();
      };

      // Вспомогательная функция для получения следующей колонки относительно заданного order
      const getNextColumn = async (order: string) => {
        return db('tasks')
          .where('col_id', colId)
          .andWhere('display_order', '>', order)
          .orderBy('display_order', 'asc')
          .first();
      };

      if (placement === 'start') {
      // Переместить в начало: перед первой колонкой
      const firstTask = await db('tasks')
        .where('col_id', colId)
        .orderBy('display_order', 'asc')
        .first();
      if (firstTask) {
        newOrder = LexoRank.parse(firstTask.display_order).genPrev().toString();
      } else {
        // Если колонок нет вообще (только текущая), используем middle
        newOrder = LexoRank.middle().toString();
      }
    }else if (placement === 'end') {
      // Переместить в конец: после последней колонки
      const lastTask = await db('tasks')
        .where('col_id', colId)
        .orderBy('display_order', 'desc')
        .first();
      if (lastTask) {
        newOrder = LexoRank.parse(lastTask.display_order).genNext().toString();
      } else {
        newOrder = LexoRank.middle().toString();
      }
    }
    else if (placement === 'before' || placement === 'after') {
      if (!targetTaskId) {
        return reply.code(400).send({ error: 'targetColumnId is required for before/after placement' });
      }

      // Получаем целевую колонку (уже проверили существование)
      const target = await db('tasks')
        .where({ id: targetTaskId, col_id: colId })
        .first();

        if (placement === 'before') {
        // Вставить перед target: найти предыдущую колонку
        const prev = await getPrevColumn(target.display_order);
        if (prev) {
          // Есть предыдущая — вставляем между prev и target
          newOrder = LexoRank.parse(prev.display_order)
            .between(LexoRank.parse(target.display_order))
            .toString();
        } else {
          // target первая — вставляем перед ней (genPrev)
          newOrder = LexoRank.parse(target.display_order).genPrev().toString();
        }
      } else { // after
        // Вставить после target: найти следующую колонку
        const next = await getNextColumn(target.display_order);
        if (next) {
          // Есть следующая — вставляем между target и next
          newOrder = LexoRank.parse(target.display_order)
            .between(LexoRank.parse(next.display_order))
            .toString();
        } else {
          // target последняя — вставляем после неё (genNext)
          newOrder = LexoRank.parse(target.display_order).genNext().toString();
        }
      }
    } else {
      return reply.code(400).send({ error: 'Invalid placement value' });
    }
    await db('tasks')
      .where({ id: id })
      .update({ display_order: newOrder, col_id: colId, updated_at: db.fn.now(), positionVersion:  task.positionVersion + 1});

    // 6. Возвращаем обновлённую колонку (можно вернуть полные данные)
    const updatedColumn = await db('tasks').where({ id: id }).first();
    return reply.code(200).send(updatedColumn);
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
      schema: deleteTaskSchema
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