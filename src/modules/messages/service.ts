'use client';

import type { Conversation, Message, PublicProfile } from '@/types/database';
import { getLocalPublicProfileById } from '@/modules/auth';
import { getSupabaseBrowserClient } from '@/services/supabase';
import {
  createPersistentConversation,
  fetchPersistentConversations,
  fetchPersistentThread,
  sendPersistentMessage,
  subscribeToPersistentMessages,
} from './supabaseRepository';

export interface ConversationThread {
  conversation: Conversation;
  messages: Message[];
}

const conversations = new Map<string, Conversation>();
const messages: Message[] = [];
const conversationKeys = new Map<string, string>(); // Keyed by participant pair string
let nextConversationId = 1;
let nextMessageId = 1;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

function participantKey(userId: string, peerUserId: string): string {
  return [userId, peerUserId].sort().join(':');
}

function isPersistentMessagingEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_PERSISTENT_MESSAGING_ENABLED === 'true',
  );
}

/**
 * Use the durable repository only when the active Supabase session belongs to
 * the user represented by the current app session. Local/demo sessions remain
 * isolated in the in-memory repository and are never silently mixed with UUID
 * conversations from Supabase.
 */
async function hasPersistentSession(userId: string): Promise<boolean> {
  if (!isPersistentMessagingEnabled() || !userId) return false;
  const { data, error } = await getSupabaseBrowserClient().auth.getUser();
  if (error) throw new Error(`Authentication could not be verified: ${error.message}`);
  return data.user?.id === userId;
}

function requireParticipant(conversationId: string, userId: string): Conversation {
  const conversation = conversations.get(conversationId);
  if (!conversation || !conversation.participantIds.includes(userId)) {
    throw new Error('You do not have access to this conversation.');
  }
  return conversation;
}

export async function createDirectConversation(userId: string, peerUserId: string): Promise<ConversationThread> {
  if (!userId || !peerUserId || userId === peerUserId) {
    throw new Error('Choose another community member to start a conversation.');
  }

  if (await hasPersistentSession(userId)) {
    // The database RPC is the authority for membership and account privacy.
    const conversation = await createPersistentConversation('direct', [peerUserId], null);
    return fetchPersistentThread(conversation.id);
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

export const openDirectConversation = createDirectConversation;

export async function createGroupConversation(userId: string, participantIds: string[], name: string): Promise<Conversation> {
  const normalizedName = name.trim();
  const members = [...new Set([userId, ...participantIds].filter(Boolean))];
  if (!userId || members.length < 3 || participantIds.includes(userId)) {
    throw new Error('Choose at least two other members for a group conversation.');
  }
  if (normalizedName.length < 2 || normalizedName.length > 60) {
    throw new Error('Group names must be between 2 and 60 characters.');
  }

  if (await hasPersistentSession(userId)) {
    // The RPC validates the requested members against the authenticated caller.
    return createPersistentConversation('group', participantIds, normalizedName);
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
  if (await hasPersistentSession(userId)) {
    return fetchPersistentConversations(userId);
  }
  await delay();
  return [...conversations.values()]
    .filter((conversation) => conversation.participantIds.includes(userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((conversation) => ({ ...conversation, participantIds: [...conversation.participantIds] }));
}

export async function fetchConversationThread(conversationId: string, userId: string): Promise<ConversationThread> {
  if (await hasPersistentSession(userId)) {
    return fetchPersistentThread(conversationId);
  }
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
  const normalizedBody = body.trim();
  if (normalizedBody.length < 1 || normalizedBody.length > 2000) {
    throw new Error('Messages must contain 1 to 2,000 characters.');
  }

  if (await hasPersistentSession(senderId)) {
    // The insert policy validates the authenticated sender's membership.
    return sendPersistentMessage(conversationId, normalizedBody);
  }

  const conversation = requireParticipant(conversationId, senderId);
  const peerUserId = conversation.kind === 'direct'
    ? conversation.participantIds.find((participantId) => participantId !== senderId)
    : undefined;
  if (peerUserId && !getLocalPublicProfileById(peerUserId)?.allowDirectMessages) {
    throw new Error('This member is not accepting direct messages.');
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

export async function subscribeToConversationMessages(
  conversationId: string,
  userId: string,
  onMessage: (message: Message) => void,
  onError: (message: string) => void,
): Promise<() => void> {
  if (!(await hasPersistentSession(userId))) return () => undefined;
  return subscribeToPersistentMessages(conversationId, onMessage, onError);
}

export function removeUserConversationData(userId: string): void {
  // This cleanup only affects local/demo data. Persistent account deletion and
  // message retention are governed by database constraints and approved policy.
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
