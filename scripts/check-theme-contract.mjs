import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../src/app/globals.css');
const layout = read('../src/app/layout.tsx');
const settings = read('../src/modules/settings/components/SettingsHub.tsx');
const service = read('../src/modules/settings/service.ts');
const types = read('../src/types/database.ts');

for (const theme of ['light', 'dark', 'dusk']) {
  assert.ok(css.includes(`:root[data-theme="${theme}"]`) || (theme === 'dark' && css.includes(':root {')), `missing ${theme} palette`);
  assert.ok(settings.includes(`value="${theme}"`), `missing ${theme} option in Settings`);
}
assert.ok(layout.includes("localStorage.getItem('sanctuary-theme')"), 'theme bootstrap must read the device fallback');
assert.ok(layout.includes('document.documentElement.dataset.theme = theme'), 'theme bootstrap must apply the saved theme before render');
assert.ok(layout.includes('__html: themeBootstrap'), 'theme bootstrap must be included in the document head');
assert.ok(!layout.includes('className="dark"'), 'fixed dark class must not override the selected theme');
assert.ok(settings.includes('updatePreferences({ theme })'), 'theme selection must persist through account settings');
assert.ok(service.includes("theme: 'dark'"), 'legacy settings must retain dark as a safe default');
assert.ok(service.includes("record.theme === 'light' || record.theme === 'dusk'"), 'saved themes must be normalised');
assert.ok(service.includes('Choose a supported Sanctuary theme.'), 'unsupported themes must be rejected');
assert.ok(types.includes("export type AccountTheme = 'light' | 'dark' | 'dusk'"), 'theme must be typed');
assert.ok(types.includes('theme: AccountTheme;'), 'account preferences must contain a typed theme');

console.log('Theme contract checks passed: palettes, early bootstrap, account persistence, legacy fallback, and type contract.');
