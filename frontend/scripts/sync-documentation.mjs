import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromRepo = path.join(root, '..', 'DOCUMENTATION.md');
const dest = path.join(root, 'DOCUMENTATION.md');

if (fs.existsSync(fromRepo)) {
  fs.copyFileSync(fromRepo, dest);
} else if (!fs.existsSync(dest)) {
  console.error('DOCUMENTATION.md missing: expected repo root or frontend/DOCUMENTATION.md');
  process.exit(1);
}
