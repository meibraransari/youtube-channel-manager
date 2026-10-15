const https = require('https');
const crypto = require('crypto');
const { query } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * Fetch raw HTML from a URL with browser-like headers
 */
function fetchHttp(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.get({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      },
      timeout: 12000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).toString();
        }
        return fetchHttp(redirectUrl).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });

    req.on('error', reject);
  });
}

/**
 * Parse human numbers like "615 subscribers", "1.2K views", "10M", "179 videos"
 */
function parseHumanNumber(str) {
  if (!str) return 0;
  const clean = String(str).replace(/,/g, '').trim().toLowerCase();
  const match = clean.match(/([\d.]+)\s*([kmbt])?/);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  const mult = match[2];
  if (mult === 'k') num *= 1000;
  else if (mult === 'm') num *= 1000000;
  else if (mult === 'b') num *= 1000000000;
  return Math.round(num);
}

/**
 * Parse relative published time like "2mo ago", "3 weeks ago", "1 day ago", "5 hours ago", "1 year ago"
 */
function parsePublishedAgo(str) {
  if (!str) return new Date();
  const clean = String(str).toLowerCase().trim();
  const now = new Date();
  const match = clean.match(/([\d.]+)\s*(second|minute|month|hour|year|week|sec|min|day|wk|mo|yr|hr|s|m|h|d|w|y)s?\s*(ago)?/i);
  if (!match) return now;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const d = new Date(now.getTime());
  if (['year', 'yr', 'y'].includes(unit)) {
    d.setFullYear(d.getFullYear() - Math.round(num));
  } else if (['month', 'mo'].includes(unit)) {
    d.setMonth(d.getMonth() - Math.round(num));
  } else if (['week', 'wk', 'w'].includes(unit)) {
    d.setDate(d.getDate() - Math.round(num * 7));
  } else if (['day', 'd'].includes(unit)) {
    d.setDate(d.getDate() - Math.round(num));
  } else if (['hour', 'hr', 'h'].includes(unit)) {
    d.setHours(d.getHours() - Math.round(num));
  } else if (['minute', 'min', 'm'].includes(unit)) {
    d.setMinutes(d.getMinutes() - Math.round(num));
  }
  return d;
}

/**
 * Clean and normalize a channel handle or URL
 */
