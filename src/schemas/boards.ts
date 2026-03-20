export const getBoardsSchema = {
    tags: ['boards'],
    summary: 'Получить все доски пользователя',
    security: [{ bearerAuth: [] }],

    querystring: {
    type: 'object',
    properties: {
      /*
      =========================
      SEARCH
      =========================
      */
      search: { type: 'string', minLength: 1 },

      /*
      =========================
      FILTERS
      =========================
      */
      createdFrom: { type: 'string', format: 'date-time' },
      createdTo: { type: 'string', format: 'date-time' },

      updatedFrom: { type: 'string', format: 'date-time' },
      updatedTo: { type: 'string', format: 'date-time' },

      /*
      =========================
      SORT
      =========================
      */
      sortBy: {
        type: 'string',
        enum: ['created_at', 'updated_at', 'name'],
        default: 'created_at'
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'desc'
      },

      /*
      =========================
      PAGINATION
      =========================
      */
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20
      },
      offset: {
        type: 'integer',
        minimum: 0,
        default: 0
      }
    }
  },
    
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
}

export const getBoardSchema = {
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
    }

export const createBoardSchema = {
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
    }

export const editBoardSchema = {
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
    }

export const deleteBoardSchema = {
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
    }