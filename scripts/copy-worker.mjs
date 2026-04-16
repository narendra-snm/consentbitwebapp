import { cpSync, existsSync } from 'fs';
import { join } from 'path';

const src = '.open-next';
const dest = '.open-next/assets';

const items = ['worker.js', 'cloudflare', 'middleware', 'server-functions', '.build'];

for (const item of items) {
  const srcPath = join(src, item);
  if (!existsSync(srcPath)) {
    console.log(`Skipping ${srcPath} (not found)`);
    continue;
  }
  const destName = item === 'worker.js' ? '_worker.js' : item;
  const destPath = join(dest, destName);
  cpSync(srcPath, destPath, { recursive: true });
  console.log(`Copied ${srcPath} → ${destPath}`);
}
