const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { logger } = require('../config/logger');
const { getYouTubeChannelInfo } = require('../services/youtube.service');

// Curated default high-value subscriptions for new / empty channels
const CURATED_DEFAULT_SUBSCRIPTIONS = [
  {
    subscribed_channel_id: 'UCsBjURrPoezykLs9EqgamOA',
    subscribed_channel_title: 'Fireship',
    subscribed_channel_handle: '@fireship',
    subscribed_channel_url: 'https://www.youtube.com/@fireship',
    subscribed_channel_avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_k4-Tq1dE2p3_Y1Q_A_Q9fW2_z_3_4=s176-c-k-c0x00ffffff-no-rj',
    description: 'High-intensity code tutorials and tech news to help you ship apps faster.',
    subscriber_count: 4290000,
    video_count: 650,
    category: 'Development'
  },
  {
    subscribed_channel_id: 'UCdngmbVKX1Tgre669WB7N_Q',
    subscribed_channel_title: 'TechWorld with Nana',
    subscribed_channel_handle: '@TechWorldwithNana',
    subscribed_channel_url: 'https://www.youtube.com/@TechWorldwithNana',
    subscribed_channel_avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_k6_eA1_2b_3_4=s176-c-k-c0x00ffffff-no-rj',
    description: 'DevOps, Docker, Kubernetes, CI/CD, Terraform, Prometheus and cloud native technologies explained simply.',
    subscriber_count: 1500000,
    video_count: 220,
    category: 'DevOps & Cloud'
  },
  {
    subscribed_channel_id: 'UC9x0AN7BWHpCDHSm9NiJFJQ',
    subscribed_channel_title: 'NetworkChuck',
    subscribed_channel_handle: '@NetworkChuck',
    subscribed_channel_url: 'https://www.youtube.com/@NetworkChuck',
    subscribed_channel_avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_k8_eA1_2b_3_4=s176-c-k-c0x00ffffff-no-rj',
    description: 'Coffee, Linux, Python, Cybersecurity, Cloud, and Networking tutorials.',
    subscriber_count: 4100000,
    video_count: 480,
    category: 'Networking & Security'
  },
  {
    subscribed_channel_id: 'UC_ML5xP23TOWKUcc-oAE_Eg',
    subscribed_channel_title: 'ByteByteGo',
    subscribed_channel_handle: '@ByteByteGo',
    subscribed_channel_url: 'https://www.youtube.com/@ByteByteGo',
    subscribed_channel_avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_kB_eA1_2b_3_4=s176-c-k-c0x00ffffff-no-rj',
    description: 'Visual system design, software architecture, databases, and microservices breakdowns.',
    subscriber_count: 1400000,
    video_count: 190,
    category: 'Architecture'
  },
  {
    subscribed_channel_id: 'UCfz8x0lVzJpb_g6S1lF61wg',
    subscribed_channel_title: 'DevOps Toolkit',
    subscribed_channel_handle: '@DevOpsToolkit',
    subscribed_channel_url: 'https://www.youtube.com/@DevOpsToolkit',
    subscribed_channel_avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_kC_eA1_2b_3_4=s176-c-k-c0x00ffffff-no-rj',
    description: 'Continuous Delivery, GitOps, Kubernetes, Crossplane, ArgoCD, and modern SRE workflows.',
    subscriber_count: 185000,
    video_count: 410,
    category: 'DevOps & Cloud'
  },
  {
    subscribed_channel_id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    subscribed_channel_title: 'Google for Developers',
    subscribed_channel_handle: '@GoogleDevelopers',
    subscribed_channel_url: 'https://www.youtube.com/@GoogleDevelopers',
    subscribed_channel_avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_kD_eA1_2b_3_4=s176-c-k-c0x00ffffff-no-rj',
    description: 'The official YouTube channel for Google developer technologies, Android, AI, Web, and Cloud.',
    subscriber_count: 2360000,
    video_count: 6200,
    category: 'Development'
  },
  {
    subscribed_channel_id: 'UCn64h1Y_Y5x6k3fF1_7c_2g',
    subscribed_channel_title: 'Docker',
    subscribed_channel_handle: '@docker',
    subscribed_channel_url: 'https://www.youtube.com/@docker',
    subscribed_channel_avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_kE_eA1_2b_3_4=s176-c-k-c0x00ffffff-no-rj',
    description: 'Official Docker channel: containers, Docker Compose, Docker Desktop, security, and developer productivity.',
    subscriber_count: 195000,
    video_count: 530,
    category: 'DevOps & Cloud'
  },
  {
    subscribed_channel_id: 'UCvA_w8t0GWayBFK6mSg1qHg',
    subscribed_channel_title: 'Hussein Nasser',
    subscribed_channel_handle: '@HusseinNasser-software',
    subscribed_channel_url: 'https://www.youtube.com/@HusseinNasser-software',
    subscribed_channel_avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_kF_eA1_2b_3_4=s176-c-k-c0x00ffffff-no-rj',
    description: 'Deep dives into Backend Engineering, PostgreSQL, Database Internals, HTTP/3, and Networking.',
    subscriber_count: 410000,
    video_count: 1100,
    category: 'Database & Systems'
  }
];

