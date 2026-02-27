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
                      contentVersion: {type: 'integer'},
                      positionVersion: {type: 'integer'},
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
            description: {type: 'string'},
            display_order: {type: 'string'},
            board_id: { type: 'integer' },
            col_id: { type: 'integer' },
            contentVersion: {type: 'integer'},
            positionVersion: {type: 'integer'},
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

export const moveTaskSchema = {
      tags: ['tasks'],
      summary: 'переместить задачу в доске',
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
          targetTaskId: { type: 'integer'},
          colId: { type: 'integer'},
          positionVersion: { type: 'integer' },
          placement: { type: 'string', enum:['before', 'after','start', 'end'] },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            board_id: { type: 'integer' },
            display_order: { type: 'string' },
            contentVersion: {type: 'integer'},
            positionVersion: {type: 'integer'},
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
            col_id: {type: 'integer'},
            contentVersion: {type: 'integer'},
            positionVersion: {type: 'integer'},
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
          description: { type: 'string' },
          user_id: { type: 'integer' },
          contentVersion: { type: 'integer' }
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