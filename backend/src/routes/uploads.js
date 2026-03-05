import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES = 3;

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_, file, cb) => cb(null, `pref-${Date.now()}-${file.originalname.replace(/\s/g, '-')}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
});

export const uploadsRouter = Router();

// POST /api/uploads/preference — max 3 images, 2MB each
uploadsRouter.post('/preference', upload.array('images', MAX_FILES), (req, res) => {
  try {
    const files = req.files || [];
    const urls = files.map((f) => `/uploads/${f.filename}`);
    res.json({ urls });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Single file upload for payment evidence (1 image, 2MB)
const singleUpload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (_, file, cb) => cb(null, `pay-${Date.now()}-${file.originalname.replace(/\s/g, '-')}`),
  }),
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 1 },
});

uploadsRouter.post('/payment-evidence', singleUpload.single('evidence'), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });
    res.json({ url: `/uploads/${file.filename}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

uploadsRouter.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Each image must be 2MB or less.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Maximum 3 images allowed.' });
    }
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});
