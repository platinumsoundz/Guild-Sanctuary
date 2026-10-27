import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(new URL('../src/modules/self-discovery/reflection.ts', import.meta.url), 'utf8');

for (const id of ['recharge', 'decisions', 'motivation', 'communication', 'learning', 'values']) {
  assert.ok(source.includes(`id: '${id}'`), `missing questionnaire domain: ${id}`);
}
for (const required of [
  'validateSelfDiscoveryAnswers',
  'createSelfDiscoveryReflection',
  'questionnaireVersion',
  'practicalAction',
  'microLesson',
  'journalPrompt',
  'disclaimer',
  'An unsupported question was supplied.',
  'An unsupported answer was supplied.',
  'It is not a diagnosis or professional advice',
]) {
  assert.ok(source.includes(required), `missing safety or output contract: ${required}`);
}
assert.ok(!source.includes('fetch('), 'reflection engine must remain a pure local rules engine');
assert.ok(!source.includes('localStorage'), 'persistence and consent must be owned by the caller, not hidden in the rules engine');
assert.ok(!source.includes('SECURITY DEFINER'), 'client reflection engine must not contain privileged database functions');
assert.ok(source.includes('You selected quiet time'), 'reflection examples must remain tied to member answers');
assert.ok(source.includes('not a fixed learning type'), 'learning preferences must not be presented as validated learning styles');

console.log('Self-discovery contract checks passed: domains, input validation, explainable outputs, non-clinical language, and no hidden persistence/network calls.');