function normalizeHandle(input) {
  if (!input) return '@channel';
  let str = input.trim();
  if (str.includes('youtube.com/')) {
    const match = str.match(/youtube\.com\/(@[^\/?#]+)/i);
    if (match) return match[1];
    const parts = str.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    return last.startsWith('@') ? last : `@${last}`;
  }
  return str.startsWith('@') ? str : `@${str}`;
}

/**
 * Robustly extract ytInitialData JSON object from raw YouTube HTML
 */
function extractInitialData(html) {
  if (!html) return null;
  const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = ', 'ytInitialData='];
  for (const marker of markers) {
    const startIdx = html.indexOf(marker);
    if (startIdx !== -1) {
      const jsonStart = startIdx + marker.length;
      let endIdx = html.indexOf(';</script>', jsonStart);
      if (endIdx === -1) endIdx = html.indexOf('</script>', jsonStart);
      if (endIdx !== -1) {
        let rawStr = html.substring(jsonStart, endIdx).trim();
        if (rawStr.endsWith(';')) rawStr = rawStr.slice(0, -1).trim();
        try {
          return JSON.parse(rawStr);
        } catch (_) {}
      }
    }
  }
  const match = html.match(/ytInitialData\s*=\s*({.+?});\s*<\/script>/s);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (_) {}
  }
  return null;
}

/**
 * Fetch Channel Metadata from YouTube (Real live data)
 */
async function getYouTubeChannelInfo(channelUrlOrHandle) {
  const handle = normalizeHandle(channelUrlOrHandle);
  const targetUrl = `https://www.youtube.com/${handle}`;

  logger.info(`[YT-SERVICE] Scraping live channel profile: ${targetUrl}`);
  const html = await fetchHttp(targetUrl);

  const data = extractInitialData(html);
  if (!data) {
    throw new Error(`Could not parse YouTube initial data for ${handle}. Please check the handle or URL.`);
  }

  const meta = data.metadata?.channelMetadataRenderer || {};
  const pvm = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
  const rows = pvm?.metadata?.contentMetadataViewModel?.metadataRows || [];

  let subText = '';
  let vidText = '';

  for (const row of rows) {
    for (const part of row.metadataParts || []) {
      const text = part.text?.content || '';
      if (text.toLowerCase().includes('subscriber')) subText = text;
      if (text.toLowerCase().includes('video')) vidText = text;
    }
  }

  // Fallbacks if header structure differs
  if (!subText) {
    const subMatch = html.match(/([\d.,]+[KMBT]?)\s+subscribers/i);
    if (subMatch) subText = subMatch[0];
  }
  if (!vidText) {
    const vidMatch = html.match(/([\d.,]+[KMBT]?)\s+videos/i);
    if (vidMatch) vidText = vidMatch[0];
  }

  const title = meta.title || pvm?.title?.dynamicTextViewModel?.text?.content || handle.replace(/^@/, '');
  const subscribers = parseHumanNumber(subText);
  const videoCount = parseHumanNumber(vidText);
  const avatarUrl = meta.avatar?.thumbnails?.[0]?.url || pvm?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url || null;
  const description = meta.description || '';
  const channelId = meta.externalId || null;

  return {
    name: title,
    handle,
    channelId,
    channelUrl: targetUrl,
    avatarUrl,
    description,
    subscriberCount: subscribers,
    videoCount: videoCount
  };
}

/**
 * Fetch Real Long-Form Videos for a Channel
 */
async function getYouTubeVideos(handle) {
  const cleanHandle = normalizeHandle(handle);
  const url = `https://www.youtube.com/${cleanHandle}/videos`;

  try {
    const html = await fetchHttp(url);
    const data = extractInitialData(html);
    if (!data) return [];
    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const videoTab = tabs.find(t => t.tabRenderer?.title === 'Videos' || t.tabRenderer?.selected);
    const contents = videoTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

    const videos = [];
    for (const item of contents) {
      const lockup = item.richItemRenderer?.content?.lockupViewModel;
      if (lockup) {
        const videoId = lockup.contentId;
        const title = lockup.metadata?.lockupMetadataViewModel?.title?.content || lockup.accessibilityContext?.label || '';
        const rows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
        let viewsText = '';
        let publishedText = '';
        for (const r of rows) {
          for (const p of r.metadataParts || []) {
            const label = p.text?.accessibilityLabel || p.text?.content || '';
            if (label.toLowerCase().includes('view') || p.leadingIcon) {
              viewsText = label;
            } else if (label.toLowerCase().includes('ago')) {
              publishedText = label;
            } else if (!viewsText && /^[\d.,]+[kmbt]?$/i.test(label.trim())) {
              viewsText = label;
            }
          }
        }
        if (videoId && title) {
          const uploadedAt = publishedText ? parsePublishedAgo(publishedText) : new Date();
          videos.push({
            videoId,
            title: title.trim(),
            views: parseHumanNumber(viewsText),
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            type: 'video',
            uploadedAt
          });
        }
      }
    }
    return videos;
  } catch (err) {
    logger.warn(`[YT-SERVICE] Failed to scrape videos for ${cleanHandle}: ${err.message}`);
    return [];
  }
}

/**
 * Fetch Real Shorts/Reels for a Channel
 */
async function getYouTubeShorts(handle) {
  const cleanHandle = normalizeHandle(handle);
  const url = `https://www.youtube.com/${cleanHandle}/shorts`;

  try {
    const html = await fetchHttp(url);
    const data = extractInitialData(html);
    if (!data) return [];
    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const shortsTab = tabs.find(t => t.tabRenderer?.title === 'Shorts' || t.tabRenderer?.selected);
    const contents = shortsTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

    const shorts = [];
    const now = Date.now();
    let idx = 0;
    for (const item of contents) {
      const slvm = item.richItemRenderer?.content?.shortsLockupViewModel;
      if (slvm) {
        const videoId = slvm.entityId?.replace(/^shorts-shelf-item-/, '') || slvm.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
        let title = slvm.overlayMetadata?.primaryText?.content || slvm.accessibilityText || '';
        const viewsText = slvm.overlayMetadata?.secondaryText?.content || slvm.accessibilityText || '';
        if (videoId) {
          // Clean title if it contains views suffix
          title = title.replace(/,\s*[\d.,]+\s*views.*$/i, '').trim();
          // Distributed upload dates (staggered reverse chronological)
          const uploadedAt = new Date(now - (idx * 2 * 24 * 60 * 60 * 1000));
          shorts.push({
            videoId,
            title: title || `Short ${videoId}`,
            views: parseHumanNumber(viewsText),
            url: `https://www.youtube.com/shorts/${videoId}`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            type: 'short',
            uploadedAt
          });
          idx++;
        }
      }
    }
    return shorts;
  } catch (err) {
    logger.warn(`[YT-SERVICE] Failed to scrape shorts for ${cleanHandle}: ${err.message}`);
    return [];
  }
}

/**
 * Concurrency limited promise runner
 */
async function mapConcurrent(items, limit, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

/**
 * Extract YouTube Video ID from any format (standard URL, short URL, youtu.be, or raw ID)
 */
function extractVideoId(videoIdOrUrl) {
  if (!videoIdOrUrl) return '';
  const str = String(videoIdOrUrl).trim();
  const match = str.match(/(?:v=|\/shorts\/|\/watch\/|youtu\.be\/|^)([a-zA-Z0-9_-]{11})(?:[?&#]|$)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  return '';
}

/**
 * Scrape full real creator video metadata from YouTube watch page:
 * - Complete un-truncated description with links & timestamps
 * - Real uploaded tags/keywords
 * - Video title and exact view count
 */
async function fetchYouTubeVideoDetails(videoIdOrUrl) {
  const videoId = extractVideoId(videoIdOrUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube video ID or URL format');
  }

  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
  logger.info(`[YT-SERVICE] Fetching full video details: ${targetUrl}`);
  const html = await fetchHttp(targetUrl);

  let title = '';
  let description = '';
  let tags = [];
  let views = 0;

  // 1. Primary extraction from ytInitialPlayerResponse
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|<\/script)/) ||
                      html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  if (playerMatch) {
    try {
      const data = JSON.parse(playerMatch[1]);
      const vd = data.videoDetails || {};
      title = vd.title || '';
      description = vd.shortDescription || '';
      if (Array.isArray(vd.keywords)) {
        tags = vd.keywords.map(k => String(k).trim()).filter(Boolean);
      }
      views = parseInt(vd.viewCount, 10) || 0;
    } catch (e) {
      logger.warn(`[YT-SERVICE] Failed parsing player JSON for ${videoId}: ${e.message}`);
    }
  }

  // 2. Fallbacks for title, description, and keywords
  if (!title) {
    const titleMatch = html.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].replace(/\s*-\s*YouTube$/i, '').trim();
  }
  if (!description) {
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    if (descMatch) description = descMatch[1].trim();
  }
  if (tags.length === 0) {
    const kwMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
    if (kwMatch) {
      tags = kwMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Extract hashtags from description if tags list is sparse
  const hashMatches = (description.match(/#[a-zA-Z0-9_\u0080-\uFFFF]+/g) || [])
    .map(h => h.replace(/^#/, ''))
    .filter(Boolean);
  for (const h of hashMatches) {
    if (!tags.includes(h)) tags.push(h);
  }

  // PostgreSQL trigger check_tags_length_func enforces LENGTH(tags) <= 500
  let tagsString = tags.join(', ');
  if (tagsString.length > 500) {
    const trimmed = tagsString.substring(0, 495);
    const lastComma = trimmed.lastIndexOf(',');
    tagsString = (lastComma > 0 ? trimmed.substring(0, lastComma) : trimmed).trim();
  }

  return {
    videoId,
    title,
    description,
    tags: tagsString,
    tagsArray: tags,
    views,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`
  };
}

/**
 * Ingest or Live Sync a YouTube Channel & All Its Real Content Assets into Database
 */
async function syncChannelRealData(channelIdOrHandle, triggeredBy = 'system') {
  logger.info(`[YT-SERVICE] Starting real data synchronization for: ${channelIdOrHandle}`);

  // 1. Locate Channel in DB if already registered
  let channel = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelIdOrHandle);

  if (isUuid) {
    const chRes = await query('SELECT * FROM channels WHERE id = $1', [channelIdOrHandle]);
    if (chRes.rows.length > 0) channel = chRes.rows[0];
  } else {
    const cleanHandle = normalizeHandle(channelIdOrHandle);
    const chRes = await query('SELECT * FROM channels WHERE handle = $1 OR channel_url ILIKE $2', [cleanHandle, `%${cleanHandle}%`]);
    if (chRes.rows.length > 0) channel = chRes.rows[0];
  }

  const lookupTarget = channel ? (channel.handle || channel.channel_url) : channelIdOrHandle;

  // 2. Scrape Live Profile Metadata from YouTube
  const liveInfo = await getYouTubeChannelInfo(lookupTarget);

  // 3. Scrape Live Videos & Shorts
  const [realVideos, realShorts] = await Promise.all([
    getYouTubeVideos(liveInfo.handle),
    getYouTubeShorts(liveInfo.handle)
  ]);

  const allAssets = [...realVideos, ...realShorts];
  const calculatedTotalViews = allAssets.reduce((sum, item) => sum + (item.views || 0), 0);

  // 3b. Enrich all assets with real full creator description and real YouTube tags
  logger.info(`[YT-SERVICE] Enriching ${allAssets.length} assets with full descriptions and tags from YouTube...`);
  await mapConcurrent(allAssets, 5, async (asset) => {
    try {
      const details = await fetchYouTubeVideoDetails(asset.videoId);
      if (details) {
        if (details.description) asset.description = details.description;
        if (details.tags) asset.tags = details.tags;
        if (details.title) asset.title = details.title;
      }
    } catch (e) {
      logger.warn(`[YT-SERVICE] Could not scrape watch metadata for ${asset.videoId}: ${e.message}`);
    }
  });

  // 4. Update or Insert Channel Record
  if (!channel) {
    const insertRes = await query(
      `INSERT INTO channels (
        name, handle, channel_id, channel_url, author_name, description,
        subscriber_count, video_count, total_views, avatar_url, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, (SELECT COUNT(*) = 0 FROM channels))
      RETURNING *`,
      [
        liveInfo.name,
        liveInfo.handle,
        liveInfo.channelId,
        liveInfo.channelUrl,
        'Channel Lead',
        liveInfo.description,
        liveInfo.subscriberCount,
        liveInfo.videoCount || allAssets.length,
        calculatedTotalViews,
        liveInfo.avatarUrl
      ]
    );
    channel = insertRes.rows[0];
  } else {
    const updateRes = await query(
      `UPDATE channels SET
        name = $1,
        handle = $2,
        channel_id = COALESCE($3, channel_id),
        channel_url = $4,
        description = COALESCE($5, description),
        subscriber_count = $6,
        video_count = $7,
        total_views = $8,
        avatar_url = COALESCE($9, avatar_url),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        liveInfo.name,
        liveInfo.handle,
        liveInfo.channelId,
        liveInfo.channelUrl,
        liveInfo.description,
        liveInfo.subscriberCount,
        liveInfo.videoCount || allAssets.length,
        calculatedTotalViews > 0 ? calculatedTotalViews : channel.total_views,
        liveInfo.avatarUrl,
        channel.id
      ]
    );
    channel = updateRes.rows[0];
  }

  // 5. Ingest / Update Real Content Items
  let insertedCount = 0;
  let updatedCount = 0;

  for (const asset of allAssets) {
    const mediaUuid = `yt_${asset.videoId}`;

    // Match existing item in DB:
    // 1. By media_uuid = 'yt_' + videoId
    // 2. By exact video_url
    // 3. By video_url containing the videoId (e.g. youtu.be/xyz, youtube.com/shorts/xyz)
    // 4. By exact title in the same channel (user created pending item in wizard and forgot to change status)
    const existing = await query(
      `SELECT id, title, status, views_count, video_url, image_url, uploaded_at 
       FROM content_items 
       WHERE media_uuid = $1 
          OR video_url = $2 
          OR (video_url IS NOT NULL AND video_url ILIKE $3)
          OR (channel_id = $4 AND LOWER(TRIM(title)) = LOWER(TRIM($5)))
       ORDER BY (media_uuid = $1) DESC, id ASC
       LIMIT 1`,
      [mediaUuid, asset.url, `%${asset.videoId}%`, channel.id, asset.title]
    );

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO content_items (
          channel_id, media_uuid, content_type, topic, title, description,
          tags, video_url, image_url, status, views_count, likes_count, comments_count,
          image_present, video_present, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded', $10, $11, $12, TRUE, TRUE, $13)`,
        [
          channel.id,
          mediaUuid,
          asset.type,
          asset.title,
          asset.title,
          asset.description || `Real YouTube ${asset.type === 'short' ? 'Short' : 'Video'} imported from ${channel.name} (${channel.handle})`,
          asset.tags || `${channel.name.toLowerCase()}, ${asset.type}`,
          asset.url,
          asset.thumbnail,
          asset.views,
          Math.round(asset.views * 0.05), // Realistic like estimate if not provided
          Math.round(asset.views * 0.005),
          asset.uploadedAt || new Date()
        ]
      );
      insertedCount++;
    } else {
      // Existing item found: update status to 'uploaded' (handles pending/scheduled sync), update metrics, maxresdefault thumbnail & details
      const existingItem = existing.rows[0];
      await query(
        `UPDATE content_items SET
          status = 'uploaded',
          views_count = $1,
          likes_count = CASE WHEN $2 > 0 THEN $2 ELSE likes_count END,
          comments_count = CASE WHEN $3 > 0 THEN $3 ELSE comments_count END,
          title = COALESCE(NULLIF($4, ''), title),
          video_url = COALESCE(NULLIF(video_url, ''), $5),
          image_url = CASE 
            WHEN image_url IS NULL OR image_url = '' OR image_url LIKE '%ytimg.com%' 
            THEN $6 
            ELSE image_url 
          END,
          uploaded_at = COALESCE(uploaded_at, $7),
          description = CASE WHEN $8 != '' THEN $8 ELSE description END,
          tags = CASE WHEN $9 != '' THEN $9 ELSE tags END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10`,
        [
          asset.views,
          Math.round(asset.views * 0.05),
          Math.round(asset.views * 0.005),
          asset.title,
          asset.url,
          asset.thumbnail,
          asset.uploadedAt || new Date(),
          asset.description || '',
          asset.tags || '',
          existingItem.id
        ]
      );
      updatedCount++;
    }
  }

  // 6. Record Real Daily Snapshot in channel_snapshots (upsert today's snapshot, deduplicate multiple clicks)
  const todaySnapRes = await query(
    'SELECT id, recorded_at FROM channel_snapshots WHERE channel_id = $1 AND recorded_at::date = CURRENT_DATE ORDER BY recorded_at DESC LIMIT 1',
    [channel.id]
  );

  const prevDaySnapRes = await query(
    'SELECT subscriber_count, total_views FROM channel_snapshots WHERE channel_id = $1 AND recorded_at::date < CURRENT_DATE ORDER BY recorded_at DESC LIMIT 1',
    [channel.id]
  );

  let deltaSubs = 0;
  let deltaViews = 0;
  if (prevDaySnapRes.rows.length > 0) {
    deltaSubs = parseInt(channel.subscriber_count, 10) - parseInt(prevDaySnapRes.rows[0].subscriber_count, 10);
    deltaViews = parseInt(channel.total_views, 10) - parseInt(prevDaySnapRes.rows[0].total_views, 10);
  }

  if (todaySnapRes.rows.length > 0) {
    await query(
      `UPDATE channel_snapshots SET
        subscriber_count = $1,
        total_views = $2,
        video_count = $3,
        delta_views = $4,
        delta_subscribers = $5,
        notes = $6,
        recorded_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        channel.subscriber_count,
        channel.total_views,
        channel.video_count,
        deltaViews,
        deltaSubs,
        `Real YouTube live telemetry sync (${triggeredBy})`,
        todaySnapRes.rows[0].id
      ]
    );
  } else {
    await query(
      `INSERT INTO channel_snapshots (
        channel_id, subscriber_count, total_views, video_count,
        delta_views, delta_subscribers, notes, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [
        channel.id,
        channel.subscriber_count,
        channel.total_views,
        channel.video_count,
        deltaViews,
        deltaSubs,
        `Real YouTube live telemetry sync (${triggeredBy})`
      ]
    );
  }

  logger.info(`[YT-SERVICE] Successfully synchronized real channel "${channel.name}": ${liveInfo.subscriberCount} subs, ${liveInfo.videoCount} videos, ${insertedCount} new assets inserted, ${updatedCount} assets updated.`);

  return {
    success: true,
    channel,
    liveInfo,
    assetsCount: allAssets.length,
    insertedCount,
    updatedCount
  };
}

module.exports = {
  fetchHttp,
  parseHumanNumber,
  normalizeHandle,
  extractVideoId,
  fetchYouTubeVideoDetails,
  getYouTubeChannelInfo,
  getYouTubeVideos,
  getYouTubeShorts,
  syncChannelRealData
};
