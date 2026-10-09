import type { Conversation, Message } from '@/types/database';
import { getLocalPublicProfileById } from '@/modules/auth';

export interface ConversationThread {
  conversation: Conversation;
  messages: Message[];
}

const conversations = new Map<string, Conversation>();
const conversationKeys = new Map<string, string>();
const messages: Message[] = [];
let nextMessageId = 1;
let nextConversationId = 1;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

function participantKey(firstUserId: string, secondUserId: string): string {
  return [firstUserId, secondUserId].sort().join(':');
}

function requireParticipant(conversationId: string, userId: string): Conversation {
  const conversation = conversations.get(conversationId);
  if (!conversation || !conversation.participantIds.includes(userId)) {
    throw new Error('This conversation is unavailable.');
  }
  return conversation;
}

export async function openDirectConversation(userId: string, peerUserId: string): Promise<ConversationThread> {
  if (!userId || !peerUserId || userId === peerUserId) {
    throw new Error('Choose another community member to start a conversation.');
  }
  const peerProfile = getLocalPublicProfileById(peerUserId);
  if (!peerProfile || !peerProfile.allowDirectMessages) {
    throw new Error('This member is not accepting direct messages.');
  }

  await delay();
  const key = participantKey(userId, peerUserId);
  let conversationId = conversationKeys.get(key);
  let conversation = conversationId ? conversations.get(conversationId) : undefined;
  if (!conversation) {
    const timestamp = new Date().toISOString();
    conversationId = `conversation-${nextConversationId++}`;
    conversation = {
      id: conversationId,
      kind: 'direct',
      participantIds: [userId, peerUserId],
      name: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    conversations.set(conversation.id, conversation);
    conversationKeys.set(key, conversation.id);
  }

  return {
    conversation: { ...conversation, participantIds: [...conversation.participantIds] },
    messages: messages.filter((message) => message.conversationId === conversation.id).map((message) => ({ ...message })),
  };
}

export async function createGroupConversation(userId: string, participantIds: string[], name: string): Promise<Conversation> {
  const normalizedName = name.trim();
  const members = [...new Set([userId, ...participantIds].filter(Boolean))];
  if (!userId || members.length < 3 || participantIds.includes(userId)) {
    throw new Error('Choose at least two other members for a group conversation.');
  }
  if (normalizedName.length < 2 || normalizedName.length > 60) {
    throw new Error('Group names must be between 2 and 60 characters.');
  }
  if (participantIds.some((participantId) => !getLocalPublicProfileById(participantId)?.allowDirectMessages)) {
    throw new Error('Every group member must have direct messages enabled.');
  }
  await delay();
  const timestamp = new Date().toISOString();
  const conversation: Conversation = {
    id: `conversation-${nextConversationId++}`,
    kind: 'group',
    participantIds: members,
    name: normalizedName,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  conversations.set(conversation.id, conversation);
  return { ...conversation, participantIds: [...conversation.participantIds] };
}

export async function fetchUserConversations(userId: string): Promise<Conversation[]> {
  if (!userId) {
    throw new Error('Sign in to view your conversations.');
  }
  await delay();
  return [...conversations.values()]
    .filter((conversation) => conversation.participantIds.includes(userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((conversation) => ({ ...conversation, participantIds: [...conversation.participantIds] }));
}

export async function fetchConversationThread(conversationId: string, userId: string): Promise<ConversationThread> {
  const conversation = requireParticipant(conversationId, userId);
  await delay();
  return {
    conversation: { ...conversation, participantIds: [...conversation.participantIds] },
    messages: messages.filter((message) => message.conversationId === conversationId).map((message) => ({ ...message })),
  };
}

export async function fetchConversationMessages(conversationId: string, userId: string): Promise<Message[]> {
  return (await fetchConversationThread(conversationId, userId)).messages;
}

export async function sendConversationMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
  const conversation = requireParticipant(conversationId, senderId);
  const peerUserId = conversation.kind === 'direct'
    ? conversation.participantIds.find((participantId) => participantId !== senderId)
    : undefined;
  if (peerUserId && !getLocalPublicProfileById(peerUserId)?.allowDirectMessages) {
    throw new Error('This member is not accepting direct messages.');
  }
  const normalizedBody = body.trim();
  if (normalizedBody.length < 1 || normalizedBody.length > 2000) {
    throw new Error('Messages must contain 1 to 2,000 characters.');
  }

  await delay();
  const message: Message = {
    id: `message-${nextMessageId++}`,
    conversationId,
    senderId,
    body: normalizedBody,
    sentAt: new Date().toISOString(),
    readAt: null,
  };
  messages.push(message);
  conversation.updatedAt = message.sentAt;
  return { ...message };
}

export const sendDirectMessage = sendConversationMessage;

export function removeUserConversationData(userId: string): void {
  for (const [key] of conversationKeys) {
    if (key.split(':').includes(userId)) conversationKeys.delete(key);
  }
  for (const [conversationId, conversation] of conversations) {
    conversation.participantIds = conversation.participantIds.filter((participantId) => participantId !== userId);
    if (conversation.kind === 'group' && conversation.participantIds.length < 2) {
      conversations.delete(conversationId);
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index].conversationId === conversationId) messages.splice(index, 1);
      }
    }
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].senderId === userId) messages.splice(index, 1);
  }
}
