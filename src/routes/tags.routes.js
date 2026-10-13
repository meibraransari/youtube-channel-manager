const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');

// Curated default tag presets for YouTube Content Creators (10 Distinct Categories)
const DEFAULT_TAG_PRESETS = [
  {
    id: 'preset-postgres',
    name: 'PostgreSQL & Database',
    category: 'Database',
    tags: 'postgresql, database, pg18, sql, rdbms, performance, indexing, backend, data modeling',
    is_system: true
  },
  {
    id: 'preset-kubernetes',
    name: 'Kubernetes & Cloud',
    category: 'Cloud & DevOps',
    tags: 'kubernetes, k8s, containers, devops, cloud, microservices, helm, cluster, cloud native',
    is_system: true
  },
  {
    id: 'preset-docker',
    name: 'Docker & Microservices',
    category: 'DevOps',
    tags: 'docker, docker compose, microservices, containers, devops, linux, deployment',
    is_system: true
  },
  {
    id: 'preset-automation',
    name: 'AI & Automation',
    category: 'AI & ML',
    tags: 'ai, machine learning, automation, llm, artificial intelligence, deep learning, workflow',
    is_system: true
  },
  {
    id: 'preset-nodejs',
    name: 'Node.js & Backend Architecture',
    category: 'Development',
    tags: 'nodejs, javascript, backend, express, rest api, web development, fullstack, software',
    is_system: true
  },
  {
    id: 'preset-devops',
    name: 'DevOps & CI/CD Pipelines',
    category: 'DevOps',
    tags: 'devops, cicd, github actions, automation, continuous integration, deployment, sre',
    is_system: true
  },
  {
    id: 'preset-shorts',
    name: 'YouTube Shorts Growth',
    category: 'YouTube',
    tags: 'shorts, youtube shorts, content creator, viral, trending, algorithm, tech tips, coding',
    is_system: true
  },
  {
    id: 'preset-system-design',
    name: 'System Design & Scalability',
    category: 'Architecture',
    tags: 'system design, software architecture, scalability, high availability, cloud native, distributed systems',
    is_system: true
  },
  {
    id: 'preset-security',
    name: 'Cybersecurity & RBAC',
    category: 'Security',
    tags: 'security, authentication, jwt, rbac, cybersecurity, infosec, access control, devsecops',
    is_system: true
  },
  {
    id: 'preset-frontend',
    name: 'Modern Web & UI/UX Design',
    category: 'Frontend',
    tags: 'frontend, ui, ux, responsive design, css, javascript, web design, modern web',
    is_system: true
  }
];

/**
 * Helper to fetch all presets from dedicated tag_presets table
 */
async function getAllPresetsFromDb(category = null, search = null) {
  let sql = 'SELECT id, name, category, tags, is_system, created_at, updated_at FROM tag_presets WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(category) LIKE $${params.length} OR LOWER(tags) LIKE $${params.length})`;
  }

  sql += ' ORDER BY is_system DESC, category ASC, name ASC';
  const res = await query(sql, params);
  return res.rows;
}

/**
 * GET /api/tags/presets
 * List all tag presets from dedicated tag_presets table with optional filtering
 */
