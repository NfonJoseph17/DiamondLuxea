// Generates public/sw-precache.json listing every build asset so the service
// worker can download the whole app on first install (solid offline support).
// Runs after `next build`.
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const cwd = process.cwd();
const staticDir = join(cwd, '.next', 'static');
const publicDir = join(cwd, 'public');

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const ASSET_RE = /\.(js|css|woff2?|ttf)$/;

// /_next/static/** — hashed, immutable build assets (JS/CSS/fonts).
const nextAssets = walk(staticDir)
  .filter((f) => ASSET_RE.test(f))
  .map((f) => '/_next/static/' + relative(staticDir, f).split(sep).join('/'));

// A few critical public assets used by the shell/branding.
const publicAssets = [
  '/manifest.json',
  '/branding/diamond-luxea-logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
].filter((p) => existsSync(join(publicDir, p)));

const assets = Array.from(new Set([...nextAssets, ...publicAssets]));

// Version changes whenever the asset set changes, so clients re-precache.
const version = assets.length + ':' + assets.join('|').length;

writeFileSync(
  join(publicDir, 'sw-precache.json'),
  JSON.stringify({ version, assets }, null, 0)
);

console.log(`[gen-precache] wrote ${assets.length} assets (version ${version})`);
