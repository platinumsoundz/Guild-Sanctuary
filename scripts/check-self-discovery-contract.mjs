import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(new URL('../src/modules/self-discovery/reflection.ts', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/modules/self-discovery/components/SelfDiscoveryCentre.tsx', import.meta.url), 'utf8');
const profile = readFileSync(new URL('../src/modules/profiles/components/ProfileDashboard.tsx', import.meta.url), 'utf8');

for (const id of ['recharge', 'decisions', 'motivation', 'communication', 'learning', 'values']) {
  assert.ok(source.includes(`id: '${id}'`), `missing questionnaire domain: ${id}`);
}
const questionnaireSource = source.split('export const SELF_DISCOVERY_QUESTIONS = [')[1]?.split('] as const;')[0] ?? '';
const outputsSource = source.split('const outputs:')[1]?.split('const fallback =')[0] ?? '';
const outputKeys = new Set([...outputsSource.matchAll(/^\s*'([^']+:[^']+)': \{/gm)].map((match) => match[1]));
const questionBlocks = [...questionnaireSource.matchAll(/\{\s*id: '([^']+)',\s*prompt: '[\s\S]*?options: \[([\s\S]*?)\],\s*\},/g)];
assert.equal(questionBlocks.length, 6, 'every questionnaire domain must be parsed for answer coverage');
for (const [, questionId, optionSource] of questionBlocks) {
  const values = [...optionSource.matchAll(/value: '([^']+)'/g)].map((match) => match[1]);
  assert.ok(values.length >= 4, `question ${questionId} should keep its answer choices`);
  for (const value of values.filter((value) => value !== 'unsure')) {
    assert.ok(outputKeys.has(`${questionId}:${value}`), `missing answer-grounded reflection for ${questionId}:${value}`);
  }
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
assert.ok(source.includes('.filter((output): output is (typeof fallback) => Boolean(output))'), 'reflection must collect all matching answer outputs');
assert.ok(source.includes('matched.slice(0, 3).map((output) => output.pattern)'), 'reflection summary must use multiple answers, not only the first match');
assert.ok(source.includes('matched.slice(0, 2).map((output) => output.journalPrompt)'), 'journal prompts should reflect more than one answer when available');
assert.ok(source.includes('Your other answers add context too'), 'multi-answer results must avoid reducing a member to a single trait');
assert.ok(source.includes('not a fixed learning type'), 'learning preferences must not be presented as validated learning styles');
for (const value of ['values:rest', 'values:connection', 'values:growth', 'values:creativity', 'values:stability']) {
  assert.ok(source.includes(value), `missing values-based reflection rule: ${value}`);
}
for (const required of ['Begin reflection', 'Question progress', 'Skip', 'Create reflection', 'Close and clear this session', 'not saved to your account']) {
  assert.ok(component.includes(required), `missing questionnaire UX/privacy behavior: ${required}`);
}
assert.ok(component.includes('aria-labelledby'), 'questionnaire sections must have accessible labels');
assert.ok(profile.includes('<SelfDiscoveryCentre />'), 'self-discovery centre must be available from the member profile');

console.log('Self-discovery contract checks passed: domains, answer coverage, input validation, multi-answer outputs, non-clinical language, and no hidden persistence/network calls.');
