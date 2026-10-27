/**
 * Explainable, non-clinical reflection rules for The Sanctuary.
 *
 * Pure functions only: no persistence, network calls, diagnosis, scoring,
 * external model, or inferred profile sharing. The caller owns consent and storage.
 */

export const SELF_DISCOVERY_QUESTIONNAIRE_VERSION = 'reflection-v1' as const;

export const SELF_DISCOVERY_QUESTIONS = [
  {
    id: 'recharge',
    prompt: 'What most often helps you feel restored after a demanding day?',
    options: [
      { value: 'quiet', label: 'Quiet time or a slower pace' },
      { value: 'people', label: 'Time with people I feel comfortable with' },
      { value: 'movement', label: 'Movement or being outdoors' },
      { value: 'creative', label: 'Making, learning, or creating something' },
      { value: 'unsure', label: 'I am still figuring that out' },
    ],
  },
  {
    id: 'decisions',
    prompt: 'When a decision feels difficult, what tends to help most?',
    options: [
      { value: 'facts', label: 'Writing down facts and options' },
      { value: 'talk', label: 'Talking it through with someone I trust' },
      { value: 'time', label: 'Giving myself time before deciding' },
      { value: 'small-step', label: 'Trying one small, reversible step' },
      { value: 'unsure', label: 'It depends on the situation' },
    ],
  },
  {
    id: 'motivation',
    prompt: 'What makes a task feel easier to begin?',
    options: [
      { value: 'tiny-step', label: 'Breaking it into a very small first step' },
      { value: 'company', label: 'Working alongside another person' },
      { value: 'purpose', label: 'Remembering why it matters to me' },
      { value: 'structure', label: 'A clear plan and a little structure' },
      { value: 'unsure', label: 'I am still discovering what helps' },
    ],
  },
  {
    id: 'communication',
    prompt: 'What helps you feel heard in a conversation?',
    options: [
      { value: 'listening', label: 'Having space to finish my thoughts' },
      { value: 'questions', label: 'Thoughtful questions and curiosity' },
      { value: 'direct', label: 'Clear, direct words' },
      { value: 'time', label: 'Time to think before responding' },
      { value: 'unsure', label: 'It varies with the person and situation' },
    ],
  },
  {
    id: 'learning',
    prompt: 'When you are learning something new, what would you like to try first?',
    options: [
      { value: 'reading', label: 'Reading or seeing an explanation' },
      { value: 'watching', label: 'Watching a demonstration' },
      { value: 'practice', label: 'Trying it hands-on' },
      { value: 'discussion', label: 'Discussing it with someone' },
      { value: 'mix', label: 'A mix, depending on the topic' },
    ],
  },
  {
    id: 'values',
    prompt: 'What would you most like to make a little more room for this week?',
    options: [
      { value: 'rest', label: 'Rest and breathing space' },
      { value: 'connection', label: 'Meaningful connection' },
      { value: 'growth', label: 'Learning or personal growth' },
      { value: 'creativity', label: 'Creativity and play' },
      { value: 'stability', label: 'Stability and getting one thing done' },
    ],
  },
] as const;

export type SelfDiscoveryQuestionId = (typeof SELF_DISCOVERY_QUESTIONS)[number]['id'];
export type SelfDiscoveryAnswer = string;
export type SelfDiscoveryAnswers = Partial<Record<SelfDiscoveryQuestionId, SelfDiscoveryAnswer>>;

export interface SelfDiscoveryReflection {
  questionnaireVersion: typeof SELF_DISCOVERY_QUESTIONNAIRE_VERSION;
  answeredCount: number;
  totalQuestions: number;
  pattern: string;
  practicalAction: string;
  microLesson: string;
  journalPrompt: string;
  disclaimer: string;
}

