const db = require('../utils/database');

module.exports = async function (fastify, opts) {
  // Получить все доски пользователя
  fastify.get('/boards', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['boards'],
      summary: 'Получить все доски пользователя',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              user_id: { type: 'integer' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  }, async (request) => {
    return await db('boards')
      .where('user_id', request.user.id)
      .orderBy('created_at', 'desc');
  });

  // Получить доску по ID
  fastify.get('/boards/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['boards'],
      summary: 'Получить доску по ID',
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
            name: { type: 'string' },
            user_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
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
    const board = await db('boards')
      .where({ id: request.params.id, user_id: request.user.id })
      .first();

    if (!board) {
      return reply.code(404).send({ error: 'Board not found' });
    }

    return board;
  });

  // Создать доску
  fastify.post('/boards', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['boards'],
      summary: 'Создать новую доску',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            user_id: { type: 'integer' },
          },
        },
      },
    },
  }, async (request) => {
    const [id] = await db('boards').insert({
      name: request.body.name,
      user_id: request.user.id,
    });

    return {
      id,
      name: request.body.name,
      user_id: request.user.id,
    };
  });

  // Обновить доску
  fastify.put('/boards/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['boards'],
      summary: 'Обновить доску',
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
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
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
    const { name } = request.body;

    const updated = await db('boards')
      .where({ id, user_id: request.user.id })
      .update({ name });

    if (!updated) {
      return reply.code(404).send({ error: 'Board not found' });
    }

    return { message: 'Board updated successfully' };
  });

  // Удалить доску
  fastify.delete('/boards/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['boards'],
      summary: 'Удалить доску',
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

    const deleted = await db('boards')
      .where({ id, user_id: request.user.id })
      .del();

    if (!deleted) {
      return reply.code(404).send({ error: 'Board not found' });
    }

    return { message: 'Board deleted successfully' };
  });
};