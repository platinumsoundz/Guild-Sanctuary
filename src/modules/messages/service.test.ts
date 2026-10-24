import { describe, expect, it } from 'vitest';
import type { Message } from '@/types/database';
import { messagesAfterCursor } from './service';

const base = {
  conversationId: 'conversation-1',
  senderId: 'user-1',
  body: 'test',
  readAt: null,
};

describe('message gap fill', () => {
  const messages: Message[] = [
    { ...base, id: 'b', sentAt: '2026-01-01T00:00:01.000Z' },
    { ...base, id: 'c', sentAt: '2025-12-31T23:59:59.000Z' },
    { ...base, id: 'a', sentAt: '2026-01-01T00:00:01.000Z' },
  ];

  it('sorts by timestamp and id so equal timestamps are stable', () => {
    expect(messagesAfterCursor(messages, null).map((message) => message.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns only messages after the cursor, including same-timestamp ties', () => {
    expect(messagesAfterCursor(messages, {
      sentAt: '2026-01-01T00:00:01.000Z',
      id: 'a',
    }).map((message) => message.id)).toEqual(['b']);
  });
});
