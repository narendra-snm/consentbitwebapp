import { cpSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const openNext = '.open-next';

// 1. Copy worker.js → _worker.js at .open-next root
const workerSrc = join(openNext, 'worker.js');
const workerDest = join(openNext, '_worker.js');
cpSync(workerSrc, workerDest);
console.log(`Copied ${workerSrc} → ${workerDest}`);

// 2. Copy contents of .open-next/assets/* up to .open-next/ root
const assetsDir = join(openNext, 'assets');
if (existsSync(assetsDir)) {
  for (const entry of readdirSync(assetsDir)) {
    const src = join(assetsDir, entry);
    const dest = join(openNext, entry);
    cpSync(src, dest, { recursive: true });
    console.log(`Copied assets/${entry} → ${openNext}/${entry}`);
  }
}

// 3. Write _routes.json — static assets bypass the worker, everything else goes through it
const routes = {
  version: 1,
  include: ['/*'],
  exclude: [
    '/_next/static/*',
    '/_next/image*',
    '/images/*',
    '/asset/*',
    '/favicon.ico',
    '/favicon.png',
    '/*.svg',
    '/*.png',
    '/*.webp',
    '/*.ico',
  ],
};
writeFileSync(join(openNext, '_routes.json'), JSON.stringify(routes, null, 2));
console.log('Written _routes.json');
