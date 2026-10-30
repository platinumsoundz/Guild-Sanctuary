import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../src/app/globals.css');
const themeRegistry = read('../src/lib/themes.ts');
const layout = read('../src/app/layout.tsx');
const settings = read('../src/modules/settings/components/SettingsHub.tsx');
const service = read('../src/modules/settings/service.ts');
const types = read('../src/types/database.ts');
const appContext = read('../src/context/AppContext.tsx');
const workspaceCss = read('../src/components/AppWorkspace.module.css');
const shellCss = read('../src/components/ResponsiveShell.module.css');

assert.ok(themeRegistry.includes("{ id: 'system', label: 'Use device setting' }"), 'missing system preference option in theme catalogue');
for (const theme of ['light', 'dark', 'dusk', 'stone', 'ocean']) {
  assert.ok(css.includes(`:root[data-theme="${theme}"]`), `missing ${theme} palette`);
  assert.ok(themeRegistry.includes(`id: '${theme}'`), `missing ${theme} in the central theme catalogue`);
}
assert.ok(css.includes('--bg: #f5f3ff;') && css.includes('--surface-raised: #f0edff;'), 'light theme must use the cosmic lavender daylight surfaces');
assert.ok(css.includes('--accent: #5b3dbb;') && css.includes('--accent-contrast: #ffffff;'), 'light theme must retain the cosmic purple accent with readable contrast');
assert.ok(css.includes(':root[data-theme="light"] body {') && css.includes('rgb(126 93 226 / 12%)'), 'light theme must use its own soft cosmic nebula instead of the dark glow');
assert.ok(themeRegistry.includes('THEME_CATALOGUE') && themeRegistry.includes('THEME_PREFERENCE_OPTIONS') && themeRegistry.includes('isThemePreference'), 'theme registry must own the catalogue, selector options and preference validation');
assert.ok(themeRegistry.includes('resolveTheme') && themeRegistry.includes('applyTheme'), 'theme registry must own system resolution and DOM application');
assert.equal((css.match(/:root\\s*\\{[^}]*\\}/g) || []).filter((block) => block.includes('--bg:')).length, 1, 'global CSS must define the base token palette only once');
assert.equal((css.match(/:root\[data-theme="dark"\]\s*\{/g) || []).length, 1, 'dark theme token palette must have one definition');
assert.ok(settings.includes('Cosmic light · daylight'), 'appearance settings must describe the mirrored cosmic light theme');
assert.ok(layout.includes("localStorage.getItem('sanctuary-theme')"), 'theme bootstrap must read device preference');
assert.ok(layout.includes("themeColor: '#080b1b'"), 'browser chrome must match the cosmic default palette');
assert.ok(layout.includes('document.documentElement.dataset.theme = definition.id'), 'theme bootstrap must apply selected palette before render');
assert.ok(layout.includes('THEME_PREFERENCES') && layout.includes('THEME_CATALOGUE'), 'pre-render bootstrap must derive supported palettes from the central catalogue');
assert.ok(layout.includes("? saved : 'dark'"), 'fresh visits must default to the cosmic dark palette');
assert.ok(layout.includes('definition.tailwindDark'), 'pre-render bootstrap must derive Tailwind dark variants from theme metadata');
assert.ok(settings.includes('THEME_PREFERENCE_OPTIONS.map') && settings.includes('applyTheme(resolveTheme'), 'settings selector and live theme application must use the central catalogue');
assert.ok(settings.includes("window.matchMedia('(prefers-color-scheme: light)')"), 'system preference must follow OS colour scheme');
assert.ok(appContext.includes('fetchAccountSettings(currentUser.user.id)'), 'signed-in accounts must load saved theme on session restore');
assert.ok(appContext.includes('document.documentElement.dataset.layout = preferences.layout'), 'saved account layout must apply across the app at session restore');
assert.ok(css.includes(':root[data-layout="compact"] [data-world="sanctuary"]'), 'compact layout must change app-wide visual density');
assert.ok(appContext.includes("let preference = 'dark'"), 'unsigned-in sessions must default to the cosmic dark palette');
assert.ok(appContext.includes('applyTheme(resolveTheme(preference'), 'account theme must apply after session restore');
assert.ok(layout.includes('__html: themeBootstrap'), 'theme bootstrap must be included in document head');
assert.ok(!layout.includes('className="dark"'), 'fixed dark class must not override selected theme');
assert.ok(settings.includes('updatePreferences({ theme })'), 'theme selection must persist through account settings');
assert.ok(service.includes("theme: 'dark'"), 'new accounts must default to the cosmic dark palette');
assert.ok(service.includes('isThemePreference(record.theme)'), 'settings service must normalize preferences through the central catalogue');
assert.ok(service.includes('isThemePreference(preferences.theme)'), 'settings service must validate saved themes through the central catalogue');
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
assert.ok(themeRegistry.includes("id: 'stone'") && themeRegistry.includes("id: 'ocean'"), 'grey and blue themes must remain selectable from the catalogue');
assert.ok(/body::before\s*\{[^}]*pointer-events:\s*none/s.test(css), 'cosmic star field must not block interaction');
assert.ok(css.includes('background-attachment: fixed'), 'cosmic atmosphere should stay visually anchored while scrolling');
assert.ok(css.includes('.ai-tag') && css.includes('.cosmic-badge') && css.includes('.cosmic-outline') && css.includes('.chat-bubble'), 'custom cosmic UI accents must be available');
assert.ok(css.includes('prefers-reduced-motion: reduce'), 'cosmic effects must preserve reduced-motion support');
console.log('Theme contract checks passed. Static checks only; visual browser verification is still required.');
