
export const CreateColumnSchema = {
      tags: ['columns'],
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
            display_order: { type: 'string' },
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

  export const MoveolumnSchema = {
      tags: ['columns'],
      summary: 'переместить колонку в доске',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['boardId', 'columnId'],
        properties: {
          boardId: { type: 'integer' },
          columnId: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        properties: {
          targetColumnId: { type: 'integer'},
          placement: { type: 'string', enum:['before', 'after','start', 'end'] },
          version: { type: 'integer' }
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
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        409: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                title: { type: 'string' },
                board_id: { type: 'integer' },
                version: { type: 'integer' },
                display_order: { type: 'string' },
              },
            }
          }
        }
      },
    }

export const editColumnSchema = {
    tags: ['columns'],
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
        version: { type: 'integer' }
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
      },
      409: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                title: { type: 'string' },
                board_id: { type: 'integer' },
                version: { type: 'integer' },
                display_order: { type: 'string' },
              },
            }
          }
        }
    }
  }


export const deleteColumnSchema = {
    tags: ['columns'],
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