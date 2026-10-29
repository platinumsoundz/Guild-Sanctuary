import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const controls = read('../src/modules/messages/CallControls.tsx');
const thread = read('../src/modules/messages/DirectMessageThread.tsx');
const plan = read('../docs/design/PEER_TO_PEER_CALLING_FOUNDATION.md');

assert.match(controls, /Audio call/);
assert.match(controls, /Video call/);
assert.match(controls, /disabled/);
assert.match(controls, /Calling is being built/);
assert.match(thread, /CallControls/);
assert.match(plan, /Do not broadcast SDP\/ICE through an unauthenticated or publicly subscribable channel/);
assert.match(plan, /participant-scoped authorization/);
assert.match(plan, /real two-account\/two-device tests pass/);
assert.match(plan, /Do not record calls or create call history by default/);
console.log('Calling foundation contract passed.');
