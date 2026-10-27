import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [manifest, worker, offlinePage, registration, responsiveShell, responsiveShellStyles, workspace] = await Promise.all([
  readFile('src/app/manifest.ts', 'utf8'),
  readFile('public/sw.js', 'utf8'),
  readFile('public/offline.html', 'utf8'),
  readFile('src/components/PwaServiceWorker.tsx', 'utf8'),
  readFile('src/components/ResponsiveShell.tsx', 'utf8'),
  readFile('src/components/ResponsiveShell.module.css', 'utf8'),
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
assert.match(responsiveShell, /beforeinstallprompt/);
assert.match(responsiveShell, /appinstalled/);
assert.match(responsiveShell, /sanctuary-install-banner-hidden/);
assert.match(responsiveShell, /aria-label="Hide install option"/);
assert.match(responsiveShell, /Add to Home Screen/);
assert.match(responsiveShell, /Install The Sanctuary/);
assert.match(responsiveShell, /installPlatform/);
assert.match(responsiveShellStyles, /min-height:\s*48px/);
assert.match(responsiveShellStyles, /@media \(max-width: 640px\)/);
assert.match(workspace, /ResponsiveShell/);
assert.doesNotMatch(workspace, /PwaInstallBanner/);

console.log('PWA checks passed: safe offline behavior, one compact dismissible install banner, and platform-specific guidance.');
