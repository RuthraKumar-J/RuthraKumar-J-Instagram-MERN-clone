const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

// Modular disk storage configuration (swap with CloudinaryStorage when moving to cloud storage)
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 32);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${baseName || 'media'}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(
      'Unsupported file type. Allowed formats: JPEG, PNG, WebP, GIF, MP4, WebM.'
    );
    err.statusCode = 400;
    cb(err, false);
  }
};

const upload = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

/**
 * Modular storage adapter helpers so local disk storage can be swapped
 * cleanly with Cloudinary or S3 without changing controllers.
 */
const buildMediaUrl = (req, file) => {
  if (!file) return '';
  if (file.path && file.path.startsWith('http')) {
    return file.path;
  }
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/${file.filename}`;
};

const detectMediaType = (file) => {
  if (!file || !file.mimetype) return 'image';
  return file.mimetype.startsWith('video/') ? 'video' : 'image';
};

const deleteLocalMedia = (mediaUrl) => {
  if (!mediaUrl || typeof mediaUrl !== 'string') return;
  if (mediaUrl.includes('/uploads/seed/')) return;
  const marker = '/uploads/';
  const idx = mediaUrl.indexOf(marker);
  if (idx === -1) return;

  const fileName = path.basename(mediaUrl.slice(idx + marker.length));
  if (!fileName) return;

  const filePath = path.join(UPLOAD_DIR, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.warn(`Failed to delete local upload ${fileName}:`, err.message);
      }
    });
  }
};

module.exports = {
  upload,
  UPLOAD_DIR,
  buildMediaUrl,
  detectMediaType,
  deleteLocalMedia,
};

