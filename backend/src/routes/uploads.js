import { Router } from 'express';
import multer from 'multer';
import { saveUploadedFile, publicUploadUrl } from '../utils/file-storage.js';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES = 3;

const fileFilter = (req, file, cb) => {
  const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
});

export const uploadsRouter = Router();

uploadsRouter.post('/preference', upload.array('images', MAX_FILES), async (req, res) => {
  try {
    const files = req.files || [];
    const urls = await Promise.all(
      files.map((f) => saveUploadedFile(f.buffer, f.originalname, 'pref').then(publicUploadUrl)),
    );
    res.json({ urls });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const singleUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 1 },
});

uploadsRouter.post('/payment-evidence', singleUpload.single('evidence'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = publicUploadUrl(await saveUploadedFile(file.buffer, file.originalname, 'pay'));
    res.json({ url });
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
