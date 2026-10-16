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
          video_present: { type: 'boolean', example: true },
          image_file: { type: 'string', example: '/media/1c829fbc-516c-11f1-b1b2-8a22620ec07a.png' },
          video_file: { type: 'string', example: '/media/1c829fbc-516c-11f1-b1b2-8a22620ec07a.mp4' }
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
      },
      TagPreset: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'preset-postgres' },
          name: { type: 'string', example: 'PostgreSQL & Database' },
          category: { type: 'string', example: 'Database' },
          tags: { type: 'string', example: 'postgresql, database, pg18, sql, rdbms, performance, indexing' },
          is_system: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      N8nWorkflow: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'wf_ai_enrichment' },
          name: { type: 'string', example: 'AI Metadata & SEO Description Auto-Enricher' },
          description: { type: 'string', example: 'Generates SEO tags, viral hooks, and YouTube descriptions via LLM' },
          category: { type: 'string', enum: ['ai_enrichment', 'social', 'assets', 'telemetry', 'automation', 'custom'], example: 'ai_enrichment' },
          webhook_url: { type: 'string', example: 'http://localhost:5678/webhook/studio-seo-enricher' },
          test_webhook_url: { type: 'string', example: 'http://localhost:5678/webhook-test/studio-seo-enricher' },
          http_method: { type: 'string', enum: ['POST', 'GET', 'PUT', 'PATCH'], example: 'POST' },
          auth_header_name: { type: 'string', example: 'X-Webhook-Token' },
          auth_header_value: { type: 'string', example: 'secret-token' },
          payload_template: { type: 'object' },
          timeout_seconds: { type: 'integer', example: 30 },
          is_active: { type: 'boolean', example: true },
          last_executed_at: { type: 'string', format: 'date-time' },
          last_execution_status: { type: 'string', example: 'success' },
          total_executions: { type: 'integer', example: 42 },
          success_rate: { type: 'number', example: 97.6 },
          avg_duration_ms: { type: 'number', example: 215 }
        }
      },
      N8nExecution: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '69f10926-7f41-4796-abeb-0a256a297e68' },
          workflow_id: { type: 'string', example: 'wf_ai_enrichment' },
          workflow_name: { type: 'string', example: 'AI Metadata & SEO Description Auto-Enricher' },
          execution_id: { type: 'string', example: 'exec-12345' },
          trigger_source: { type: 'string', enum: ['manual', 'cron', 'event'], example: 'manual' },
          status: { type: 'string', enum: ['pending', 'running', 'success', 'failed'], example: 'success' },
          http_method: { type: 'string', example: 'POST' },
          request_url: { type: 'string', example: 'http://localhost:5678/webhook/studio-seo-enricher' },
          request_payload: { type: 'object' },
          response_payload: { type: 'object' },
          status_code: { type: 'integer', example: 200 },
          error_message: { type: 'string', example: null },
          duration_ms: { type: 'integer', example: 185 },
          triggered_by: { type: 'string', example: 'admin@ytstudio.local' },
          created_at: { type: 'string', format: 'date-time' },
          completed_at: { type: 'string', format: 'date-time' }
        }
      },
      Note: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '9f8e7d6c-5b4a-3210-fedc-ba9876543210' },
          title: { type: 'string', example: 'YouTube Shorts High-Retention Playbook' },
          topic: { type: 'string', example: 'Shorts Strategy' },
          category: { type: 'string', enum: ['instruction', 'checklist', 'script', 'sop', 'idea', 'reference'], example: 'instruction' },
          content: { type: 'string', example: '# YouTube Shorts High-Retention Playbook\n\nHigh-yield tips...' },
          tags: { type: 'string', example: 'shorts, algorithm, pacing, retention' },
          color: { type: 'string', example: '#f59e0b' },
          is_pinned: { type: 'boolean', example: true },
          is_archived: { type: 'boolean', example: false },
          channel_id: { type: 'integer', nullable: true, example: 1 },
          channel_name: { type: 'string', nullable: true, example: 'Tech Explorers' },
          channel_handle: { type: 'string', nullable: true, example: '@TechExplorers' },
          author_username: { type: 'string', nullable: true, example: 'admin' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      SystemSettings: {
        type: 'object',
        properties: {
          console_log_level: { type: 'string', example: 'info' },
          swagger_enabled: { type: 'boolean', example: true },
          char_limit_desc_short: { type: 'integer', example: 5000, description: 'Maximum character limit for Shorts description' },
          char_limit_tags_short: { type: 'integer', example: 500, description: 'Maximum character limit for Shorts tags' },
          char_limit_desc_video: { type: 'integer', example: 5000, description: 'Maximum character limit for Long-Form Video description' },
          char_limit_tags_video: { type: 'integer', example: 500, description: 'Maximum character limit for Long-Form Video tags' },
          char_limit_desc_podcast: { type: 'integer', example: 5000, description: 'Maximum character limit for Podcast description' },
          char_limit_tags_podcast: { type: 'integer', example: 500, description: 'Maximum character limit for Podcast tags' },
          max_tags_length: { type: 'integer', example: 500 },
          allowed_media_extensions: { type: 'string', example: '.mp4, .png' },
          max_media_upload_size_mb: { type: 'integer', example: 100 },
          n8n_integration_enabled: { type: 'boolean', example: true },
          initial_setup_done: { type: 'boolean', example: false }
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
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  channel_id: { type: 'string', example: 'channel_1' },
                  content_type: { type: 'string', enum: ['short', 'video', 'podcast'], example: 'short' },
                  title: { type: 'string', example: 'New Video Title' },
                  topic: { type: 'string', example: 'Tech Topic' },
                  description: { type: 'string', example: 'Description' },
                  tags: { type: 'string', example: 'tag1, tag2' },
                  status: { type: 'string', enum: ['pending', 'uploaded', 'draft', 'scheduled'], example: 'pending' },
                  image_file: { type: 'string', format: 'binary', description: 'Thumbnail Image File (.png, etc.)' },
                  video_file: { type: 'string', format: 'binary', description: 'Video Media Asset File (.mp4, etc.)' }
                }
              }
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
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ContentItem' } },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Updated Title' },
                  topic: { type: 'string', example: 'Updated Topic' },
                  description: { type: 'string', example: 'Updated Description' },
                  tags: { type: 'string', example: 'tag1, tag2' },
                  status: { type: 'string', example: 'uploaded' },
                  image_file: { type: 'string', format: 'binary', description: 'Override Thumbnail Image File' },
                  video_file: { type: 'string', format: 'binary', description: 'Override Video Media Asset File' }
                }
              }
            }
          }
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
    '/api/settings/test-smtp': {
      post: {
        summary: 'Test SMTP Connection & Relay Dispatch Probe',
        tags: ['Settings'],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  smtp_host: { type: 'string', example: 'smtp.gmail.com' },
                  smtp_port: { type: 'string', example: '587' },
                  test_recipient_email: { type: 'string', example: 'admin@studio.local' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'SMTP handshake and test email successfully delivered' },
          400: { description: 'SMTP connection or authentication failure' }
        }
      }
    },
    '/api/settings/telemetry-report/preview': {
      post: {
        summary: 'Generate Live Rendered HTML Preview of Telemetry Report',
        tags: ['Settings'],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  metrics: { type: 'array', items: { type: 'string' } },
                  templateTheme: { type: 'string', example: 'executive_dark' },
                  customNotes: { type: 'string', example: 'Daily Intelligence Digest' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Rendered HTML and live metrics summary returned' }
        }
      }
    },
    '/api/settings/telemetry-report/test': {
      post: {
        summary: 'Dispatch Live Telemetry Report Email via SMTP Relay',
        tags: ['Settings'],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  recipients: { type: 'string', example: 'admin@domain.com, ops@domain.com' },
                  metrics: { type: 'array', items: { type: 'string' } },
                  templateTheme: { type: 'string', example: 'executive_dark' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Telemetry report delivered to recipients' },
          400: { description: 'Delivery failed or invalid recipients' }
        }
      }
    },
    '/api/settings/initial-setup-status': {
      get: {
        summary: 'Check Whether Initial Studio Setup Has Been Completed',
        tags: ['Settings'],
        responses: {
          200: {
            description: 'Setup status response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    initial_setup_done: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/settings/initial-setup': {
      post: {
        summary: 'Execute Initial Workspace Setup (Demo Data or Clean Production Mode)',
        tags: ['Settings'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mode'],
                properties: {
                  mode: { type: 'string', enum: ['demo', 'production'], example: 'demo' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Workspace initialized successfully' },
          500: { description: 'Initialization error' }
        }
      }
    },
    '/api/settings/flush-all': {
      post: {
        summary: 'Danger Zone: Permanently Flush ALL Data Across All Tables & Reset Initial Setup',
        tags: ['Settings'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['confirmed', 'answer', 'expected'],
                properties: {
                  confirmed: { type: 'boolean', example: true },
                  answer: { type: 'integer', example: 42 },
                  expected: { type: 'integer', example: 42 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'All database tables and media files successfully purged' },
          400: { description: 'Invalid challenge answer or unconfirmed' }
        }
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
    },
    '/api/tags/presets': {
      get: {
        summary: 'List All Tag Presets from Dedicated Registry',
        tags: ['Tag Presets'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (e.g. Database, DevOps, AI & ML)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search preset names, categories, or tags' }
        ],
        responses: {
          200: {
            description: 'List of tag presets returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    presets: { type: 'array', items: { $ref: '#/components/schemas/TagPreset' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create New Tag Preset Row',
        tags: ['Tag Presets'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'tags'],
                properties: {
                  name: { type: 'string', example: 'Next.js & React Ecosystem' },
                  category: { type: 'string', example: 'Frontend' },
                  tags: { type: 'string', example: 'nextjs, react, tailwind, typescript, web dev' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Tag preset created successfully' },
          400: { description: 'Validation error or duplicate preset name' }
        }
      }
    },
    '/api/tags/presets/{id}': {
      put: {
        summary: 'Update Existing Tag Preset Row',
        tags: ['Tag Presets'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  tags: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Tag preset updated successfully' },
          404: { description: 'Preset not found' }
        }
      },
      delete: {
        summary: 'Delete Tag Preset Row',
        tags: ['Tag Presets'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Tag preset deleted successfully' },
          404: { description: 'Preset not found' }
        }
      }
    },
    '/api/tags/presets/reset': {
      post: {
        summary: 'Restore Curated Default Tag Presets (10 System Categories)',
        tags: ['Tag Presets'],
        responses: {
          200: { description: 'Tag presets reset to default curated bundles' }
        }
      }
    },
    '/api/tags/categories': {
      get: {
        summary: 'List Distinct Tag Preset Categories',
        tags: ['Tag Presets'],
        responses: {
          200: {
            description: 'List of distinct categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    categories: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/n8n/workflows': {
      get: {
        summary: 'List Registered n8n Workflows with Execution Telemetry',
        tags: ['n8n Orchestration'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] }, description: 'Filter by active status' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search name, description, or webhook URL' }
        ],
        responses: {
          200: {
            description: 'List of workflows with execution aggregates',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    workflows: { type: 'array', items: { $ref: '#/components/schemas/N8nWorkflow' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Register New n8n Workflow Directive',
        tags: ['n8n Orchestration'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'webhook_url'],
                properties: {
                  name: { type: 'string', example: 'Social Multi-Platform Cross-Poster' },
                  description: { type: 'string', example: 'Publishes video teasers to X and LinkedIn' },
                  category: { type: 'string', enum: ['ai_enrichment', 'social', 'assets', 'telemetry', 'automation', 'custom'], default: 'automation' },
                  webhook_url: { type: 'string', example: 'http://localhost:5678/webhook/social-crosspost' },
                  test_webhook_url: { type: 'string', example: 'http://localhost:5678/webhook-test/social-crosspost' },
                  http_method: { type: 'string', enum: ['POST', 'GET', 'PUT', 'PATCH'], default: 'POST' },
                  auth_header_name: { type: 'string', default: 'X-Webhook-Token' },
                  auth_header_value: { type: 'string' },
                  payload_template: { type: 'object' },
                  timeout_seconds: { type: 'integer', default: 30 },
                  is_active: { type: 'boolean', default: true }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Workflow registered successfully' },
          400: { description: 'Validation error' }
        }
      }
    },
    '/api/n8n/workflows/{id}': {
      get: {
        summary: 'Get Specific n8n Workflow Details with Recent Executions',
        tags: ['n8n Orchestration'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Workflow record with execution history' },
          404: { description: 'Workflow not found' }
        }
      },
      put: {
        summary: 'Update Existing n8n Workflow Directive',
        tags: ['n8n Orchestration'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  webhook_url: { type: 'string' },
                  test_webhook_url: { type: 'string' },
                  http_method: { type: 'string' },
                  auth_header_name: { type: 'string' },
                  auth_header_value: { type: 'string' },
                  payload_template: { type: 'object' },
                  timeout_seconds: { type: 'integer' },
                  is_active: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Workflow updated' },
          404: { description: 'Workflow not found' }
        }
      },
      delete: {
        summary: 'Delete n8n Workflow and Cascade Execution Logs',
        tags: ['n8n Orchestration'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Workflow deleted' },
          404: { description: 'Workflow not found' }
        }
      }
    },
    '/api/n8n/workflows/{id}/execute': {
      post: {
        summary: 'Execute n8n Webhook Workflow with Dynamic Payload',
        tags: ['n8n Orchestration'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  payload: { type: 'object', description: 'Custom dynamic parameters merged into payload_template' },
                  target: { type: 'string', enum: ['production', 'test'], default: 'production' },
                  trigger_source: { type: 'string', enum: ['manual', 'cron', 'event'], default: 'manual' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Webhook dispatched and executed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    execution: { $ref: '#/components/schemas/N8nExecution' }
                  }
                }
              }
            }
          },
          400: { description: 'Workflow disabled or invalid target' },
          404: { description: 'Workflow not found' }
        }
      }
    },
    '/api/n8n/executions': {
      get: {
        summary: 'List Recorded n8n Workflow Executions',
        tags: ['n8n Orchestration'],
        parameters: [
          { name: 'workflow_id', in: 'query', schema: { type: 'string' }, description: 'Filter by workflow ID' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'running', 'success', 'failed'] }, description: 'Filter by execution status' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          200: {
            description: 'Paginated execution history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    executions: { type: 'array', items: { $ref: '#/components/schemas/N8nExecution' } }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        summary: 'Purge Execution Telemetry Ledger',
        tags: ['n8n Orchestration'],
        parameters: [
          { name: 'workflow_id', in: 'query', schema: { type: 'string' }, description: 'Optional: purge only for specific workflow' }
        ],
        responses: {
          200: { description: 'Execution logs purged' }
        }
      }
    },
    '/api/n8n/executions/{id}': {
      get: {
        summary: 'Get Specific Execution Telemetry Details',
        tags: ['n8n Orchestration'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Execution telemetry record' },
          404: { description: 'Execution not found' }
        }
      }
    },
    '/api/n8n/test-connection': {
      post: {
        summary: 'Probe n8n Orchestrator Reachability and Measure Latency',
        tags: ['n8n Orchestration'],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  baseUrl: { type: 'string', example: 'http://localhost:5678' },
                  apiKey: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Connection probe test outcome',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    reachable: { type: 'boolean' },
                    statusCode: { type: 'integer' },
                    latencyMs: { type: 'integer' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/notes': {
      get: {
        summary: 'List Notes & Instructions with Multi-Facet Filtering',
        tags: ['Topic Notes & Instructions'],
        parameters: [
          { name: 'topic', in: 'query', schema: { type: 'string' }, description: 'Filter by specific topic' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by note category (instruction, checklist, script, sop, idea, reference)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Full-text search in title, topic, content, and tags' },
          { name: 'channel_id', in: 'query', schema: { type: 'string' }, description: 'Filter by associated channel ID' },
          { name: 'is_pinned', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'Filter pinned notes' },
          { name: 'is_archived', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'] }, description: 'Filter archived status' },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['updated_at', 'created_at', 'title', 'topic'], default: 'updated_at' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          200: {
            description: 'List of matching notes with topic aggregates and summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    notes: { type: 'array', items: { $ref: '#/components/schemas/Note' } },
                    topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, count: { type: 'integer' } } } },
                    summary: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a New Note / Instruction Document',
        tags: ['Topic Notes & Instructions'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'YouTube Shorts Retention Playbook' },
                  topic: { type: 'string', example: 'Shorts Strategy' },
                  category: { type: 'string', enum: ['instruction', 'checklist', 'script', 'sop', 'idea', 'reference'], default: 'instruction' },
                  content: { type: 'string', example: '# Strategy Document\n\n1. Hook in 3s\n2. High-energy cuts' },
                  tags: { type: 'string', example: 'shorts, algorithm, pacing' },
                  color: { type: 'string', example: '#06b6d4' },
                  is_pinned: { type: 'boolean', default: false },
                  channel_id: { type: 'integer', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Note created successfully' },
          400: { description: 'Validation error (e.g. missing title)' }
        }
      }
    },
    '/api/notes/topics': {
      get: {
        summary: 'Get Topic Aggregates with Note Counts',
        tags: ['Topic Notes & Instructions'],
        parameters: [
          { name: 'channel_id', in: 'query', schema: { type: 'string' }, description: 'Optional channel filter' }
        ],
        responses: {
          200: {
            description: 'List of unique topics and note counts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    topics: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          topic: { type: 'string' },
                          count: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/notes/{id}': {
      get: {
        summary: 'Get Note by ID',
        tags: ['Topic Notes & Instructions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Note details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, note: { $ref: '#/components/schemas/Note' } } } } } },
          404: { description: 'Note not found' }
        }
      },
      put: {
        summary: 'Update Note / Instruction',
        tags: ['Topic Notes & Instructions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  topic: { type: 'string' },
                  category: { type: 'string' },
                  content: { type: 'string' },
                  tags: { type: 'string' },
                  color: { type: 'string' },
                  is_pinned: { type: 'boolean' },
                  is_archived: { type: 'boolean' },
                  channel_id: { type: 'integer', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Note updated successfully' },
          404: { description: 'Note not found' }
        }
      },
      delete: {
        summary: 'Delete Note Permanently',
        tags: ['Topic Notes & Instructions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Note deleted successfully' },
          404: { description: 'Note not found' }
        }
      }
    },
    '/api/notes/{id}/pin': {
      patch: {
        summary: 'Toggle or Set Note Pinned Status',
        tags: ['Topic Notes & Instructions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  is_pinned: { type: 'boolean', description: 'Explicit boolean pin status; if omitted, toggles current value' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Pin status updated' },
          404: { description: 'Note not found' }
        }
      }
    },
    '/api/notes/{id}/export': {
      get: {
        summary: 'Download Raw Markdown File',
        tags: ['Topic Notes & Instructions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Raw markdown document download',
            content: {
              'text/markdown': {
                schema: { type: 'string' }
              }
            }
          },
          404: { description: 'Note not found' }
        }
      }
    }
  }
};

module.exports = swaggerDocument;
