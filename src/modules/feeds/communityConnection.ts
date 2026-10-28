export type CommunityPostMode = 'open' | 'life-lesson' | 'conversation';

export interface CommunityPostDraft {
  mode: CommunityPostMode;
  context: string;
  lesson: string;
  helpfulNow: string;
  question: string;
}

export interface CommunityPostResult {
  content: string;
  storyTag: string | null;
  error: string | null;
}

const MAX_POST_LENGTH = 2800;
const MAX_FIELD_LENGTH = 1200;

function clean(value: string): string {
  return value.trim().replace(/\r\n/g, '\n');
}

function tooLong(value: string): boolean {
  return value.length > MAX_FIELD_LENGTH;
}

/**
 * Turn an optional reflection template into a normal feed post.
 * No extra storage or network calls are involved; the existing feed owns publishing.
 */
export function buildCommunityPost(draft: CommunityPostDraft, openDraft: string, openTag: string, allowMediaOnly = false): CommunityPostResult {
  if (draft.mode === 'open') {
    const content = clean(openDraft);
    if (!content && !allowMediaOnly) return { content: '', storyTag: null, error: 'Add a few words before publishing.' };
    if (content.length > MAX_POST_LENGTH) return { content: '', storyTag: null, error: 'Posts must be 2,800 characters or fewer.' };
    return { content, storyTag: openTag || null, error: null };
  }

  const fields = draft.mode === 'life-lesson'
    ? [draft.context, draft.lesson, draft.helpfulNow, draft.question].map(clean)
    : [draft.context, draft.question].map(clean);
  if (fields.some(tooLong)) return { content: '', storyTag: null, error: 'Each guided answer must be 1,200 characters or fewer.' };

  let content = '';
  let storyTag: string;

  if (draft.mode === 'life-lesson') {
    const [context, lesson, helpfulNow, question] = fields;
    if (!lesson) return { content: '', storyTag: null, error: 'Add the lesson you took away before publishing.' };
    content = [
      'A life lesson',
      context ? `What was happening: \n${context}` : '',
      `What I learned: \n${lesson}`,
      helpfulNow ? `What helps me now: \n${helpfulNow}` : '',
      question ? `A question for the community: \n${question}` : '',
    ].filter(Boolean).join('\n\n');
    storyTag = 'Life lesson';
  } else {
    const [context, question] = fields;
    if (!question) return { content: '', storyTag: null, error: 'Add a question you would genuinely like to discuss.' };
    content = [
      'A question for the community',
      context ? `A little context: \n${context}` : '',
      question,
    ].filter(Boolean).join('\n\n');
    storyTag = 'Question';
  }

  if (content.length > MAX_POST_LENGTH) {
    return { content: '', storyTag: null, error: 'This guided post is too long. Shorten an answer and try again.' };
  }
  return { content, storyTag, error: null };
}
