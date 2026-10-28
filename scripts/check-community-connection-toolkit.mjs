import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const helper = readFileSync('src/modules/feeds/communityConnection.ts', 'utf8');
const composer = readFileSync('src/modules/feeds/components/FeedContent.tsx', 'utf8');
const styles = readFileSync('src/modules/feeds/components/FeedContent.module.css', 'utf8');
const roadmap = readFileSync('ROADMAP.md', 'utf8');

for (const required of [
  "export type CommunityPostMode = 'open' | 'life-lesson' | 'conversation'",
  'export function buildCommunityPost',
  "storyTag = 'Life lesson'",
  "storyTag = 'Question'",
  'Each guided answer must be 1,200 characters or fewer.',
  'Posts must be 2,800 characters or fewer.',
  'Add the lesson you took away before publishing.',
  'Add a question you would genuinely like to discuss.',
]) assert.ok(helper.includes(required), `missing community post guardrail: ${required}`);

for (const required of [
  'buildCommunityPost',
  'Life lesson',
  'Conversation starter',
  'A question for the community',
  'isGuest',
  'publishPost',
  'role="alert"',
]) assert.ok(composer.includes(required), `missing guided composer contract: ${required}`);

for (const required of ['.connectionToolkit', '.guidedFields', '@media (max-width: 580px)', ':focus-visible']) {
  assert.ok(styles.includes(required), `missing responsive/accessibility styling: ${required}`);
}
assert.match(roadmap, /Life lessons[\s\S]{0,260}bridge between wisdom sharing and the feed/i);
assert.ok(!composer.includes('localStorage') && !helper.includes('localStorage'), 'guided drafts must not introduce a new persistence path');
assert.ok(!composer.includes('fetch(') && !helper.includes('fetch('), 'guided drafts must not add an external request');
console.log('Community connection toolkit contract checks passed.');
