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
const shellCss = read('../src/components/ResponsiveShell.module.css');

assert.ok(settings.includes('value="system"'), 'missing system preference option in Settings');
for (const theme of ['light', 'dark', 'dusk', 'stone', 'ocean']) {
  assert.ok(css.includes(`:root[data-theme="${theme}"]`), `missing ${theme} palette`);
  assert.ok(settings.includes(`value="${theme}"`), `missing ${theme} option in Settings`);
}
assert.ok(layout.includes("localStorage.getItem('sanctuary-theme')"), 'theme bootstrap must read device preference');
assert.ok(layout.includes('document.documentElement.dataset.theme = theme'), 'theme bootstrap must apply selected palette before render');
assert.ok(layout.includes("saved === 'stone' || saved === 'ocean'"), 'pre-render bootstrap must accept new palettes');
assert.ok(layout.includes("? saved : 'dark'"), 'fresh visits must default to the cosmic dark palette');
assert.ok(layout.includes("classList.toggle('dark', theme === 'dark' || theme === 'dusk' || theme === 'ocean')"), 'Tailwind dark variants must follow selected theme');
assert.ok(settings.includes("classList.toggle('dark', theme === 'dark' || theme === 'dusk' || theme === 'ocean')"), 'live theme changes must update Tailwind dark variants');
assert.ok(settings.includes("window.matchMedia('(prefers-color-scheme: light)')"), 'system preference must follow OS colour scheme');
assert.ok(appContext.includes('fetchAccountSettings(currentUser.user.id)'), 'signed-in accounts must load saved theme on session restore');
assert.ok(appContext.includes('document.documentElement.dataset.layout = preferences.layout'), 'saved account layout must apply across the app at session restore');
assert.ok(css.includes(':root[data-layout="compact"] [data-world="sanctuary"]'), 'compact layout must change app-wide visual density');
assert.ok(appContext.includes("let preference = 'dark'"), 'unsigned-in sessions must default to the cosmic dark palette');
assert.ok(appContext.includes('document.documentElement.dataset.theme = theme'), 'account theme must apply after session restore');
assert.ok(layout.includes('__html: themeBootstrap'), 'theme bootstrap must be included in document head');
assert.ok(!layout.includes('className="dark"'), 'fixed dark class must not override selected theme');
assert.ok(settings.includes('updatePreferences({ theme })'), 'theme selection must persist through account settings');
assert.ok(service.includes("theme: 'dark'"), 'new accounts must default to the cosmic dark palette');
assert.ok(service.includes("record.theme === 'stone'") && service.includes("record.theme === 'ocean'"), 'settings service must normalize added themes');
assert.ok(service.includes("'system', 'light', 'dark', 'dusk', 'stone', 'ocean'"), 'settings service must accept every supported theme when saving');
assert.ok(types.includes("'system' | 'light' | 'dark' | 'dusk' | 'stone' | 'ocean'"), 'account theme type must include all palettes');
assert.ok(!workspaceCss.includes('--surface: #fbfcf9') && !workspaceCss.includes('--ink: #25372c'), 'app workspace must not override global semantic palette tokens');
assert.ok(!workspaceCss.includes('--accent: var(--theme-accent, var(--accent))'), 'workspace must not self-reference the accent token');
assert.ok(/\.viewport\s*\{[^}]*background:\s*var\(--bg\)/s.test(shellCss), 'responsive shell viewport must use the active theme background');
assert.ok(/\.viewport\s*\{[^}]*color:\s*var\(--ink\)/s.test(shellCss), 'responsive shell viewport must use the active theme text colour');
for (const token of ['--surface', '--line', '--ink', '--muted', '--accent', '--accent-contrast', '--accent-soft']) {
  assert.ok(shellCss.includes(`var(${token})`), `install banner must use semantic theme token ${token}`);
}
assert.ok(!shellCss.includes('background: #fbfcf9'), 'responsive shell must not hard-code a light viewport background');
assert.ok(settings.includes('Token-unlockable themes can be added to this catalogue later'), 'token themes must remain future-facing, not falsely enabled');
assert.ok(settings.includes('value="stone"') && settings.includes('value="ocean"'), 'grey and blue themes must be selectable');
assert.ok(/body::before\s*\{[^}]*pointer-events:\s*none/s.test(css), 'cosmic star field must not block interaction');
assert.ok(css.includes('background-attachment: fixed'), 'cosmic atmosphere should stay visually anchored while scrolling');
assert.ok(css.includes('.ai-tag') && css.includes('.cosmic-badge') && css.includes('.cosmic-outline') && css.includes('.chat-bubble'), 'custom cosmic UI accents must be available');
assert.ok(css.includes('prefers-reduced-motion: reduce'), 'cosmic effects must preserve reduced-motion support');
console.log('Theme contract checks passed. Static checks only; visual browser verification is still required.');