/**
 * Helper to ensure a channel has baseline subscriptions
 */
async function autoSeedSubscriptionsIfEmpty(channelId) {
  try {
    const countRes = await query('SELECT COUNT(*) as count FROM channel_subscriptions WHERE channel_id = $1', [channelId]);
    const count = parseInt(countRes.rows[0].count, 10);
    if (count === 0) {
      logger.info(`[SUBSCRIPTIONS] Auto-seeding initial curated subscriptions for channel ${channelId}`);
      for (const sub of CURATED_DEFAULT_SUBSCRIPTIONS) {
        await query(
          `INSERT INTO channel_subscriptions 
           (channel_id, subscribed_channel_id, subscribed_channel_title, subscribed_channel_handle, subscribed_channel_url, subscribed_channel_avatar, description, subscriber_count, video_count, category)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (channel_id, subscribed_channel_id) DO NOTHING`,
          [
            channelId,
            sub.subscribed_channel_id,
            sub.subscribed_channel_title,
            sub.subscribed_channel_handle,
            sub.subscribed_channel_url,
            sub.subscribed_channel_avatar,
            sub.description,
            sub.subscriber_count,
            sub.video_count,
            sub.category
          ]
        );
      }
    }
  } catch (err) {
    logger.warn(`[SUBSCRIPTIONS] Could not auto-seed subscriptions: ${err.message}`);
  }
}

/**
 * GET /api/subscriptions
 * Fetch subscriptions filtered by channel, search, category, and sorted
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      channel_id = 'all', 
      search = '', 
      category = 'all', 
      sort_by = 'subscribed_at', 
      order = 'DESC',
      page = 1,
      limit = 100
    } = req.query;

    // Check if we should auto-seed any existing channels if DB is empty
    const totalSubsCheck = await query('SELECT COUNT(*) as count FROM channel_subscriptions');
    if (parseInt(totalSubsCheck.rows[0].count, 10) === 0) {
      const defaultChannelRes = await query('SELECT id FROM channels ORDER BY is_default DESC, created_at ASC LIMIT 1');
      if (defaultChannelRes.rows.length > 0) {
        await autoSeedSubscriptionsIfEmpty(defaultChannelRes.rows[0].id);
      }
    }

    const conditions = [];
    const params = [];

    // Filter by channel
    if (channel_id && channel_id !== 'all' && channel_id !== '') {
      params.push(channel_id);
      conditions.push(`s.channel_id = $${params.length}`);
    }

    // Filter by search keyword
    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(s.subscribed_channel_title) LIKE $${pIdx} OR 
        LOWER(COALESCE(s.subscribed_channel_handle, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(s.description, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(s.category, '')) LIKE $${pIdx} OR
        LOWER(s.subscribed_channel_id) LIKE $${pIdx}
      )`);
    }

    // Filter by category
    if (category && category !== 'all' && category !== '') {
      params.push(category);
      conditions.push(`s.category = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate and sanitize sort options
    const validSortFields = {
      'subscribed_at': 's.subscribed_at',
      'created_at': 's.created_at',
      'title': 's.subscribed_channel_title',
      'subscriber_count': 's.subscriber_count',
      'video_count': 's.video_count',
      'category': 's.category'
    };
    const sortField = validSortFields[sort_by] || 's.subscribed_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total matching records
    const countSql = `
      SELECT COUNT(*) as total 
      FROM channel_subscriptions s 
      JOIN channels c ON c.id = s.channel_id
      ${whereClause}
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    // Pagination calculation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = parseInt(limit, 10) === 0 ? total : Math.max(1, parseInt(limit, 10) || 50);
    const offset = (pageNum - 1) * limitNum;

    // Fetch data rows
    const dataSql = `
      SELECT 
        s.id,
        s.channel_id,
        s.subscribed_channel_id,
        s.subscribed_channel_title,
        s.subscribed_channel_handle,
        s.subscribed_channel_url,
        s.subscribed_channel_avatar,
        s.description,
        s.subscriber_count,
        s.video_count,
        s.category,
        s.subscribed_at,
        s.is_active,
        s.created_at,
        s.updated_at,
        c.name as my_channel_name,
        c.handle as my_channel_handle,
        c.avatar_url as my_channel_avatar
      FROM channel_subscriptions s
      JOIN channels c ON c.id = s.channel_id
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    const dataRes = await query(dataSql, params);

    // Aggregate available categories and channel breakdown
    const catRes = await query(`
      SELECT category, COUNT(*) as count 
      FROM channel_subscriptions 
      ${channel_id && channel_id !== 'all' ? 'WHERE channel_id = $1' : ''} 
      GROUP BY category 
      ORDER BY count DESC
    `, channel_id && channel_id !== 'all' ? [channel_id] : []);

    const channelsRes = await query(`
      SELECT c.id, c.name, c.handle, COUNT(s.id) as subscription_count
      FROM channels c
      LEFT JOIN channel_subscriptions s ON s.channel_id = c.id
      GROUP BY c.id
      ORDER BY c.is_default DESC, c.name ASC
    `);

    return res.json({
      success: true,
      subscriptions: dataRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      },
      categories: catRes.rows,
      channels: channelsRes.rows
    });
  } catch (err) {
    logger.error(`[SUBSCRIPTIONS-GET-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions
 * Add or subscribe to a channel for a specific managed channel
 */
