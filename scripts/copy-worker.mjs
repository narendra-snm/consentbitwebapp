import { cpSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const openNext = '.open-next';

// 1. Copy worker.js → _worker.js at .open-next root
const workerSrc = join(openNext, 'worker.js');
const workerDest = join(openNext, '_worker.js');
cpSync(workerSrc, workerDest);
console.log(`Copied ${workerSrc} → ${workerDest}`);

// 2. Copy contents of .open-next/assets/* up to .open-next/ root
// so that /_next/static/ and /images/ etc. are served at correct URLs
const assetsDir = join(openNext, 'assets');
if (existsSync(assetsDir)) {
  for (const entry of readdirSync(assetsDir)) {
    const src = join(assetsDir, entry);
    const dest = join(openNext, entry);
    cpSync(src, dest, { recursive: true });
    console.log(`Copied assets/${entry} → ${openNext}/${entry}`);
  }
}
