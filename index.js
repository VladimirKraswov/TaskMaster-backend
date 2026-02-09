const fastify = require('fastify')({ logger: true });
const knex = require('knex')(require('./knexfile').development);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Для ручного управления refresh

// Секреты — в проде используй env vars
const ACCESS_SECRET = 'access_secret';
const REFRESH_SECRET = 'refresh_secret';

// Плагин Swagger
fastify.register(require('@fastify/swagger'), {
  mode: 'dynamic', // Добавляем для динамической генерации
  openapi: {
    info: { title: 'TaskMaster API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer'
        }
      }
    }
  }
});
fastify.register(require('@fastify/swagger-ui'), { routePrefix: '/documentation' });

// Плагин JWT
fastify.register(require('@fastify/jwt'), { secret: ACCESS_SECRET });

// Декоратор для аутентификации
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// Регистрация
fastify.post('/register', {
  schema: {
    summary: 'Регистрация нового пользователя',
    body: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: { message: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { username, password } = request.body;
  const hashed = await bcrypt.hash(password, 10);
  await knex('users').insert({ username, password: hashed });
  return { message: 'User registered' };
});

// Логин
fastify.post('/login', {
  schema: {
    summary: 'Авторизация пользователя и получение токенов',
    body: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' }
        }
      },
      401: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { username, password } = request.body;
  const user = await knex('users').where('username', username).first();
  if (!user || !await bcrypt.compare(password, user.password)) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }
  const accessToken = fastify.jwt.sign({ id: user.id }, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
  await knex('users').where('id', user.id).update({ refresh_token: refreshToken });
  return { accessToken, refreshToken };
});

// Refresh token
fastify.post('/refresh', {
  schema: {
    summary: 'Обновление access token с помощью refresh token',
    body: {
      type: 'object',
      required: ['refreshToken'],
      properties: { refreshToken: { type: 'string' } }
    },
    response: {
      200: {
        type: 'object',
        properties: { accessToken: { type: 'string' } }
      },
      401: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { refreshToken } = request.body;
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await knex('users').where('id', decoded.id).first();
    if (user.refresh_token !== refreshToken) throw new Error('Invalid refresh token');
    const newAccessToken = fastify.jwt.sign({ id: user.id }, { expiresIn: '15m' });
    return { accessToken: newAccessToken };
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid refresh token' });
  }
});

// CRUD для досок (boards)
fastify.get('/boards', {
  preHandler: [fastify.authenticate],
  schema: {
    summary: 'Получить доски пользователя',
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            user_id: { type: 'integer' }
          }
        }
      }
    }
  }
}, async (request) => {
  return await knex('boards').where('user_id', request.user.id);
});

fastify.post('/boards', {
  preHandler: [fastify.authenticate],
  schema: {
    summary: 'Создать новую доску',
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        }
      }
    }
  }
}, async (request) => {
  const { name } = request.body;
  const [id] = await knex('boards').insert({ name, user_id: request.user.id });
  return { id, name };
});

fastify.put('/boards/:id', {
  preHandler: [fastify.authenticate],
  schema: {
    summary: 'Обновить доску',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' } }
    },
    body: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } }
    },
    response: {
      200: {
        type: 'object',
        properties: { message: { type: 'string' } }
      }
    }
  }
}, async (request) => {
  const { id } = request.params;
  const { name } = request.body;
  await knex('boards').where({ id, user_id: request.user.id }).update({ name });
  return { message: 'Board updated' };
});

fastify.delete('/boards/:id', {
  preHandler: [fastify.authenticate],
  schema: {
    summary: 'Удалить доску',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' } }
    },
    response: {
      200: {
        type: 'object',
        properties: { message: { type: 'string' } }
      }
    }
  }
}, async (request) => {
  const { id } = request.params;
  await knex('boards').where({ id, user_id: request.user.id }).del();
  return { message: 'Board deleted' };
});

// CRUD для задач (tasks) — привязаны к доске
fastify.get('/boards/:boardId/tasks', {
  preHandler: [fastify.authenticate],
  schema: {
    summary: 'Получить задачи доски',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['boardId'],
      properties: { boardId: { type: 'integer' } }
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
            board_id: { type: 'integer' }
          }
        }
      },
      403: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  }
}, async (request) => {
  const { boardId } = request.params;
  // Проверка ownership
  const board = await knex('boards').where({ id: boardId, user_id: request.user.id }).first();
  if (!board) return reply.code(403).send({ error: 'Access denied' });
  return await knex('tasks').where('board_id', boardId);
});

fastify.post('/boards/:boardId/tasks', {
  preHandler: [fastify.authenticate],
  schema: {
    summary: 'Создать задачу на доске',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['boardId'],
      properties: { boardId: { type: 'integer' } }
    },
    body: {
      type: 'object',
      required: ['title'],
      properties: { title: { type: 'string' } }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' }
        }
      },
      403: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { boardId } = request.params;
  const { title } = request.body;
  const board = await knex('boards').where({ id: boardId, user_id: request.user.id }).first();
  if (!board) return reply.code(403).send({ error: 'Access denied' });
  const [id] = await knex('tasks').insert({ title, board_id: boardId });
  return { id, title };
});

fastify.put('/tasks/:id', {
  preHandler: [fastify.authenticate],
  schema: {
    summary: 'Обновить задачу',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' } }
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        completed: { type: 'boolean' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: { message: { type: 'string' } }
      },
      403: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;
  const { title, completed } = request.body;
  const task = await knex('tasks').join('boards', 'tasks.board_id', 'boards.id')
    .where({ 'tasks.id': id, 'boards.user_id': request.user.id }).first();
  if (!task) return reply.code(403).send({ error: 'Access denied' });
  await knex('tasks').where('id', id).update({ title, completed });
  return { message: 'Task updated' };
});

fastify.delete('/tasks/:id', {
  preHandler: [fastify.authenticate],
  schema: {
    summary: 'Удалить задачу',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' } }
    },
    response: {
      200: {
        type: 'object',
        properties: { message: { type: 'string' } }
      },
      403: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  const { id } = request.params;
  const task = await knex('tasks').join('boards', 'tasks.board_id', 'boards.id')
    .where({ 'tasks.id': id, 'boards.user_id': request.user.id }).first();
  if (!task) return reply.code(403).send({ error: 'Access denied' });
  await knex('tasks').where('id', id).del();
  return { message: 'Task deleted' };
});

// Запуск сервера
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();