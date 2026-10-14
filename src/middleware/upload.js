const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query } = require('../config/db');
const { logger } = require('../config/logger');

const mediaDir = process.env.MEDIA_DIR || path.join(__dirname, '../../media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

/**
 * Retrieve allowed media extensions and max upload size dynamically from system_settings
 */
async function getMediaSettings() {
  try {
    const res = await query(
      `SELECT key, value FROM system_settings WHERE key IN ('allowed_media_extensions', 'max_media_upload_size_mb')`
    );
    let allowedExts = ['.mp4', '.png'];
    let maxSizeMb = 100;

    res.rows.forEach(r => {
      if (r.key === 'allowed_media_extensions') {
        let val = r.value;
        if (typeof val === 'string') {
          val = val.replace(/^"|"$/g, '');
          allowedExts = val.split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean)
            .map(s => s.startsWith('.') ? s : `.${s}`);
        } else if (Array.isArray(val)) {
          allowedExts = val.map(s => String(s).trim().toLowerCase()).map(s => s.startsWith('.') ? s : `.${s}`);
        }
      }
      if (r.key === 'max_media_upload_size_mb') {
        const num = parseInt(typeof r.value === 'string' ? r.value.replace(/^"|"$/g, '') : r.value, 10);
        if (!isNaN(num) && num > 0) maxSizeMb = num;
      }
    });

    return { allowedExts, maxSizeMb };
  } catch (err) {
    logger.warn(`[UPLOAD-CONFIG] Could not load media settings from DB, using defaults (.mp4, .png, 100MB): ${err.message}`);
    return { allowedExts: ['.mp4', '.png'], maxSizeMb: 100 };
  }
}

// Multer disk storage - temporarily stores incoming files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const tempName = `temp_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, tempName);
  }
});

const upload = multer({
  storage,
  limits: {
    // 500MB safety ceiling; dynamic validation occurs per request based on system_settings
    fileSize: 500 * 1024 * 1024
  }
});

const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'image_file', maxCount: 1 },
  { name: 'video_file', maxCount: 1 }
]);

/**
 * Express middleware for handling media uploads (both JSON and multipart/form-data)
 */
function handleMediaUpload(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  uploadFields(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File size exceeds server upload limit' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      const { allowedExts, maxSizeMb } = await getMediaSettings();
      const maxSizeBytes = maxSizeMb * 1024 * 1024;

      const filesToCheck = [];
      if (req.files) {
        if (req.files.image && req.files.image.length > 0) filesToCheck.push(req.files.image[0]);
        if (req.files.image_file && req.files.image_file.length > 0) filesToCheck.push(req.files.image_file[0]);
        if (req.files.video && req.files.video.length > 0) filesToCheck.push(req.files.video[0]);
        if (req.files.video_file && req.files.video_file.length > 0) filesToCheck.push(req.files.video_file[0]);
      }

      for (const file of filesToCheck) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExts.includes(ext)) {
          // Clean up temp file
          try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (_) {}
          return res.status(400).json({
            success: false,
            error: `File extension "${ext}" is not permitted. Allowed extensions configured in settings: [${allowedExts.join(', ')}]`
          });
        }

        if (file.size > maxSizeBytes) {
          try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (_) {}
          return res.status(400).json({
            success: false,
            error: `File "${file.originalname}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds configured maximum upload size limit of ${maxSizeMb} MB`
          });
        }
      }

      next();
    } catch (valErr) {
      next(valErr);
    }
  });
}

/**
 * Move and rename uploaded temp file to its final persistent name: ${mediaUuid}.${ext}
 */
function finalizeUploadedFile(file, mediaUuid) {
  if (!file || !file.path) return null;
  const ext = path.extname(file.originalname).toLowerCase();
  const finalFilename = `${mediaUuid}${ext}`;
  const finalPath = path.join(mediaDir, finalFilename);

  // If a file with this name already exists, remove it first
  if (fs.existsSync(finalPath)) {
    try { fs.unlinkSync(finalPath); } catch (_) {}
  }

  // Rename temp file to final persistent filename
  fs.renameSync(file.path, finalPath);

  return {
    filename: finalFilename,
    path: finalPath,
    urlPath: `/media/${finalFilename}`,
    extension: ext,
    size: file.size
  };
}

module.exports = {
  mediaDir,
  getMediaSettings,
  handleMediaUpload,
  finalizeUploadedFile
};
