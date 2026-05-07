#!/usr/bin/env node
// Ensures lightningcss platform binary is in place before next build.
// Vercel CLI's internal npm install skips postinstall scripts, so the
// binary from lightningcss-linux-x64-gnu never gets copied to lightningcss/.
// This script does that copy explicitly, or installs the package if missing.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

if (os.platform() !== 'linux') {
  process.exit(0);
}

const arch = os.arch() === 'x64' ? 'x64' : os.arch();

let variant = 'gnu';
try {
  const out = execSync('ldd --version 2>&1 || true', { encoding: 'utf8' });
  if (out.toLowerCase().includes('musl')) variant = 'musl';
} catch {}

const pkgName  = `lightningcss-linux-${arch}-${variant}`;
const binName  = `lightningcss.linux-${arch}-${variant}.node`;
const root     = path.join(__dirname, '..');
const destPath = path.join(root, 'node_modules', 'lightningcss', binName);

if (fs.existsSync(destPath)) {
  console.log(`[ensure-lightningcss] binary already present (${binName})`);
  process.exit(0);
}

const srcPath = path.join(root, 'node_modules', pkgName, binName);

if (!fs.existsSync(srcPath)) {
  console.log(`[ensure-lightningcss] ${pkgName} not installed — fetching…`);
  execSync(`npm install ${pkgName} --no-save`, {
    stdio: 'inherit',
    cwd: root,
  });
}

if (fs.existsSync(srcPath)) {
  fs.copyFileSync(srcPath, destPath);
  console.log(`[ensure-lightningcss] copied ${binName} from ${pkgName}`);
} else {
  console.warn(`[ensure-lightningcss] WARNING: could not obtain ${binName}`);
}
