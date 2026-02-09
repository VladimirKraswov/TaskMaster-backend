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
              completed: { type: 'boolean' },
              board_id: { type: 'integer' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
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
    const { boardId } = request.params;

    // Проверка прав доступа к доске
    const board = await db('boards')
      .where({ id: boardId, user_id: request.user.id })
      .first();

    if (!board) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    return await db('tasks')
      .where('board_id', boardId)
      .orderBy('created_at', 'desc');
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
        403: {
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
      .where({ 'tasks.id': id, 'boards.user_id': request.user.id })
      .select('tasks.*')
      .first();

    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    return task;
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
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { boardId } = request.params;
    const { title } = request.body;

    const board = await db('boards')
      .where({ id: boardId, user_id: request.user.id })
      .first();

    if (!board) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const [id] = await db('tasks').insert({
      title,
      board_id: boardId,
      completed: false,
    });

    return reply.code(201).send({
      id,
      title,
      board_id: boardId,
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
    const { title, completed } = request.body;

    const task = await db('tasks')
      .join('boards', 'tasks.board_id', 'boards.id')
      .where({ 'tasks.id': id, 'boards.user_id': request.user.id })
      .first();

    if (!task) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (completed !== undefined) updateData.completed = completed;

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