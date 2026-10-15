/**
 * Futuristic API Client with JWT Bearer management and unified response handling
 */
const API = {
  getToken() {
    return localStorage.getItem('yt_auth_token');
  },

  setToken(token) {
    if (token) localStorage.setItem('yt_auth_token', token);
    else localStorage.removeItem('yt_auth_token');
  },

  getUser() {
    try {
      const u = localStorage.getItem('yt_auth_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('yt_auth_user', JSON.stringify(user));
    else localStorage.removeItem('yt_auth_user');
  },

  getActiveChannelId() {
    return localStorage.getItem('yt_active_channel_id') || 'all';
  },

  setActiveChannelId(channelId) {
    if (channelId) localStorage.setItem('yt_active_channel_id', channelId);
    else localStorage.removeItem('yt_active_channel_id');
    window.dispatchEvent(new CustomEvent('channel:changed', { detail: { channelId } }));
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : endpoint;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
        // Token expired
        this.setToken(null);
        this.setUser(null);
        window.dispatchEvent(new CustomEvent('auth:expired'));
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err.message);
      throw err;
    }
  },

  // Auth
  auth: {
    login: (credentials) => API.request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    me: () => API.request('/api/auth/me'),
    logout: () => API.request('/api/auth/logout', { method: 'POST' }),
    getLoginHistory: () => API.request('/api/auth/login-history')
  },

  // Channels (Multi-Channel Management & Ingestion)
  channels: {
    list: () => API.request('/api/channels'),
    get: (id) => API.request(`/api/channels/${id}`),
    create: (data) => API.request('/api/channels', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => API.request(`/api/channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    setDefault: (id) => API.request(`/api/channels/${id}/set-default`, { method: 'POST' }),
    delete: (id) => API.request(`/api/channels/${id}`, { method: 'DELETE' }),
    getSnapshots: (id, limit = 30) => API.request(`/api/channels/${id}/snapshots?limit=${limit}`),
    sync: (id) => API.request(`/api/channels/${id}/sync`, { method: 'POST' }),
    importYouTube: (data) => API.request('/api/channels/import-youtube', { method: 'POST', body: JSON.stringify(data) })
  },

  // Dashboard
  dashboard: {
    getStats: (channelId) => {
      const q = channelId && channelId !== 'all' ? `?channel_id=${channelId}` : '';
      return API.request(`/api/dashboard/stats${q}`);
    }
  },

  // Content
  content: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.request(`/api/content?${query}`);
    },
    get: (id) => API.request(`/api/content/${id}`),
    create: (data) => API.request('/api/content', { method: 'POST', body: (typeof FormData !== 'undefined' && data instanceof FormData) ? data : JSON.stringify(data) }),
    update: (id, data) => API.request(`/api/content/${id}`, { method: 'PUT', body: (typeof FormData !== 'undefined' && data instanceof FormData) ? data : JSON.stringify(data) }),
    rename: (id, data) => API.request(`/api/content/${id}/rename`, { method: 'PATCH', body: JSON.stringify(data) }),
    setStatus: (id, status) => API.request(`/api/content/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    duplicate: (id) => API.request(`/api/content/${id}/duplicate`, { method: 'POST' }),
    delete: (id) => API.request(`/api/content/${id}`, { method: 'DELETE' }),
    fetchMeta: (data) => API.request('/api/content/fetch-meta', { method: 'POST', body: JSON.stringify(data) }),
    syncYouTube: (id) => API.request(`/api/content/${id}/sync-youtube`, { method: 'POST' })
  },

  // Users
  users: {
    list: () => API.request('/api/users'),
    create: (data) => API.request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => API.request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    resetPassword: (id, newPassword) => API.request(`/api/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ new_password: newPassword }) }),
    delete: (id) => API.request(`/api/users/${id}`, { method: 'DELETE' })
  },

  // Settings
  settings: {
    get: () => API.request('/api/settings'),
    updateKey: (key, value, description) => API.request(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description })
    }),
    bulkUpdate: (settings) => API.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings })
    }),
    flushAll: (payload) => API.request('/api/settings/flush-all', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    testSmtp: (data) => API.request('/api/settings/test-smtp', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    testTelemetryReport: (data) => API.request('/api/settings/telemetry-report/test', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    previewTelemetryReport: (data) => API.request('/api/settings/telemetry-report/preview', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // Migration
  migration: {
    getStatus: () => API.request('/api/migration/status'),
    runReference: () => API.request('/api/migration/run-reference', { method: 'POST' }),
    upload: (formData) => API.request('/api/migration/upload', { method: 'POST', body: formData })
  },

  // Audit
  audit: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.request(`/api/audit?${query}`);
    }
  },

  // Health
  health: {
    get: () => API.request('/health'),
    ping: () => API.request('/health/ping')
  },

  // Tags & Presets (Tag Manager)
  tags: {
    getPresets: () => API.request('/api/tags/presets'),
    createPreset: (data) => API.request('/api/tags/presets', { method: 'POST', body: JSON.stringify(data) }),
    updatePreset: (id, data) => API.request(`/api/tags/presets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePreset: (id) => API.request(`/api/tags/presets/${id}`, { method: 'DELETE' }),
    resetPresets: () => API.request('/api/tags/presets/reset', { method: 'POST' })
  },

  // Subscribed Channels
  subscriptions: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.request(`/api/subscriptions?${query}`);
    },
    create: (data) => API.request('/api/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => API.request(`/api/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => API.request(`/api/subscriptions/${id}`, { method: 'DELETE' }),
    sync: (channelId) => API.request('/api/subscriptions/sync', { method: 'POST', body: JSON.stringify({ channel_id: channelId }) }),
    fetchYouTubeApi: (channelId, apiKey) => API.request('/api/subscriptions/fetch-youtube-api', { method: 'POST', body: JSON.stringify({ channel_id: channelId, api_key: apiKey }) }),
    import: (channelId, items) => API.request('/api/subscriptions/import', { method: 'POST', body: JSON.stringify({ channel_id: channelId, items }) }),
    getExportUrl: (format = 'csv', params = {}) => {
      const q = new URLSearchParams({ format, ...params }).toString();
      return `/api/subscriptions/export?${q}`;
    }
  },
  n8n: {
    workflows: {
      getAll: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/api/n8n/workflows${q ? '?' + q : ''}`);
      },
      getById: (id) => API.request(`/api/n8n/workflows/${id}`),
      create: (data) => API.request('/api/n8n/workflows', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      update: (id, data) => API.request(`/api/n8n/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
      delete: (id) => API.request(`/api/n8n/workflows/${id}`, {
        method: 'DELETE'
      }),
      execute: (id, payload = {}, options = {}) => API.request(`/api/n8n/workflows/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ payload, ...options })
      })
    },
    executions: {
      getAll: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/api/n8n/executions${q ? '?' + q : ''}`);
      },
      getById: (id) => API.request(`/api/n8n/executions/${id}`),
      clear: (workflowId = null) => {
        const q = workflowId ? `?workflow_id=${workflowId}` : '';
        return API.request(`/api/n8n/executions${q}`, { method: 'DELETE' });
      }
    },
    testConnection: (options = {}) => API.request('/api/n8n/test-connection', {
      method: 'POST',
      body: JSON.stringify(options)
    })
  },
  notes: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return API.request(`/api/notes${q ? '?' + q : ''}`);
    },
    get: (id) => API.request(`/api/notes/${id}`),
    getTopics: (channelId = null) => {
      const q = channelId ? `?channel_id=${channelId}` : '';
      return API.request(`/api/notes/topics${q}`);
    },
    create: (data) => API.request('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => API.request(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    togglePin: (id, isPinned = undefined) => API.request(`/api/notes/${id}/pin`, {
      method: 'PATCH',
      body: JSON.stringify(isPinned !== undefined ? { is_pinned: isPinned } : {})
    }),
    delete: (id) => API.request(`/api/notes/${id}`, {
      method: 'DELETE'
    }),
    getExportUrl: (id) => `/api/notes/${id}/export`
  }
};

window.API = API;
