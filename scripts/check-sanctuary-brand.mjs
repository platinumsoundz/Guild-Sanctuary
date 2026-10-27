import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const navigation = readFileSync(new URL('../src/components/Navigation.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/components/Navigation.module.css', import.meta.url), 'utf8');

assert.ok(navigation.includes('aria-label="The Sanctuary"'), 'header must identify the product as The Sanctuary');
assert.ok(navigation.includes('className={styles.brandMark}'), 'header must include the brand mark');
assert.ok(navigation.includes('<Sun size={21}'), 'brand mark must use the sun identity');
assert.ok(navigation.includes('SANCTUARY'), 'header must use Sanctuary-only branding');
assert.ok(!navigation.includes('GUILD / SANCTUARY'), 'legacy Guild branding must not return to the app header');
for (const token of ['--ink', '--line', '--accent-soft', '--accent', '--muted']) {
  assert.ok(styles.includes(`var(${token})`), `brand styling must use the active theme token ${token}`);
}
assert.ok(styles.includes('.brandName') && styles.includes('letter-spacing'), 'brand name must have dedicated styling');
console.log('Sanctuary brand shell contract passed. Responsive visual review is still required.');
