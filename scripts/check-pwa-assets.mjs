import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [manifest, worker, offlinePage, registration, installBanner, installBannerStyles, workspace] = await Promise.all([
  readFile('src/app/manifest.ts', 'utf8'),
  readFile('public/sw.js', 'utf8'),
  readFile('public/offline.html', 'utf8'),
  readFile('src/components/PwaServiceWorker.tsx', 'utf8'),
  readFile('src/components/PwaInstallBanner.tsx', 'utf8'),
  readFile('src/components/PwaInstallBanner.module.css', 'utf8'),
  readFile('src/components/AppWorkspace.tsx', 'utf8'),
]);

assert.match(manifest, /start_url/);
assert.match(manifest, /display/);
assert.match(worker, /OFFLINE_URL\s*=\s*['"]\/offline\.html['"]/);
assert.match(worker, /request\.mode\s*!==\s*['"]navigate['"]/);
assert.match(worker, /url\.origin\s*!==\s*self\.location\.origin/);
assert.match(worker, /fetch\(request\)\.catch/);
assert.doesNotMatch(worker, /cache\.put\(request/);
assert.match(offlinePage, /You're offline/);
assert.match(offlinePage, /haven't been stored for offline use/);
assert.match(registration, /process\.env\.NODE_ENV\s*!==\s*['"]production['"]/);
assert.match(registration, /register\(['"]\/sw\.js['"]/);
assert.match(installBanner, /beforeinstallprompt/);
assert.match(installBanner, /appinstalled/);
assert.match(installBanner, /sanctuary:pwa-install-dismissed:v1/);
assert.match(installBanner, /aria-label="Hide install option"/);
assert.match(installBanner, /Add to Home Screen/);
assert.match(installBanner, /Android/i);
assert.match(installBanner, /browser menu/i);
assert.match(workspace, /<PwaInstallBanner \/>[\s\S]*?<Navigation/);
assert.match(installBannerStyles, /prefers-reduced-motion: reduce/);

console.log('PWA static checks passed: manifest, safe navigation fallback, and production-only registration.');