router.get('/presets', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    const presets = await getAllPresetsFromDb(category, search);

    return res.json({
      success: true,
      count: presets.length,
      presets
    });
  } catch (err) {
    logger.error(`[TAGS-GET-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: 'Failed to retrieve tag presets from database' });
  }
});

/**
 * GET /api/tags/categories
 * List distinct categories from tag_presets table
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const catRes = await query('SELECT DISTINCT category FROM tag_presets ORDER BY category ASC');
    const categories = catRes.rows.map(r => r.category);
    return res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (err) {
    logger.error(`[TAG-CATEGORIES-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tags/presets
 * Create a new tag preset as a dedicated row in tag_presets table
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

    const cleanName = name.trim();
    const cleanTags = tags.trim();
    const cleanCategory = (category && category.trim()) ? category.trim() : 'Custom';

    if (cleanTags.length > 500) {
      return res.status(400).json({ success: false, error: 'Preset tags cannot exceed 500 characters' });
    }

    // Check for duplicate preset name
    const dupCheck = await query('SELECT id FROM tag_presets WHERE LOWER(name) = LOWER($1)', [cleanName]);
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: `A tag preset named "${cleanName}" already exists` });
    }

    const id = `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const userId = req.user?.id || null;

    const insertRes = await query(
      `INSERT INTO tag_presets (id, name, category, tags, is_system, created_by, updated_by)
       VALUES ($1, $2, $3, $4, FALSE, $5, $5)
       RETURNING id, name, category, tags, is_system, created_at, updated_at`,
      [id, cleanName, cleanCategory, cleanTags, userId]
    );

    const newPreset = insertRes.rows[0];
    const allPresets = await getAllPresetsFromDb();

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'tag_preset',
      entityId: newPreset.id,
      details: { name: newPreset.name, category: newPreset.category, tagCount: cleanTags.split(',').length }
    });

    return res.status(201).json({
      success: true,
      message: `Tag preset "${newPreset.name}" created successfully in tag_presets registry`,
      preset: newPreset,
      presets: allPresets
    });
  } catch (err) {
    logger.error(`[TAG-CREATE-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/tags/presets/:id
 * Update an existing tag preset row in tag_presets table
 */
router.put('/presets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tags, category } = req.body;

    const existingRes = await query('SELECT * FROM tag_presets WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tag preset not found' });
    }

    const existing = existingRes.rows[0];

    if (name && !name.trim()) {
      return res.status(400).json({ success: false, error: 'Preset name cannot be empty' });
    }

    const cleanName = name ? name.trim() : existing.name;
    const cleanCategory = category !== undefined ? category.trim() : existing.category;
    const cleanTags = tags !== undefined ? tags.trim() : existing.tags;

    if (cleanTags.length > 500) {
      return res.status(400).json({ success: false, error: 'Preset tags cannot exceed 500 characters' });
    }

    // Check unique name constraint if name changed
    if (name && cleanName.toLowerCase() !== existing.name.toLowerCase()) {
      const dupCheck = await query('SELECT id FROM tag_presets WHERE LOWER(name) = LOWER($1) AND id != $2', [cleanName, id]);
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: `A tag preset named "${cleanName}" already exists` });
      }
    }

    const userId = req.user?.id || null;
    const updateRes = await query(
      `UPDATE tag_presets 
       SET name = $1, category = $2, tags = $3, updated_at = CURRENT_TIMESTAMP, updated_by = $4
       WHERE id = $5
       RETURNING id, name, category, tags, is_system, created_at, updated_at`,
      [cleanName, cleanCategory, cleanTags, userId, id]
    );

    const updatedPreset = updateRes.rows[0];
    const allPresets = await getAllPresetsFromDb();

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'tag_preset',
      entityId: id,
      details: { name: updatedPreset.name, category: updatedPreset.category }
    });

    return res.json({
      success: true,
      message: `Tag preset "${updatedPreset.name}" updated successfully`,
      preset: updatedPreset,
      presets: allPresets
    });
  } catch (err) {
    logger.error(`[TAG-UPDATE-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/tags/presets/:id
 * Delete a tag preset row from tag_presets table
 */
router.delete('/presets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existingRes = await query('SELECT name FROM tag_presets WHERE id = $1', [id]);

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tag preset not found' });
    }

    const presetName = existingRes.rows[0].name;
    await query('DELETE FROM tag_presets WHERE id = $1', [id]);
    const allPresets = await getAllPresetsFromDb();

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'tag_preset',
      entityId: id,
      details: { name: presetName }
    });

    return res.json({
      success: true,
      message: `Tag preset "${presetName}" deleted successfully from database`,
      presets: allPresets
    });
  } catch (err) {
    logger.error(`[TAG-DELETE-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tags/presets/reset
 * Reset all presets back to curated default rows in tag_presets table
 */
router.post('/presets/reset', authenticateToken, async (req, res) => {
  try {
    // Delete non-system presets or reset entire table to default curated list
    await query('DELETE FROM tag_presets WHERE is_system = FALSE');

    // Re-ensure all 10 curated defaults are present
    for (const p of DEFAULT_TAG_PRESETS) {
      await query(
        `INSERT INTO tag_presets (id, name, category, tags, is_system)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (id) DO UPDATE 
         SET name = EXCLUDED.name, category = EXCLUDED.category, tags = EXCLUDED.tags, is_system = TRUE`,
        [p.id, p.name, p.category, p.tags]
      );
    }

    const allPresets = await getAllPresetsFromDb();

    await recordAudit(req, {
      action: 'RESET',
      entity: 'tag_preset',
      entityId: 'all',
      details: { defaultCount: DEFAULT_TAG_PRESETS.length }
    });

    return res.json({
      success: true,
      message: 'Tag presets successfully reset to default curated bundles',
      presets: allPresets
    });
  } catch (err) {
    logger.error(`[TAG-RESET-FAILED] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
