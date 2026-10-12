const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');

// Curated default tag presets for YouTube Content Creators
const DEFAULT_TAG_PRESETS = [
  {
    id: 'preset-postgres',
    name: 'PostgreSQL & Database',
    category: 'Database',
    tags: 'postgresql, database, pg18, sql, rdbms, performance, indexing, backend, data modeling'
  },
  {
    id: 'preset-kubernetes',
    name: 'Kubernetes & Cloud',
    category: 'Cloud & DevOps',
    tags: 'kubernetes, k8s, containers, devops, cloud, microservices, helm, cluster, cloud native'
  },
  {
    id: 'preset-docker',
    name: 'Docker & Microservices',
    category: 'DevOps',
    tags: 'docker, docker compose, microservices, containers, devops, linux, deployment'
  },
  {
    id: 'preset-automation',
    name: 'AI & Automation',
    category: 'AI & ML',
    tags: 'ai, machine learning, automation, llm, artificial intelligence, deep learning, workflow'
  },
  {
    id: 'preset-nodejs',
    name: 'Node.js & Backend Architecture',
    category: 'Development',
    tags: 'nodejs, javascript, backend, express, rest api, web development, fullstack, software'
  },
  {
    id: 'preset-devops',
    name: 'DevOps & CI/CD Pipelines',
    category: 'DevOps',
    tags: 'devops, cicd, github actions, automation, continuous integration, deployment, sre'
  },
  {
    id: 'preset-shorts',
    name: 'YouTube Shorts Growth',
    category: 'YouTube',
    tags: 'shorts, youtube shorts, content creator, viral, trending, algorithm, tech tips, coding'
  },
  {
    id: 'preset-system-design',
    name: 'System Design & Scalability',
    category: 'Architecture',
    tags: 'system design, software architecture, scalability, high availability, cloud native, distributed systems'
  },
  {
    id: 'preset-security',
    name: 'Cybersecurity & RBAC',
    category: 'Security',
    tags: 'security, authentication, jwt, rbac, cybersecurity, infosec, access control, devsecops'
  },
  {
    id: 'preset-frontend',
    name: 'Modern Web & UI/UX Design',
    category: 'Frontend',
    tags: 'frontend, ui, ux, responsive design, css, javascript, web design, modern web'
  }
];

/**
 * Helper to fetch presets from system_settings
 */
async function fetchPresetsFromDb() {
  const res = await query("SELECT value FROM system_settings WHERE key = 'tag_presets'");
  if (res.rows.length === 0) {
    // Seed default presets in DB
    await query(
      `INSERT INTO system_settings (key, value, category, description) 
       VALUES ('tag_presets', $1::jsonb, 'content', 'Curated and custom tag presets for Content Creator Wizard')
       ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(DEFAULT_TAG_PRESETS)]
    );
    return DEFAULT_TAG_PRESETS;
  }

  let val = res.rows[0].value;
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch {
      val = DEFAULT_TAG_PRESETS;
    }
  }
  return Array.isArray(val) ? val : DEFAULT_TAG_PRESETS;
}

/**
 * Helper to save presets to system_settings
 */
async function savePresetsToDb(presets, updatedByUuid = null) {
  await query(
    `INSERT INTO system_settings (key, value, category, description, updated_at, updated_by)
     VALUES ('tag_presets', $1::jsonb, 'content', 'Curated and custom tag presets for Content Creator Wizard', CURRENT_TIMESTAMP, $2)
     ON CONFLICT (key) DO UPDATE 
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP, updated_by = EXCLUDED.updated_by`,
    [JSON.stringify(presets), updatedByUuid]
  );
}

/**
 * GET /api/tags/presets
 * List all curated and custom tag presets
 */
router.get('/presets', authenticateToken, async (req, res) => {
  try {
    const presets = await fetchPresetsFromDb();
    return res.json({
      success: true,
      count: presets.length,
      presets
    });
  } catch (err) {
    logger.error(`[TAGS-GET-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: 'Failed to retrieve tag presets' });
  }
});

