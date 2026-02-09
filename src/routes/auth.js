const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/database');

module.exports = async function (fastify, opts) {
  // Регистрация
  fastify.post('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Регистрация нового пользователя',
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          password: { type: 'string', minLength: 6 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            userId: { type: 'integer' },
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
    const { username, password } = request.body;

    // Проверка существующего пользователя
    const existingUser = await db('users').where('username', username).first();
    if (existingUser) {
      return reply.code(400).send({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userId] = await db('users').insert({
      username,
      password: hashedPassword,
    });

    return reply.code(201).send({
      message: 'User registered successfully',
      userId,
    });
  });

  // Логин
  fastify.post('/login', {
    schema: {
      tags: ['auth'],
      summary: 'Авторизация пользователя',
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { username, password } = request.body;

    const user = await db('users').where('username', username).first();
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const accessToken = fastify.jwt.sign(
      { id: user.id, username: user.username },
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await db('users').where('id', user.id).update({ refresh_token: refreshToken });

    return {
      accessToken,
      refreshToken,
    };
  });

  // Обновление токена
  fastify.post('/refresh', {
    schema: {
      tags: ['auth'],
      summary: 'Обновление access token',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body;

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
      const user = await db('users').where('id', decoded.id).first();

      if (!user || user.refresh_token !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      const newAccessToken = fastify.jwt.sign(
        { id: user.id, username: user.username },
        { expiresIn: '15m' }
      );

      return { accessToken: newAccessToken };
    } catch (err) {
      return reply.code(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Выход
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['auth'],
      summary: 'Выход пользователя',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    await db('users').where('id', request.user.id).update({ refresh_token: null });
    return { message: 'Logged out successfully' };
  });
};