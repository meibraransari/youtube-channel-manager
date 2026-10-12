const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'YouTube Channel Manager API',
    version: '1.0.0',
    description: 'High-performance REST API for YouTube Channel & Content Management, RBAC security, MySQL-to-PostgreSQL 18 migrations, and dynamic settings.',
    contact: {
      name: 'Ibrar Ansari',
      url: 'https://github.com/meibraransari/youtube-channel-manager'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Active YouTube Channel Manager Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ContentItem: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          media_uuid: { type: 'string', format: 'uuid', example: '1c829fbc-516c-11f1-b1b2-8a22620ec07a' },
          content_type: { type: 'string', enum: ['short', 'video', 'podcast'], example: 'short' },
          topic: { type: 'string', example: 'CI/CD Pipeline Security' },
          title: { type: 'string', example: "Securing Your CI/CD Pipeline: Don't Let Attackers In!" },
          description: { type: 'string', example: 'Comprehensive guide to CI/CD DevSecOps hardening...' },
          tags: { type: 'string', example: 'DevOps, CI/CD, Security, Docker' },
          video_url: { type: 'string', example: 'https://youtube.com/shorts/JrIS4013jXw' },
          status: { type: 'string', enum: ['pending', 'uploaded', 'draft', 'scheduled', 'archived'], example: 'uploaded' },
          image_present: { type: 'boolean', example: true },
          video_present: { type: 'boolean', example: true }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string', example: 'admin' },
          email: { type: 'string', example: 'admin@ytstudio.local' },
          role: { type: 'string', enum: ['admin', 'manager', 'editor', 'viewer'], example: 'admin' },
          permissions: { type: 'array', items: { type: 'string' } },
          is_active: { type: 'boolean', example: true }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'System Health Check',
        tags: ['System'],
        security: [],
        responses: {
          200: { description: 'System healthy' },
          503: { description: 'System degraded' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'User Authentication',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'Admin@2026' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authentication successful, returns JWT token' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Get Authenticated User Profile',
        tags: ['Authentication'],
        responses: {
          200: { description: 'User profile returned' }
        }
      }
    },
    '/api/dashboard/stats': {
      get: {
        summary: 'Get Channel Dashboard Statistics & Telemetry',
        tags: ['Dashboard'],
        responses: {
          200: { description: 'Statistics returned' }
        }
      }
    },
    '/api/content': {
      get: {
        summary: 'List Content (Videos, Shorts, Podcasts)',
        tags: ['Content'],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string' }, description: 'short, video, podcast, all' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'uploaded, pending, draft, scheduled, all' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search title, topic, tags' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'List of content items' }
        }
      },
      post: {
        summary: 'Create New Content Item (Creator Wizard)',
        tags: ['Content'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContentItem' }
            }
          }
        },
        responses: {
          201: { description: 'Content created successfully' }
        }
      }
    },
    '/api/content/{id}': {
      get: {
        summary: 'Get Single Content Item',
        tags: ['Content'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Item returned' } }
      },
      put: {
        summary: 'Update Content Item',
        tags: ['Content'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ContentItem' } } }
        },
        responses: { 200: { description: 'Item updated' } }
      },
      delete: {
        summary: 'Delete Content Item',
        tags: ['Content'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Item deleted' } }
      }
    },
    '/api/content/{id}/duplicate': {
      post: {
        summary: 'Duplicate Content Item',
        tags: ['Content'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 201: { description: 'Item duplicated successfully' } }
      }
    },
    '/api/content/{id}/status': {
      patch: {
        summary: 'Fast Status Change',
        tags: ['Content'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string', example: 'uploaded' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Status updated' } }
      }
    },
    '/api/content/{id}/rename': {
      patch: {
        summary: 'Quick Rename Title',
        tags: ['Content'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { title: { type: 'string', example: 'New Title' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Renamed' } }
      }
    },
    '/api/migration/status': {
      get: {
        summary: 'Get Migration Status & History',
        tags: ['Migration'],
        responses: { 200: { description: 'Status returned' } }
      }
    },
    '/api/migration/run-reference': {
      post: {
        summary: 'Run Migration from sql11-10-2026_data.sql into PostgreSQL',
        tags: ['Migration'],
        responses: { 200: { description: 'Migration completed' } }
      }
    },
    '/api/settings': {
      get: {
        summary: 'Get All System Settings',
        tags: ['Settings'],
        responses: { 200: { description: 'Settings map returned' } }
      },
      put: {
        summary: 'Bulk Update Settings',
        tags: ['Settings'],
        responses: { 200: { description: 'Settings updated' } }
      }
    },
    '/api/settings/{key}': {
      put: {
        summary: 'Update Single Setting (Console Log Level, Swagger, etc.)',
        tags: ['Settings'],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Setting updated' } }
      }
    },
    '/api/users': {
      get: {
        summary: 'List All Users',
        tags: ['Users'],
        responses: { 200: { description: 'Users list' } }
      },
      post: {
        summary: 'Create New User with RBAC Permissions',
        tags: ['Users'],
        responses: { 201: { description: 'User created' } }
      }
    },
    '/api/audit': {
      get: {
        summary: 'View Audit Trail Logs',
        tags: ['Audit'],
        responses: { 200: { description: 'Audit trail returned' } }
      }
    }
  }
};

module.exports = swaggerDocument;
