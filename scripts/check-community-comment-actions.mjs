import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../src/modules/feeds/components/PostEngagement.tsx', import.meta.url), 'utf8');
const shortsSource = readFileSync(new URL('../src/modules/shorts/components/ShortsFeed.tsx', import.meta.url), 'utf8');

const checks = [
  ['comment loads expose an explicit pending state', /isLoadingComments/.test(source) && /Loading comments…/.test(source)],
  ['duplicate load attempts are guarded', /if \(isLoadingComments\) return/.test(source)],
  ['successful empty results are distinguished from an uncompleted or failed load', /loadedCommentsForPostId === postId && !error/.test(source)],
  ['comment load failures remain visible instead of showing a false empty state', /Comments could not be loaded/.test(source) && /role="alert"/.test(source)],
  ['post changes reset comment load state', /setLoadedCommentsForPostId\(null\)/.test(source) && /\}, \[postId, userId\]\)/.test(source)],
  ['comment submissions trim empty text and block duplicate requests', /const body = draft\.trim\(\)/.test(source) && /if \(!body \|\| isSubmittingComment\) return/.test(source)],
  ['submission button is disabled while empty or pending', /disabled=\{isSubmittingComment \|\| !draft\.trim\(\)\}/.test(source) && /Posting…/.test(source)],
  ['submission pending state is always cleared after success or failure', /finally \{\s*setIsSubmittingComment\(false\)/.test(source)],
  ['successful comment posts update the visible list and count once', /setComments\(\(current\) => \[\.\.\.current, comment\]\)/.test(source) && /commentsCount: current\.commentsCount \+ 1/.test(source)],
  ['existing edit, delete, report and reaction actions remain wired', /updatePostComment/.test(source) && /deletePostComment/.test(source) && /ReportContentButton/.test(source) && /toggleCommentLike/.test(source) && /togglePostLike/.test(source)],
  ['post comment reactions lock per comment during an in-flight request', /pendingCommentLikesRef\.current\.has\(commentId\)/.test(source) && /disabled=\{Boolean\(pendingCommentLikes\[comment\.id\]\)\}/.test(source) && /finally \{[\s\S]*?pendingCommentLikesRef\.current\.delete\(commentId\)/.test(source)],
  ['Shorts comment reactions use the same duplicate-request guard and accessible busy state', /pendingCommentLikesRef\.current\.has\(commentId\)/.test(shortsSource) && /aria-busy=\{Boolean\(pendingCommentLikes\[comment\.id\]\)\}/.test(shortsSource) && /finally \{[\s\S]*?pendingCommentLikesRef\.current\.delete\(commentId\)/.test(shortsSource)],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`Community comment action checks passed: ${checks.length}. Static checks only; real-user browser testing remains required.`);
