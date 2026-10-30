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
assert.ok(source.includes('matched.slice(0, 2).map((output) => output.practicalAction)'), 'practical actions should reflect more than one answer when available');
assert.ok(source.includes('Your other answers add context too'), 'multi-answer results must avoid reducing a member to a single trait');
assert.ok(source.includes('not a fixed learning type'), 'learning preferences must not be presented as validated learning styles');
for (const value of ['values:rest', 'values:connection', 'values:growth', 'values:creativity', 'values:stability']) {
  assert.ok(source.includes(value), `missing values-based reflection rule: ${value}`);
}
for (const required of ['Begin reflection', 'Question progress', 'Skip', 'Create reflection', 'Close and clear this session', 'Copy journal prompt', 'Download reflection (.txt)', 'You choose where to save it', 'not saved to your account']) {
  assert.ok(component.includes(required), `missing questionnaire UX/privacy behavior: ${required}`);
}
assert.ok(component.includes('aria-labelledby'), 'questionnaire sections must have accessible labels');
assert.ok(component.includes("const clearFeedback = () =>"), 'feedback should have a shared reset path');
assert.ok(component.includes("clearFeedback();\n    setAnswers((current) => ({ ...current, [question.id]: value }));"), 'changing an answer should clear stale copy/export feedback');
assert.ok(component.includes("const closeAndClear = () =>"), 'closing should clear the current questionnaire session');
assert.ok(component.includes("clearFeedback();\n    setIsOpen(false);\n    setAnswers({});\n    setStep(0);\n    setHasFinished(false);"), 'closing should clear answers and feedback together');
assert.ok((component.match(/onClick={closeAndClear}/g) ?? []).length === 2, 'both Leave and Close and clear should use the same cleanup path');
assert.ok(component.includes("onClick={() => { clearFeedback(); setHasFinished(false); setStep(0); }}"), 'reviewing answers should clear stale result feedback');
assert.ok(component.includes('const downloadReflection = () =>'), 'reflection export must be explicitly user initiated');
assert.ok(component.includes('URL.createObjectURL(blob)'), 'reflection export must create a local text file without a server request');
assert.ok(component.includes('reflection.disclaimer'), 'exported reflection must retain its non-clinical disclaimer');
assert.ok(component.includes('setTimeout(() => URL.revokeObjectURL(url), 1000)'), 'temporary object URLs must be released after download');
assert.ok(component.includes('sanctuary-reflection-') || component.includes('`${worldType}-reflection-'), 'exported file must have a recognizable environment-specific filename');
assert.ok(/<SelfDiscoveryCentre(?:\s+worldType=\{worldType\})?\s*\/>/.test(profile), 'self-discovery centre must be available from the member profile and inherit its environment');

for (const required of [
  'export interface PersonalizedLearningPlan',
  'export function createPersonalizedLearningPlan(input: unknown)',
  "if (!learning) return null;",
  "title: 'Start with a clear explanation'",
  "title: 'Learn by seeing an example'",
  "title: 'Learn by trying a small step'",
  "title: 'Explore the idea in conversation'",
  "title: 'Combine a few approaches'",
  'not a fixed learning type',
  'decision support preference:',
]) {
  assert.ok(source.includes(required), `missing personalised learning contract: ${required}`);
}
assert.ok(source.includes('const answers = validateSelfDiscoveryAnswers(input);'), 'learning suggestions must validate all supplied answers');
assert.ok(source.includes('This is a small suggestion based on your selected answers'), 'learning suggestions must explain their limits');
assert.ok(component.includes('createPersonalizedLearningPlan'), 'questionnaire result must generate the optional learning plan');
assert.ok(component.includes('A learning path to try'), 'questionnaire result must render the learning plan');
assert.ok(component.includes('SANCTUARY INTELLIGENCE'), 'learning plan must be clearly identified');

assert.ok(component.includes("learningPlan.basis.map((item) => <li key={item}>{item}</li>)"), 'learning path must show which selected preferences informed the suggestion');
assert.ok(component.includes("'Sanctuary Intelligence — Learning Path'"), 'download must include the learning path when one exists');
assert.ok(component.includes("...learningPlan.basis.map((item) => '- ' + item)"), 'download must include the learning plan explanation basis');
assert.ok(component.includes('learningPlan.disclaimer'), 'downloaded learning path must preserve its non-clinical disclaimer');



console.log('Self-discovery contract checks passed: domains, answer coverage, input validation, multi-answer outputs, non-clinical language, and no hidden persistence/network calls.');
