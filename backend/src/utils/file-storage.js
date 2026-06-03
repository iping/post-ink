import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function safeName(prefix, originalName) {
  const base = (originalName || 'file').replace(/\s/g, '-').replace(/[^\w.\-]/g, '');
  return `${prefix}-${Date.now()}-${base}`;
}

/** Public URL for a stored upload path or absolute blob URL. */
export function publicUploadUrl(stored) {
  if (!stored) return stored;
  if (stored.startsWith('http://') || stored.startsWith('https://')) return stored;
  const base = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  const rel = stored.startsWith('/') ? stored : `/${stored}`;
  return base ? `${base}${rel}` : rel;
}

/**
 * Persist an uploaded file (buffer). Uses Vercel Blob when configured, else local disk.
 * @returns {string} Path like /uploads/... or a full blob URL
 */
export async function saveUploadedFile(buffer, originalName, prefix = 'file') {
  const filename = safeName(prefix, originalName);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: true,
    });
    return blob.url;
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const dest = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(dest, buffer);
  return `/uploads/${filename}`;
}
