import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

function luminance(hex) {
  const channels = hex.replace('#', '').match(/.{2}/g).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function readThemeBlock(theme) {
  const selector = theme === 'default' ? ':root {' : `:root[data-theme="${theme}"] {`;
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `missing CSS block for ${theme}`);
  const end = css.indexOf('}', start);
  return css.slice(start, end + 1);
}

function token(block, name) {
  const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert.ok(match, `missing literal --${name} token in theme block`);
  return match[1];
}

const themes = ['default', 'light', 'dark', 'stone', 'ocean', 'dusk', 'midnight', 'forest', 'rose', 'lavender', 'ember', 'mint'];
for (const theme of themes) {
  // Dark intentionally inherits the root/default palette, so validate the same token set.
  const block = readThemeBlock(theme === 'dark' ? 'default' : theme);
  const bg = token(block, 'bg');
  const surface = token(block, 'surface');
  const ink = token(block, 'ink');
  const muted = token(block, 'muted');
  const accent = token(block, 'accent');
  const accentContrast = token(block, 'accent-contrast');

  for (const [label, foreground, background] of [
    ['body text on page background', ink, bg],
    ['body text on surface', ink, surface],
    ['muted text on surface', muted, surface],
    ['accent text on accent background', accentContrast, accent],
  ]) {
    const ratio = contrastRatio(foreground, background);
    assert.ok(
      ratio >= 4.5,
      `${theme}: ${label} contrast is ${ratio.toFixed(2)}:1; WCAG AA requires at least 4.5:1 for normal text`,
    );
  }
}
console.log('Theme contrast checks passed: text pairs meet WCAG AA 4.5:1 minimum. This does not replace visual/accessibility testing.');
