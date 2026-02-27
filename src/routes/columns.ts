import { FastifyPluginAsync } from "fastify"
import db from "../utils/database"
import { LexoRank } from "lexorank"
import { CreateColumnSchema, deleteColumnSchema, editColumnSchema, MoveolumnSchema } from "../schemas/columns"

interface BoardParams {
  boardId: number
}

interface ColumnParams {
  boardId: number
  columnId: number
}

interface CreateColumnBody {
  title: string
}

interface MoveColumnBody {
  targetColumnId?: number;
  placement: 'before' | 'after' | 'start' | 'end'
}

interface UpdateColumnBody {
  title: string
  display_order: string
}


const columnRoutes: FastifyPluginAsync = async (fastify) => {

  /*
  =====================================================
  CREATE COLUMN
  =====================================================
  */
  fastify.post<{ Params: BoardParams; Body: CreateColumnBody }>(
    "/boards/:boardId/columns",
    {
      preHandler: [fastify.authenticate],
      schema: CreateColumnSchema
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

      const col = await db("cols")
        .where("board_id", boardId)
        .orderBy("display_order", "desc").first()
      
      let display_order = LexoRank.middle().toString()
      if(col){
        const last = LexoRank.parse(col.display_order)
        display_order = last.genNext().toString()
      }

      const [id] = await db("cols").insert({
        title,
        board_id: boardId,
        display_order
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
  MOVE COLUMN
  =====================================================
  */
  fastify.put<{ Params: ColumnParams; Body: MoveColumnBody }>(
    "/boards/:boardId/columns/:columnId/move",
    {
      preHandler: [fastify.authenticate],
      schema: MoveolumnSchema
    },
    async (request, reply) => {
      const { boardId, columnId } = request.params
      const { placement, targetColumnId } = request.body

      // 2. Проверяем существование перемещаемой колонки и её принадлежность доске
      const column = await db('cols')
        .where({ id: columnId, board_id: boardId })
        .first();
      if (!column) {
        return reply.code(404).send({ error: 'Column not found in this board' });
      }

      // 3. Если указана целевая колонка, проверяем её
      if (targetColumnId) {
        const targetColumn = await db('cols')
          .where({ id: targetColumnId, board_id: boardId })
          .first();
        if (!targetColumn) {
          return reply.code(404).send({ error: 'Target column not found in this board' });
        }
        // Нельзя перемещать колонку относительно самой себя
        if (targetColumnId === columnId) {
          return reply.code(400).send({ error: 'Cannot move column relative to itself' });
        }
      }

      let newOrder: string;

      const getPrevColumn = async (order: string) => {
        return db('cols')
          .where('board_id', boardId)
          .andWhere('display_order', '<', order)
          .orderBy('display_order', 'desc')
          .first();
      };

      // Вспомогательная функция для получения следующей колонки относительно заданного order
      const getNextColumn = async (order: string) => {
        return db('cols')
          .where('board_id', boardId)
          .andWhere('display_order', '>', order)
          .orderBy('display_order', 'asc')
          .first();
      };

      if (placement === 'start') {
      // Переместить в начало: перед первой колонкой
      const firstColumn = await db('cols')
        .where('board_id', boardId)
        .orderBy('display_order', 'asc')
        .first();
      if (firstColumn) {
        newOrder = LexoRank.parse(firstColumn.display_order).genPrev().toString();
      } else {
        // Если колонок нет вообще (только текущая), используем middle
        newOrder = LexoRank.middle().toString();
      }
    }else if (placement === 'end') {
      // Переместить в конец: после последней колонки
      const lastColumn = await db('cols')
        .where('board_id', boardId)
        .orderBy('display_order', 'desc')
        .first();
      if (lastColumn) {
        newOrder = LexoRank.parse(lastColumn.display_order).genNext().toString();
      } else {
        newOrder = LexoRank.middle().toString();
      }
    }
    else if (placement === 'before' || placement === 'after') {
      if (!targetColumnId) {
        return reply.code(400).send({ error: 'targetColumnId is required for before/after placement' });
      }

      // Получаем целевую колонку (уже проверили существование)
      const target = await db('cols')
        .where({ id: targetColumnId, board_id: boardId })
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
    await db('cols')
      .where({ id: columnId })
      .update({ display_order: newOrder });

    // 6. Возвращаем обновлённую колонку (можно вернуть полные данные)
    const updatedColumn = await db('cols').where({ id: columnId }).first();
    return reply.code(200).send(updatedColumn);
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
      schema: editColumnSchema
    },
    async (request, reply) => {
      const { boardId, columnId } = request.params
      const { title } = request.body

      const column = await db("cols")
        .where({ id: columnId, board_id: boardId })
        .first()

      if (!column) {
        return reply.code(404).send({ error: "Column not found" })
      }

      await db("cols")
        .where({ id: columnId })
        .update({ title })

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
      schema: deleteColumnSchema
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
}

export default columnRoutes