/**
 * POST /api/tags/presets
 * Create a new tag preset
 */
router.post('/presets', authenticateToken, async (req, res) => {
  try {
    const { name, tags, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Preset name is required' });
    }

    if (!tags || !tags.trim()) {
      return res.status(400).json({ success: false, error: 'Tags are required' });
    }

    const cleanTags = tags.trim();
    if (cleanTags.length > 500) {
      return res.status(400).json({ success: false, error: 'Preset tags cannot exceed 500 characters' });
    }

    const currentPresets = await fetchPresetsFromDb();

    // Check for duplicate name
    const existing = currentPresets.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, error: `A tag preset named "${name.trim()}" already exists` });
    }

    const newPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      category: (category || 'Custom').trim(),
      tags: cleanTags
    };

    const updatedPresets = [newPreset, ...currentPresets];
    await savePresetsToDb(updatedPresets, req.user?.id || null);

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'tag_preset',
      entityId: newPreset.id,
      details: { name: newPreset.name, tagCount: cleanTags.split(',').length }
    });

    return res.status(201).json({
      success: true,
      message: `Tag preset "${newPreset.name}" created successfully`,
      preset: newPreset,
      presets: updatedPresets
    });
  } catch (err) {
    logger.error(`[TAG-CREATE-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/tags/presets/:id
 * Update an existing tag preset
 */
router.put('/presets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tags, category } = req.body;

    const currentPresets = await fetchPresetsFromDb();
    const index = currentPresets.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Tag preset not found' });
    }

    if (name && !name.trim()) {
      return res.status(400).json({ success: false, error: 'Preset name cannot be empty' });
    }

    const updatedTags = tags !== undefined ? tags.trim() : currentPresets[index].tags;
    if (updatedTags.length > 500) {
      return res.status(400).json({ success: false, error: 'Preset tags cannot exceed 500 characters' });
    }

    const updatedPreset = {
      ...currentPresets[index],
      name: name ? name.trim() : currentPresets[index].name,
      category: category ? category.trim() : currentPresets[index].category,
      tags: updatedTags
    };

    currentPresets[index] = updatedPreset;
    await savePresetsToDb(currentPresets, req.user?.id || null);

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'tag_preset',
      entityId: id,
      details: { name: updatedPreset.name }
    });

    return res.json({
      success: true,
      message: `Tag preset "${updatedPreset.name}" updated successfully`,
      preset: updatedPreset,
      presets: currentPresets
    });
  } catch (err) {
    logger.error(`[TAG-UPDATE-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/tags/presets/:id
 * Delete a tag preset
 */
router.delete('/presets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentPresets = await fetchPresetsFromDb();
    const target = currentPresets.find(p => p.id === id);

    if (!target) {
      return res.status(404).json({ success: false, error: 'Tag preset not found' });
    }

    const remainingPresets = currentPresets.filter(p => p.id !== id);
    await savePresetsToDb(remainingPresets, req.user?.id || null);

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'tag_preset',
      entityId: id,
      details: { name: target.name }
    });

    return res.json({
      success: true,
      message: `Tag preset "${target.name}" deleted successfully`,
      presets: remainingPresets
    });
  } catch (err) {
    logger.error(`[TAG-DELETE-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tags/presets/reset
 * Reset all presets back to curated default presets
 */
router.post('/presets/reset', authenticateToken, async (req, res) => {
  try {
    await savePresetsToDb(DEFAULT_TAG_PRESETS, req.user?.id || null);

    await recordAudit(req, {
      action: 'RESET',
      entity: 'tag_preset',
      entityId: 'all',
      details: { defaultCount: DEFAULT_TAG_PRESETS.length }
    });

    return res.json({
      success: true,
      message: 'Tag presets successfully reset to default curated bundles',
      presets: DEFAULT_TAG_PRESETS
    });
  } catch (err) {
    logger.error(`[TAG-RESET-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
