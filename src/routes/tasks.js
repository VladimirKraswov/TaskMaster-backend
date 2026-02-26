const db = require('../utils/database');

module.exports = async function (fastify, opts) {



  // Получить задачи доски
  fastify.get('/boards/:boardId/tasks', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['tasks'],
      summary: 'Получить задачи доски',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['boardId'],
        properties: {
          boardId: { type: 'integer' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              board_id: { type: 'integer' },
              version: {type: 'integer'},
              display_order: {type: 'string'},
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    title: { type: 'string' },
                    description: {type: 'string'},
                    created_at: {type: 'string'},
                    updated_at: {type: 'string'},
                    version: {type: 'integer'},
                    display_order: {type: 'string'},
                    user_id: {type: 'integer'},
                  }
                }
              }
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { boardId } = request.params;

    // Проверка прав доступа к доске
    const board = await db('boards')
      .where({ id: boardId })
      .first();

    if (!board) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const cols =  await db('cols')
      .where('board_id', boardId)
      .orderBy('display_order', 'asc');

    if (cols.length === 0) {
      return []; // или возвращаем пустой массив, без задач
    }

    const colIds = cols.map(col => col.id);

    // Получаем все задачи, принадлежащие этим колонкам
    const tasks = await db('tasks')
      .whereIn('col_id', colIds)
      .orderBy('display_order', 'asc'); // если есть поле сортировки, иначе по created_at
    console.log(tasks)
      // Группируем задачи по col_id
    const tasksByColId = tasks.reduce((acc, task) => {
      const colId = task.col_id;
      if (!acc[colId]) acc[colId] = [];
      acc[colId].push(task);
      return acc;
    }, {});
    console.log(tasksByColId)

    // Добавляем задачи к каждой колонке
    const result = cols.map(col => ({
      ...col,
      tasks: tasksByColId[col.id] || []
    }));

    console.log(result)
    return result
  });

  // Получить задачу по ID
  fastify.get('/tasks/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['tasks'],
      summary: 'Получить задачу по ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            completed: { type: 'boolean' },
            board_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const task = await db('tasks')
      .join('boards', 'tasks.board_id', 'boards.id')
      .where({ 'tasks.id': id })
      .select('tasks.*')
      .first();

    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    return task;
  });

  //создать колонку
  fastify.post(`/boards/:boardId/columns`, {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['tasks'],
      summary: 'создать колонку в доске',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['boardId'],
        properties: {
          boardId: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            board_id: { type: 'integer' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    }
  },
  async (request, reply) => {
    const { boardId } = request.params;
    const { title } = request.body;
    const board = await db('boards')
      .where({ id: boardId })
      .first();

    if (!board) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const [id] = await db('cols').insert({
      title,
      board_id: boardId
    });

    return reply.code(201).send({
      id,
      title,
      board_id: boardId,
    });
  }
  )

  fastify.put(`/boards/:boardId/columns/:columnId`, {
  preHandler: [fastify.authenticate],
  schema: {
    tags: ['tasks'],
    summary: 'обновить колонку',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['boardId', 'columnId'],
      properties: {
        boardId: { type: 'integer' },
        columnId: { type: 'integer' }
      }
    },
    body: {
      type: 'object',
      required: ['title', 'display_order'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        display_order: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          board_id: { type: 'integer' }
        }
      },
      404: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { boardId, columnId } = request.params;
  const { title, display_order } = request.body;

  // Проверяем, что колонка существует и принадлежит указанной доске
  const column = await db('cols')
    .where({ id: columnId, board_id: boardId })
    .first();

  if (!column) {
    return reply.code(404).send({ error: 'Column not found' });
  }

  await db('cols')
    .where({ id: columnId })
    .update({ title, display_order });

  return reply.code(200).send({
    id: columnId,
    title,
    board_id: boardId,
    display_order
  });
});

fastify.delete(`/boards/:boardId/columns/:columnId`, {
  preHandler: [fastify.authenticate],
  schema: {
    tags: ['tasks'],
    summary: 'удалить колонку',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['boardId', 'columnId'],
      properties: {
        boardId: { type: 'integer' },
        columnId: { type: 'integer' }
      }
    },
    response: {
      204: {
        type: 'null',
        description: 'No content'
      },
      404: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { boardId, columnId } = request.params;

  const deletedCount = await db('cols')
    .where({ id: columnId, board_id: boardId })
    .delete();

  if (deletedCount === 0) {
    return reply.code(404).send({ error: 'Column not found' });
  }

  return reply.code(204).send();
});

  // Создать задачу
  fastify.post('/boards/:boardId/tasks', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['tasks'],
      summary: 'Создать задачу',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['boardId'],
        properties: {
          boardId: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        required: ['title', 'colId'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          colId: { type: 'integer' },
          description: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            board_id: { type: 'integer' },
            col_id: {type: 'integer'}
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { boardId } = request.params;
    const { title, colId, description } = request.body;

    const col = await db('cols')
      .where({ board_id: boardId,  id: colId})
      .first();

    if (!col) {
      return reply.code(400).send({ error: 'Invalid data' });
    }

    const [id] = await db('tasks').insert({
      title,
      col_id: colId,
      description: description ?? "",
      completed: false,
    });

    return reply.code(201).send({
      id,
      title,
      board_id: boardId,
      col_id: colId
    });
  });

  // Обновить задачу
  fastify.put('/tasks/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['tasks'],
      summary: 'Обновить задачу',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          completed: { type: 'boolean' },
          col_id: { type: 'integer'},
          description: { type: 'string' },
          display_order: { type: 'string' }
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { title, completed, display_order, description, col_id } = request.body;

    const task = await db('tasks')
      .join('cols', 'tasks.col_id', 'cols.id')
      .where({ 'tasks.id': id, })
      .first();

    if (!task) {
      return reply.code(400).send({ error: 'Invalid data' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (completed !== undefined) updateData.completed = completed;
    if (col_id !== undefined) updateData.col_id = col_id;
    if (description !== undefined) updateData.description = description;
    if (display_order !== undefined) updateData.display_order = display_order;

    updateData.updated_at = db.fn.now();

    await db('tasks').where('id', id).update(updateData);

    return { message: 'Task updated successfully' };
  });

  // Удалить задачу
  fastify.delete('/tasks/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['tasks'],
      summary: 'Удалить задачу',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const task = await db('tasks')
      .join('boards', 'tasks.board_id', 'boards.id')
      .where({ 'tasks.id': id, 'boards.user_id': request.user.id })
      .first();

    if (!task) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    await db('tasks').where('id', id).del();

    return { message: 'Task deleted successfully' };
  });
};