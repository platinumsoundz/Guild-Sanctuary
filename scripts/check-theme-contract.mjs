import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../src/app/globals.css');
const layout = read('../src/app/layout.tsx');
const settings = read('../src/modules/settings/components/SettingsHub.tsx');
const service = read('../src/modules/settings/service.ts');
const types = read('../src/types/database.ts');
const appContext = read('../src/context/AppContext.tsx');
const workspaceCss = read('../src/components/AppWorkspace.module.css');

assert.ok(settings.includes('value="system"'), 'missing system preference option in Settings');
for (const theme of ['light', 'dark', 'dusk', 'stone', 'ocean']) {
  assert.ok(css.includes(`:root[data-theme="${theme}"]`), `missing ${theme} palette`);
  assert.ok(settings.includes(`value="${theme}"`), `missing ${theme} option in Settings`);
}
assert.ok(layout.includes("localStorage.getItem('sanctuary-theme')"), 'theme bootstrap must read device preference');
assert.ok(layout.includes('document.documentElement.dataset.theme = theme'), 'theme bootstrap must apply selected palette before render');
assert.ok(layout.includes("saved === 'stone' || saved === 'ocean'"), 'pre-render bootstrap must accept new palettes');
assert.ok(layout.includes("classList.toggle('dark', theme !== 'light')"), 'Tailwind dark variants must follow selected theme');
assert.ok(settings.includes("classList.toggle('dark', theme !== 'light')"), 'live theme changes must update Tailwind dark variants');
assert.ok(settings.includes("window.matchMedia('(prefers-color-scheme: light)')"), 'system preference must follow OS colour scheme');
assert.ok(appContext.includes('fetchAccountSettings(currentUser.user.id)'), 'signed-in accounts must load saved theme on session restore');
assert.ok(appContext.includes('document.documentElement.dataset.theme = theme'), 'account theme must apply after session restore');
assert.ok(layout.includes('__html: themeBootstrap'), 'theme bootstrap must be included in document head');
assert.ok(!layout.includes('className="dark"'), 'fixed dark class must not override selected theme');
assert.ok(settings.includes('updatePreferences({ theme })'), 'theme selection must persist through account settings');
assert.ok(service.includes("theme: 'system'"), 'new accounts must default to system colour preference');
assert.ok(service.includes("record.theme === 'stone'") && service.includes("record.theme === 'ocean'"), 'settings service must normalize added themes');
assert.ok(types.includes("'system' | 'light' | 'dark' | 'dusk' | 'stone' | 'ocean'"), 'account theme type must include all palettes');
assert.ok(!workspaceCss.includes('--surface: #fbfcf9') && !workspaceCss.includes('--ink: #25372c'), 'app workspace must not override global semantic palette tokens');
assert.ok(!workspaceCss.includes('--accent: var(--theme-accent, var(--accent))'), 'workspace must not self-reference the accent token');
assert.ok(settings.includes('Token-unlockable themes can be added to this catalogue later'), 'token themes must remain future-facing, not falsely enabled');
assert.ok(settings.includes('value="stone"') && settings.includes('value="ocean"'), 'grey and blue themes must be selectable');
console.log('Theme contract checks passed. Static checks only; visual browser verification is still required.');