const outputs: Record<string, Omit<SelfDiscoveryReflection, 'questionnaireVersion' | 'answeredCount' | 'totalQuestions' | 'disclaimer'>> = {
  'recharge:quiet': {
    pattern: 'You selected quiet time as something that can help you feel restored.',
    practicalAction: 'If it suits your day, protect ten unhurried minutes for yourself and notice whether it helps.',
    microLesson: 'Recovery is personal. A small pause can be useful, but it is fine if a different kind of rest works better for you.',
    journalPrompt: 'What leaves me feeling a little more settled, and what makes that harder?',
  },
  'recharge:people': {
    pattern: 'You selected comfortable company as one possible way to recharge.',
    practicalAction: 'Consider sending a low-pressure message to someone you feel at ease with.',
    microLesson: 'Connection can support wellbeing, and needing solitude at other times is normal too.',
    journalPrompt: 'Which kinds of connection leave me feeling supported rather than drained?',
  },
  'recharge:movement': {
    pattern: 'You selected movement or the outdoors as a possible source of restoration.',
    practicalAction: 'Try a gentle five-minute stretch or short walk if that feels accessible today.',
    microLesson: 'Small changes of pace can create a useful reset; the activity should fit your body and circumstances.',
    journalPrompt: 'What kind of movement feels kind to me rather than like another obligation?',
  },
  'recharge:creative': {
    pattern: 'You selected creating or learning as something that may restore your energy.',
    practicalAction: 'Set aside ten minutes for a small, curiosity-led activity without needing to finish it.',
    microLesson: 'Play and exploration can be worthwhile without needing to become productive or perfect.',
    journalPrompt: 'What do I enjoy exploring when there is no pressure to perform?',
  },
  'decisions:facts': {
    pattern: 'You selected writing down facts and options as a helpful decision aid.',
    practicalAction: 'Write the two or three options you have, what you know, and one question that remains open.',
    microLesson: 'Separating known facts from assumptions can make a decision feel easier to examine.',
    journalPrompt: 'What do I know, what am I assuming, and what could I learn next?',
  },
  'decisions:talk': {
    pattern: 'You selected talking things through with someone trusted as potentially helpful.',
    practicalAction: 'Ask someone you trust to listen or help you explore options, and tell them which kind of support you want.',
    microLesson: 'You can ask for listening rather than advice; naming the kind of support you need can help.',
    journalPrompt: 'Who helps me think clearly while still leaving the decision in my hands?',
  },
  'decisions:time': {
    pattern: 'You selected allowing time as a useful part of difficult decisions.',
    practicalAction: 'If the decision allows it, choose a time to revisit it instead of carrying it around all day.',
    microLesson: 'A pause can help when there is no urgent deadline; some decisions also benefit from a clear time limit.',
    journalPrompt: 'Does this need a decision now, or can I give myself a reasonable pause?',
  },
  'decisions:small-step': {
    pattern: 'You selected a small, reversible experiment as a way to move forward.',
    practicalAction: 'Identify one low-risk step that gives you information without locking you into a final choice.',
    microLesson: 'A small experiment can replace some guesswork with experience, provided the step is safe and reversible.',
    journalPrompt: 'What is the smallest safe step that could teach me something useful?',
  },
  'motivation:tiny-step': {
    pattern: 'You selected a very small first step as a way to begin a task.',
    practicalAction: 'Make the first step take two minutes or less, and give yourself permission to stop after it.',
    microLesson: 'Reducing the starting effort can make action more approachable; finishing everything is not required for a start to count.',
    journalPrompt: 'What would the smallest meaningful beginning look like?',
  },
  'motivation:company': {
    pattern: 'You selected working alongside someone as a possible support for getting started.',
    practicalAction: 'Try a short co-working session or tell a trusted person what you plan to start.',
    microLesson: 'Shared structure can help some people begin, without meaning that you cannot work independently.',
    journalPrompt: 'What kind of company helps me feel supported without distracting me?',
  },
  'motivation:purpose': {
    pattern: 'You selected reconnecting with purpose as a way to approach a task.',
    practicalAction: 'Write one sentence about why this task matters to you—or decide honestly that it can wait.',
    microLesson: 'Purpose can provide direction, but rest, resources, and realistic scope matter too.',
    journalPrompt: 'Which part of this task connects with something I genuinely value?',
  },
  'motivation:structure': {
    pattern: 'You selected a clear plan as something that can make starting easier.',
    practicalAction: 'Choose one next action and a realistic time to try it; keep the plan short.',
    microLesson: 'A plan is a support, not a contract. It should adapt when your circumstances change.',
    journalPrompt: 'What is the next clear action, and what might get in its way?',
  },
  'communication:listening': {
    pattern: 'You selected having room to finish your thoughts as important in conversation.',
    practicalAction: 'Try saying, “I would like to finish the thought, then I would really like to hear your view.”',
    microLesson: 'Clear, respectful requests can make conversation needs easier to understand; the other person also has needs and boundaries.',
    journalPrompt: 'What helps me feel listened to, and how can I ask for it kindly?',
  },
  'communication:questions': {
    pattern: 'You selected thoughtful questions and curiosity as helpful in conversation.',
    practicalAction: 'In your next conversation, try asking one open question before offering your own interpretation.',
    microLesson: 'Curiosity can create room for nuance, especially when questions are genuine rather than a disguised argument.',
    journalPrompt: 'What question could help me understand someone without assuming I already know?',
  },
  'communication:direct': {
    pattern: 'You selected clear and direct language as helpful in conversation.',
    practicalAction: 'Try stating one need or boundary in a kind, specific sentence.',
    microLesson: 'Directness and kindness can coexist. Context and tone still matter, and different people may prefer different approaches.',
    journalPrompt: 'What do I wish I could say more clearly and respectfully?',
  },
  'communication:time': {
    pattern: 'You selected having time to think before responding as helpful.',
    practicalAction: 'Try saying, “I want to give this a thoughtful answer; can I come back to you shortly?”',
    microLesson: 'Taking time to respond can support care and clarity; it is useful to communicate when you will return to the conversation.',
    journalPrompt: 'When do I think best, and how can I make room for that without leaving others uncertain?',
  },
  'learning:reading': {
    pattern: 'You chose reading or a written explanation as a first approach you would like to try.',
    practicalAction: 'Start with a short explanation, then check your understanding by summarising it in your own words.',
    microLesson: 'A preferred starting point is not a fixed learning type. Mixing explanation, practice, and feedback often helps.',
    journalPrompt: 'What did I understand, and what would I like to see demonstrated or practise?',
  },
  'learning:watching': {
    pattern: 'You chose a demonstration as a first approach you would like to try.',
    practicalAction: 'Watch one short demonstration, then pause and try to explain or repeat one step yourself.',
    microLesson: 'Seeing a process can make its sequence clearer; active recall and practice help turn observation into skill.',
    journalPrompt: 'Which step became clearer after seeing it, and which step needs practice?',
  },
  'learning:practice': {
    pattern: 'You chose hands-on practice as a first approach you would like to try.',
    practicalAction: 'Try a small, low-stakes version of the skill and note one thing that worked and one question.',
    microLesson: 'Practice can reveal gaps that explanation alone misses; feedback and breaks are part of learning too.',
    journalPrompt: 'What did trying it teach me that I would not have learned by only reading?',
  },
  'learning:discussion': {
    pattern: 'You chose discussion as a first approach you would like to try.',
    practicalAction: 'Explain one idea to someone or talk it through aloud, then identify the part that still feels unclear.',
    microLesson: 'Explaining ideas can reveal assumptions and gaps; discussion is most useful when it feels safe to ask basic questions.',
    journalPrompt: 'What became clearer when I put the idea into words?',
  },
  'learning:mix': {
    pattern: 'You prefer choosing learning approaches to fit the topic rather than using one fixed method.',
    practicalAction: 'Combine a short explanation with one practice attempt and a quick review of what you learned.',
    microLesson: 'Learning approaches are tools, not fixed styles. Choose them based on the task, access needs, and what helps you check understanding.',
    journalPrompt: 'Which combination helped me understand this topic, and how do I know?',
  },
  'values:rest': {
    pattern: 'You would like to make more room for rest and breathing space this week.',
    practicalAction: 'Choose one small commitment you can pause, shorten, or do more gently to make room to recover.',
    microLesson: 'Rest is a legitimate need, not a reward you must earn. Start with what is realistic for your circumstances.',
    journalPrompt: 'What would enough rest look like for me this week, in real life?',
  },
  'values:connection': {
    pattern: 'You would like to make more room for meaningful connection this week.',
    practicalAction: 'Reach out to one person with a simple message or suggest a small moment together, without pressure.',
    microLesson: 'Connection can be small and ordinary. A short, genuine interaction can matter without needing to solve everything.',
    journalPrompt: 'Which relationships help me feel seen, and how could I nurture one of them?',
  },
  'values:growth': {
    pattern: 'You would like to make more room for learning or personal growth this week.',
    practicalAction: 'Pick one question you are curious about and spend ten minutes exploring it without needing a perfect outcome.',
    microLesson: 'Growth can mean noticing, practising, or changing your mind. It does not need to be a dramatic transformation.',
    journalPrompt: 'What would I like to understand a little better, and why does it matter to me?',
  },
  'values:creativity': {
    pattern: 'You would like to make more room for creativity and play this week.',
    practicalAction: 'Give yourself a small, no-pressure creative window and let the result be unfinished if you want.',
    microLesson: 'Play can be valuable for its own sake. It does not have to become a skill, side project, or performance.',
    journalPrompt: 'What would I make or explore if nobody needed to see the result?',
  },
  'values:stability': {
    pattern: 'You would like to make more room for stability and getting one thing done this week.',
    practicalAction: 'Choose one achievable task, define what “done enough” means, and leave the rest for another time.',
    microLesson: 'A manageable next step can restore a sense of direction. Plans should account for energy, support, and constraints.',
    journalPrompt: 'What is one thing I can reasonably finish, and what can wait?',
  },
};

