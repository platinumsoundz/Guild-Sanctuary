import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/modules/shorts/components/ShortsFeed.module.css', 'utf8');
const feedStart = css.indexOf('.feed {');
const feedEnd = css.indexOf('\n}', feedStart);
assert.ok(feedStart >= 0 && feedEnd > feedStart, 'Shorts feed styles must remain defined');
const feed = css.slice(feedStart, feedEnd);

assert.match(feed, /grid-auto-rows:\s*100%/, 'Every short must occupy its own full-height grid row');
assert.match(feed, /align-content:\s*start/, 'Full-height short rows must stack from the top without being compressed');
assert.match(css, /\.clip\s*\{[^}]*min-height:\s*100%/s, 'Each clip must fill its full feed row');
assert.match(css, /scroll-snap-type:\s*y\s+mandatory/, 'Full-size clips must retain vertical snap scrolling');

console.log('Shorts full-size scrolling contract checks passed.');
