import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/components/ResponsiveShell.module.css', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/components/ResponsiveShell.tsx', import.meta.url), 'utf8');

const checks = [
  ['install banner uses a bounded width and can wrap instead of overflowing', /\.installBanner\s*\{[\s\S]*?width:\s*min\(100%,\s*1120px\)/i.test(css) && /\.installBanner\s*\{[\s\S]*?flex-wrap:\s*wrap/i.test(css)],
  ['banner uses named local colour tokens instead of scattered hardcoded colours', /--install-bg:[\s\S]*?--install-border:[\s\S]*?--install-ink:[\s\S]*?--install-muted:[\s\S]*?--install-accent:/i.test(css) && /background:\s*var\(--install-bg\)/i.test(css)],
  ['title is readable at 14px or above on the narrow layout', /@media\s*\(max-width:\s*640px\)[\s\S]*?\.installTitle\s*\{\s*font-size:\s*14px/i.test(css)],
  ['description uses readable 13px text and generous line-height', /\.installDescription\s*\{[\s\S]*?font-size:\s*13px[\s\S]*?line-height:\s*1\.5/i.test(css)],
  ['install and hide controls have minimum 44px touch targets', /\.installButton\s*\{[\s\S]*?min-height:\s*44px/i.test(css) && /\.hideInstallButton\s*\{[\s\S]*?width:\s*44px[\s\S]*?height:\s*44px/i.test(css)],
  ['both controls expose a visible keyboard focus ring', /\.installButton:focus-visible,\s*\.hideInstallButton:focus-visible\s*\{[\s\S]*?outline:\s*3px/i.test(css)],
  ['narrow 360px layouts receive a dedicated fallback', /@media\s*\(max-width:\s*360px\)/i.test(css)],
  ['reduced-motion preference disables control transitions', /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none/i.test(css)],
  ['banner retains an accessible label and explicit hide control', /aria-label="Install Sanctuary app"/i.test(component) && /aria-label="Hide install option"/i.test(component)],
  ['install prompt remains browser-aware and does not claim offline support', /beforeinstallprompt/i.test(component) && /Install app|Add to Home Screen/i.test(component) && !/offline support/i.test(component)],
];

for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label);
  assert.ok(passed, label);
}
console.log('Install banner contract checks passed: ' + checks.length + '. Static checks only; browser/device QA remains required.');