const fallback = {
  pattern: 'You are still exploring what works for you, and that is a useful place to begin.',
  practicalAction: 'Choose one low-pressure experiment from your answers, or simply notice what helps you today.',
  microLesson: 'Self-understanding develops over time. One answer is a clue to explore, not a fixed label.',
  journalPrompt: 'What would I like to understand about myself with a little more kindness?',
};

const allowedAnswers = new Map<string, Set<string>>(
  SELF_DISCOVERY_QUESTIONS.map((question) => [
    question.id,
    new Set(question.options.map((option) => option.value)),
  ]),
);

export function validateSelfDiscoveryAnswers(input: unknown): SelfDiscoveryAnswers {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Answers must be an object keyed by supported question IDs.');
  }

  const result: SelfDiscoveryAnswers = {};
  for (const [key, value] of Object.entries(input)) {
    const allowed = allowedAnswers.get(key);
    if (!allowed) throw new Error('An unsupported question was supplied.');
    if (typeof value !== 'string' || !allowed.has(value)) {
      throw new Error('An unsupported answer was supplied.');
    }
    result[key as SelfDiscoveryQuestionId] = value;
  }
  return result;
}

export function createSelfDiscoveryReflection(input: unknown): SelfDiscoveryReflection {
  const answers = validateSelfDiscoveryAnswers(input);
  const answeredCount = Object.keys(answers).length;
  const matched = SELF_DISCOVERY_QUESTIONS
    .map((question) => outputs[`${question.id}:${answers[question.id]}`])
    .filter((output): output is (typeof fallback) => Boolean(output));
  const primary = matched[0] ?? fallback;
  const patterns = matched.slice(0, 3).map((output) => output.pattern);
  const pattern = patterns.length > 0
    ? patterns.join(' ')
    : fallback.pattern;
  const practicalAction = primary.practicalAction;
  const microLesson = matched.length > 1
    ? `${primary.microLesson} Your other answers add context too; treat this as a collection of possibilities, not a single description of you.`
    : primary.microLesson;
  const journalPrompt = matched.length > 1
    ? matched.slice(0, 2).map((output) => output.journalPrompt).join(' ')
    : primary.journalPrompt;

  return {
    questionnaireVersion: SELF_DISCOVERY_QUESTIONNAIRE_VERSION,
    answeredCount,
    totalQuestions: SELF_DISCOVERY_QUESTIONS.length,
    pattern,
    practicalAction,
    microLesson,
    journalPrompt,
    disclaimer: 'This is a private, non-clinical reflection based only on the answers you chose to share here. It may not fit your experience. It is not a diagnosis or professional advice; you can edit or delete your answers.',
  };
}
