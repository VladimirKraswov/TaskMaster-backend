export const getAllTasksBoardSchema = {
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
    }

export const getTaskByIdSchema ={
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
    }

export const CreateColumnSchema = {
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

export const editColumnSchema = {
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


export const deleteColumnSchema = {
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

export const createTaskSchema = {
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
    }

export const editTaskSchema = {
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
    }

export const deleteTaskSchema = {
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
    }