router.post('/', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { 
      channel_id, 
      target_channel, 
      category = 'DevOps & Cloud', 
      description,
      subscribed_at = new Date() 
    } = req.body;

    if (!channel_id) {
      return res.status(400).json({ success: false, error: 'A valid managed channel_id is required' });
    }
    if (!target_channel || !target_channel.trim()) {
      return res.status(400).json({ success: false, error: 'Target YouTube channel handle, URL, or ID is required' });
    }

    // Verify channel exists in our database
    const chCheck = await query('SELECT id, name FROM channels WHERE id = $1', [channel_id]);
    if (chCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Managed channel not found' });
    }

    let channelInfo = {
      name: target_channel.trim(),
      handle: target_channel.startsWith('@') ? target_channel.trim() : `@${target_channel.trim().replace(/^https?:\/\/(?:www\.)?youtube\.com\//i, '')}`,
      channelId: `UC_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      channelUrl: target_channel.startsWith('http') ? target_channel : `https://www.youtube.com/${target_channel.trim().startsWith('@') ? target_channel.trim() : '@' + target_channel.trim()}`,
      avatarUrl: null,
      description: description || '',
      subscriberCount: 0,
      videoCount: 0
    };

    // Attempt live YouTube scraping to pull real avatar, title, channelId, and subscriber count
    try {
      const liveInfo = await getYouTubeChannelInfo(target_channel);
      if (liveInfo) {
        channelInfo = {
          name: liveInfo.name || channelInfo.name,
          handle: liveInfo.handle || channelInfo.handle,
          channelId: liveInfo.channelId || channelInfo.channelId,
          channelUrl: liveInfo.channelUrl || channelInfo.channelUrl,
          avatarUrl: liveInfo.avatarUrl || null,
          description: liveInfo.description || channelInfo.description,
          subscriberCount: liveInfo.subscriberCount || 0,
          videoCount: liveInfo.videoCount || 0
        };
      }
    } catch (scrapeErr) {
      logger.warn(`[SUBSCRIPTIONS] Could not resolve live metadata for ${target_channel}: ${scrapeErr.message}. Storing with provided inputs.`);
    }

    const insertSql = `
      INSERT INTO channel_subscriptions 
      (channel_id, subscribed_channel_id, subscribed_channel_title, subscribed_channel_handle, subscribed_channel_url, subscribed_channel_avatar, description, subscriber_count, video_count, category, subscribed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (channel_id, subscribed_channel_id) DO UPDATE SET
        subscribed_channel_title = EXCLUDED.subscribed_channel_title,
        subscribed_channel_handle = EXCLUDED.subscribed_channel_handle,
        subscribed_channel_url = EXCLUDED.subscribed_channel_url,
        subscribed_channel_avatar = COALESCE(EXCLUDED.subscribed_channel_avatar, channel_subscriptions.subscribed_channel_avatar),
        description = COALESCE(EXCLUDED.description, channel_subscriptions.description),
        subscriber_count = GREATEST(EXCLUDED.subscriber_count, channel_subscriptions.subscriber_count),
        video_count = GREATEST(EXCLUDED.video_count, channel_subscriptions.video_count),
        category = EXCLUDED.category,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const insertRes = await query(insertSql, [
      channel_id,
      channelInfo.channelId,
      channelInfo.name,
      channelInfo.handle,
      channelInfo.channelUrl,
      channelInfo.avatarUrl,
      channelInfo.description || description || '',
      channelInfo.subscriberCount,
      channelInfo.videoCount,
      category,
      subscribed_at
    ]);

    const createdSub = insertRes.rows[0];

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'subscription',
      entityId: createdSub.id,
      details: {
        my_channel: chCheck.rows[0].name,
        subscribed_to: createdSub.subscribed_channel_title,
        handle: createdSub.subscribed_channel_handle
      }
    });

    return res.status(201).json({
      success: true,
      subscription: createdSub
    });
  } catch (err) {
    logger.error(`[SUBSCRIPTIONS-CREATE-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/subscriptions/:id
 * Update category, notes, or active status
 */
router.put('/:id', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, is_active } = req.body;

    const updateRes = await query(`
      UPDATE channel_subscriptions
      SET 
        category = COALESCE($1, category),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [category, description, is_active, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'subscription',
      entityId: id,
      details: { category, is_active }
    });

    return res.json({ success: true, subscription: updateRes.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Remove a subscription from database
 */
router.delete('/:id', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { id } = req.params;

    const delRes = await query('DELETE FROM channel_subscriptions WHERE id = $1 RETURNING *', [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const deleted = delRes.rows[0];
    await recordAudit(req, {
      action: 'DELETE',
      entity: 'subscription',
      entityId: id,
      details: { title: deleted.subscribed_channel_title, handle: deleted.subscribed_channel_handle }
    });

    return res.json({ success: true, message: 'Subscription successfully removed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/sync
 * Sync or refresh live subscriber count & metadata for all subscriptions
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { channel_id } = req.body;

    let targetSubsQuery = 'SELECT * FROM channel_subscriptions';
    let params = [];
    if (channel_id && channel_id !== 'all') {
      targetSubsQuery += ' WHERE channel_id = $1';
      params.push(channel_id);
    }

    const subsRes = await query(targetSubsQuery, params);
    
    // If empty and channel_id is specified, auto-seed default tech channels
    if (subsRes.rows.length === 0 && channel_id && channel_id !== 'all') {
      await autoSeedSubscriptionsIfEmpty(channel_id);
      return res.json({ 
        success: true, 
        message: 'Channel initialized with curated subscriptions baseline', 
        syncedCount: CURATED_DEFAULT_SUBSCRIPTIONS.length 
      });
    }

    let updatedCount = 0;
    // Iterate over subscriptions with concurrency limit
    for (const sub of subsRes.rows.slice(0, 15)) {
      try {
        const target = sub.subscribed_channel_handle || sub.subscribed_channel_url || sub.subscribed_channel_id;
        const live = await getYouTubeChannelInfo(target);
        if (live) {
          await query(`
            UPDATE channel_subscriptions 
            SET 
              subscriber_count = $1, 
              video_count = $2, 
              subscribed_channel_avatar = COALESCE($3, subscribed_channel_avatar),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [live.subscriberCount || sub.subscriber_count, live.videoCount || sub.video_count, live.avatarUrl, sub.id]);
          updatedCount++;
        }
      } catch (err) {
        logger.warn(`[SYNC-SUB] Could not update ${sub.subscribed_channel_title}: ${err.message}`);
      }
    }

    return res.json({
      success: true,
      message: `Synchronized ${updatedCount} subscriptions with YouTube live metrics`,
      syncedCount: updatedCount,
      totalCount: subsRes.rows.length
    });
  } catch (err) {
    logger.error(`[SUBS-SYNC-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/subscriptions/import
 * Bulk import subscriptions from Takeout CSV or JSON array
 */
router.post('/import', authenticateToken, requirePermission('can_manage_content'), async (req, res) => {
  try {
    const { channel_id, items = [] } = req.body;

    if (!channel_id) {
      return res.status(400).json({ success: false, error: 'Target managed channel_id is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items provided for import' });
    }

    let imported = 0;
    let skipped = 0;

    for (const item of items) {
      // Support YouTube Takeout format:
      // "Channel Id", "Channel Url", "Channel Title"
      const chId = item.channel_id || item['Channel Id'] || item.subscribed_channel_id || `UC_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const title = item.title || item['Channel Title'] || item.subscribed_channel_title || 'Imported Channel';
      const url = item.url || item['Channel Url'] || item.subscribed_channel_url || (chId.startsWith('UC') ? `https://www.youtube.com/channel/${chId}` : `https://www.youtube.com/${chId}`);
      const handle = item.handle || item.subscribed_channel_handle || (url.includes('/@') ? `@${url.split('/@')[1].split('/')[0]}` : null);
      const category = item.category || 'Imported';
      const subs = parseInt(item.subscriber_count || item.subscribers || 0, 10);

      try {
        await query(`
          INSERT INTO channel_subscriptions
          (channel_id, subscribed_channel_id, subscribed_channel_title, subscribed_channel_handle, subscribed_channel_url, description, subscriber_count, category)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (channel_id, subscribed_channel_id) DO UPDATE SET
            subscribed_channel_title = EXCLUDED.subscribed_channel_title,
            subscribed_channel_url = EXCLUDED.subscribed_channel_url,
            category = EXCLUDED.category,
            updated_at = CURRENT_TIMESTAMP
        `, [channel_id, chId, title, handle, url, item.description || '', subs, category]);
        imported++;
      } catch (e) {
        skipped++;
      }
    }

    await recordAudit(req, {
      action: 'MIGRATION',
      entity: 'subscription',
      details: { channel_id, imported, skipped }
    });

    return res.json({
      success: true,
      message: `Bulk import completed: ${imported} imported, ${skipped} skipped`,
      imported,
      skipped
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subscriptions/export
 * Server-side export to CSV or JSON format
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { format = 'csv', channel_id = 'all', category = 'all', search = '' } = req.query;

    const conditions = [];
    const params = [];

    if (channel_id && channel_id !== 'all') {
      params.push(channel_id);
      conditions.push(`s.channel_id = $${params.length}`);
    }

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`s.category = $${params.length}`);
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(s.subscribed_channel_title) LIKE $${pIdx} OR 
        LOWER(COALESCE(s.subscribed_channel_handle, '')) LIKE $${pIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        s.id,
        c.name as my_channel_name,
        c.handle as my_channel_handle,
        s.subscribed_channel_title as channel_title,
        s.subscribed_channel_handle as handle,
        s.subscribed_channel_id as channel_id,
        s.subscribed_channel_url as channel_url,
        s.subscriber_count,
        s.video_count,
        s.category,
        s.subscribed_at,
        s.created_at
      FROM channel_subscriptions s
      JOIN channels c ON c.id = s.channel_id
      ${whereClause}
      ORDER BY s.subscribed_at DESC
    `;

    const dataRes = await query(sql, params);
    const rows = dataRes.rows;
    const dateStr = new Date().toISOString().split('T')[0];

    if (String(format).toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="subscriptions_export_${dateStr}.json"`);
      return res.json(rows);
    }

    // RFC 4180 CSV export
    const headers = [
      'ID',
      'My Channel Name',
      'My Channel Handle',
      'Subscribed Channel Title',
      'Handle',
      'Channel ID',
      'Channel URL',
      'Subscriber Count',
      'Video Count',
      'Category',
      'Subscribed Date',
      'Record Created At'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    const csvLines = [headers.join(',')];
    for (const r of rows) {
      csvLines.push([
        escapeCsv(r.id),
        escapeCsv(r.my_channel_name),
        escapeCsv(r.my_channel_handle),
        escapeCsv(r.channel_title),
        escapeCsv(r.handle),
        escapeCsv(r.channel_id),
        escapeCsv(r.channel_url),
        r.subscriber_count || 0,
        r.video_count || 0,
        escapeCsv(r.category),
        escapeCsv(r.subscribed_at ? new Date(r.subscribed_at).toISOString() : ''),
        escapeCsv(r.created_at ? new Date(r.created_at).toISOString() : '')
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="subscriptions_export_${dateStr}.csv"`);
    return res.send(csvLines.join('\r\n'));
  } catch (err) {
    logger.error(`[EXPORT-ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
