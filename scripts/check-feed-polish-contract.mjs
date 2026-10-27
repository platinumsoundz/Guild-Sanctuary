import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const feed = readFileSync(new URL('../src/modules/feeds/components/FeedContent.tsx', import.meta.url), 'utf8');
const comments = readFileSync(new URL('../src/modules/feeds/components/PostEngagement.tsx', import.meta.url), 'utf8');
const feedStyles = readFileSync(new URL('../src/modules/feeds/components/FeedContent.module.css', import.meta.url), 'utf8');

assert.match(feed, /function formatPostTime\(value: string\)/, 'feed timestamps use a shared local-time formatter');
assert.match(feed, /date\.toLocaleString\(\)/, 'future timestamps fall back to local date and time');
assert.match(feed, /date\.toLocaleDateString\(undefined/, 'older posts use the member locale');
assert.match(feed, /title=\{new Date\(post\.createdAt\)\.toLocaleString\(\)\}/, 'relative timestamps expose the exact local time on hover/focus');
assert.doesNotMatch(feed, /slice\(0, 16\)\} UTC/, 'feed no longer labels UTC text as local time');
assert.match(comments, /getLocalPublicProfileById\(comment\.authorId\)/, 'comment author IDs resolve to profile display names where available');
assert.match(comments, /Community member/, 'unknown comment authors use a safe readable fallback');
assert.ok(!comments.includes('comment.authorId}</strong>'), 'raw comment author IDs are not rendered');
assert.match(feedStyles, /\.postMeta\s*\{[^}]*font-size:\s*12px/s, 'post metadata is readable at 12px or larger');
assert.match(feedStyles, /\.postText\s*\{[^}]*font-size:\s*16px/s, 'post body text remains comfortably readable');
console.log('Feed polish contract checks passed.');
