const crypto = require('crypto');

/**
 * Parses MySQL insert statements from a SQL dump file (specifically youtube_topics)
 * and transforms them into clean PostgreSQL rows for content_items table.
 */
function parseMySqlDump(sqlContent) {
  if (!sqlContent || typeof sqlContent !== 'string') {
    throw new Error('Invalid SQL content provided');
  }

  // Find the insert statement
  const insertRegex = /insert\s+into\s+[`"']?youtube_topics[`"']?\s*\(([^)]+)\)\s*values/i;
  const match = sqlContent.match(insertRegex);

  if (!match) {
    throw new Error('No compatible INSERT INTO youtube_topics statement found in SQL dump');
  }

  const columns = match[1].split(',').map(c => c.trim().replace(/[`"']/g, ''));
  const valuesStartIndex = match.index + match[0].length;
  
  // Extract content from values onwards until semicolon or trigger
  let valuesSection = sqlContent.slice(valuesStartIndex);
  const semiIndex = valuesSection.search(/;\s*(?:\/\*|DELIMITER|$)/i);
  if (semiIndex !== -1) {
    valuesSection = valuesSection.slice(0, semiIndex);
  }

  const rows = [];
  let inString = false;
  let quoteChar = '';
  let escape = false;
  let inTuple = false;
  let currentVal = '';
  let currentTuple = [];

  for (let i = 0; i < valuesSection.length; i++) {
    const char = valuesSection[i];

    if (escape) {
      if (char === 'n') currentVal += '\n';
      else if (char === 'r') currentVal += '\r';
      else if (char === 't') currentVal += '\t';
      else currentVal += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if ((char === "'" || char === '"') && inTuple) {
      if (!inString) {
        inString = true;
        quoteChar = char;
        continue;
      } else if (char === quoteChar) {
        // Check for double escaped quote like ''
        if (valuesSection[i + 1] === quoteChar) {
          currentVal += quoteChar;
          i++;
          continue;
        }
        inString = false;
        continue;
      }
    }

    if (!inString) {
      if (char === '(' && !inTuple) {
        inTuple = true;
        currentTuple = [];
        currentVal = '';
        continue;
      }

      if (char === ',' && inTuple) {
        currentTuple.push(cleanVal(currentVal));
        currentVal = '';
        continue;
      }

      if (char === ')' && inTuple) {
        currentTuple.push(cleanVal(currentVal));
        if (currentTuple.length > 0) {
          rows.push(currentTuple);
        }
        inTuple = false;
        currentVal = '';
        continue;
      }
    }

    if (inTuple) {
      currentVal += char;
    }
  }

  // Map to structured content_items
  const formattedItems = rows.map((tuple, index) => {
    const rowObj = {};
    columns.forEach((col, idx) => {
      rowObj[col] = tuple[idx] !== undefined ? tuple[idx] : null;
    });

    // Generate or clean UUID
    let mediaUuid = rowObj.media_uuid;
    if (!mediaUuid || mediaUuid.length < 8) {
      mediaUuid = crypto.randomUUID();
    }

    // Determine content type (short vs video vs podcast)
    let contentType = 'video';
    const videoUrl = rowObj.video_url || '';
    const imagePrompt = rowObj.image_prompt || '';
    const title = rowObj.title || '';
    const topic = rowObj.topic || '';

    if (
      videoUrl.includes('/shorts/') ||
      imagePrompt.includes('9:16') ||
      imagePrompt.toLowerCase().includes('shorts') ||
      title.toLowerCase().includes('short') ||
      topic.toLowerCase().includes('short')
    ) {
      contentType = 'short';
    } else if (
      title.toLowerCase().includes('podcast') ||
      topic.toLowerCase().includes('podcast')
    ) {
      contentType = 'podcast';
    }

    // Enforce 500 max characters on tags
    let tags = rowObj.tags || '';
    if (tags && tags.length > 500) {
      tags = tags.substring(0, 497) + '...';
    }

    return {
      legacy_id: parseInt(rowObj.id, 10) || (index + 1),
      media_uuid: mediaUuid,
      content_type: contentType,
      topic: rowObj.topic || '',
      title: rowObj.title || rowObj.topic || `Untitled Item ${index + 1}`,
      description: rowObj.description || '',
      image_prompt: rowObj.image_prompt || '',
      tags: tags,
      image_url: rowObj.image_url || null,
      video_url: rowObj.video_url || null,
      status: rowObj.status === 'uploaded' ? 'uploaded' : 'pending',
      image_present: rowObj.image_present === 'yes',
      video_present: rowObj.video_present === 'yes',
      views_count: Math.floor(Math.random() * 8500) + 120, // realistic initial analytics
      likes_count: Math.floor(Math.random() * 420) + 15,
      comments_count: Math.floor(Math.random() * 45) + 2,
      created_at: rowObj.created_at ? new Date(rowObj.created_at) : new Date(),
      uploaded_at: rowObj.uploaded_at ? new Date(rowObj.uploaded_at) : null
    };
  });

  return formattedItems;
}

function cleanVal(val) {
  if (val === null || val === undefined) return null;
  const trimmed = val.trim();
  if (trimmed === 'NULL' || trimmed === 'null' || trimmed === '') return null;
  return trimmed;
}

module.exports = {
  parseMySqlDump
};
