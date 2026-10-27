import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../src/app/globals.css');
const layout = read('../src/app/layout.tsx');
const settings = read('../src/modules/settings/components/SettingsHub.tsx');
const service = read('../src/modules/settings/service.ts');
const types = read('../src/types/database.ts');
const appContext = read('../src/context/AppContext.tsx');

for (const theme of ['light', 'dark', 'dusk']) {
  assert.ok(css.includes(`:root[data-theme="${theme}"]`) || (theme === 'dark' && css.includes(':root {')), `missing ${theme} palette`);
  assert.ok(settings.includes(`value="${theme}"`), `missing ${theme} option in Settings`);
}
assert.ok(layout.includes("localStorage.getItem('sanctuary-theme')"), 'theme bootstrap must read the device fallback');
assert.ok(layout.includes('document.documentElement.dataset.theme = theme'), 'theme bootstrap must apply the saved theme before render');
assert.ok(layout.includes("classList.toggle('dark', theme !== 'light')"), 'Tailwind dark variants must follow the selected theme');
assert.ok(settings.includes("classList.toggle('dark', theme !== 'light')"), 'live theme changes must update Tailwind dark variants');
assert.ok(settings.includes("window.matchMedia('(prefers-color-scheme: light)')"), 'system preference must follow the operating-system colour scheme');
assert.ok(appContext.includes('fetchAccountSettings(currentUser.user.id)'), 'signed-in accounts must load their saved theme on session restore');
assert.ok(appContext.includes("document.documentElement.dataset.theme = theme"), 'account theme must be applied after session restore');
assert.ok(layout.includes('__html: themeBootstrap'), 'theme bootstrap must be included in the document head');
assert.ok(!layout.includes('className="dark"'), 'fixed dark class must not override the selected theme');
assert.ok(settings.includes('updatePreferences({ theme })'), 'theme selection must persist through account settings');
assert.ok(service.includes("theme: 'system'"), 'new accounts must default to the system colour preference');
assert.ok(service.includes("record.theme === 'light' || record.theme === 'dusk'"), 'saved themes must be normalised');
assert.ok(service.includes('Choose a supported Sanctuary theme.'), 'unsupported themes must be rejected');
assert.ok(types.includes("export type AccountTheme = 'system' | 'light' | 'dark' | 'dusk'"), 'theme must be typed');
assert.ok(types.includes('theme: AccountTheme;'), 'account preferences must contain a typed theme');

console.log('Theme contract checks passed: palettes, early bootstrap, account persistence, legacy fallback, and type contract.');
