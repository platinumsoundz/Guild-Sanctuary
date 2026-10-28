import assert from 'node:assert/strict';
import { buildCommunityPost } from '../src/modules/feeds/communityConnection.ts';

const base = { context: '', lesson: '', helpfulNow: '', question: '' };
const open = buildCommunityPost({ ...base, mode: 'open' }, '  Hello Sanctuary  ', 'Reflection');
assert.deepEqual(open, { content: 'Hello Sanctuary', storyTag: 'Reflection', error: null });

assert.equal(buildCommunityPost({ ...base, mode: 'open' }, '', '', false).error, 'Add a few words before publishing.');
assert.deepEqual(buildCommunityPost({ ...base, mode: 'open' }, '', '', true), { content: '', storyTag: null, error: null });

const lessonMissing = buildCommunityPost({ ...base, mode: 'life-lesson' }, '', '', false);
assert.equal(lessonMissing.error, 'Add the lesson you took away before publishing.');
assert.equal(lessonMissing.storyTag, null);

const lesson = buildCommunityPost({
  mode: 'life-lesson',
  context: 'A difficult season',
  lesson: 'Ask for help sooner.',
  helpfulNow: 'I check in with a friend.',
  question: 'What has helped you?',
}, '', '', false);
assert.equal(lesson.error, null);
assert.equal(lesson.storyTag, 'Life lesson');
assert.match(lesson.content, /What was happening:\nA difficult season/);
assert.match(lesson.content, /What I learned:\nAsk for help sooner\./);
assert.match(lesson.content, /A question for the community:\nWhat has helped you\?/);

const conversationMissing = buildCommunityPost({ ...base, mode: 'conversation' }, '', '', false);
assert.equal(conversationMissing.error, 'Add a question you would genuinely like to discuss.');
const conversation = buildCommunityPost({
  ...base,
  mode: 'conversation',
  context: 'I have been thinking about routines.',
  question: 'What small habit helps you feel grounded?',
}, '', '', false);
assert.equal(conversation.error, null);
assert.equal(conversation.storyTag, 'Question');
assert.match(conversation.content, /A little context/);
assert.match(conversation.content, /What small habit helps you feel grounded\?/);

assert.equal(buildCommunityPost({ ...base, mode: 'life-lesson', lesson: 'x'.repeat(1201) }, '', '').error,
  'Each guided answer must be 1,200 characters or fewer.');
assert.equal(buildCommunityPost({ ...base, mode: 'open' }, 'x'.repeat(2801), '').error,
  'Posts must be 2,800 characters or fewer.');
assert.equal(buildCommunityPost({ ...base, mode: 'life-lesson', lesson: 'x'.repeat(1200), context: 'x'.repeat(1200), helpfulNow: 'x'.repeat(1200), question: 'x'.repeat(1200) }, '', '').error,
  'This guided post is too long. Shorten an answer and try again.');

console.log('Community connection runtime tests passed.');
