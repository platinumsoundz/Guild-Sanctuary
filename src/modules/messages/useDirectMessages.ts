'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '@/types/database';
import { useAppContext } from '@/context/AppContext';
import { isSupabaseAuthConfigured } from '@/modules/auth';
import { subscribeToPersistentMessages } from './supabaseRepository';
import {
  createDirectConversation,
  fetchConversationMessagesSince,
  fetchConversationThread,
  sendConversationMessage,
} from './service';

interface UseDirectMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  pendingMessageIds: string[];
  error: string | null;
  send: (body: string) => Promise<boolean>;
}

const OPTIMISTIC_PREFIX = 'optimistic-message-';
let optimisticCounter = 0;

function isOptimisticMessage(id: string): boolean {
  return id.startsWith(OPTIMISTIC_PREFIX);
}

function createOptimisticId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${OPTIMISTIC_PREFIX}${crypto.randomUUID()}`;
  }
  optimisticCounter += 1;
  return `${OPTIMISTIC_PREFIX}${Date.now()}-${optimisticCounter}`;
}

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return [...byId.values()].sort(
    (first, second) => first.sentAt.localeCompare(second.sentAt) || first.id.localeCompare(second.id),
  );
}

export function useDirectMessages(peerUserId: string | null, selectedConversationId: string | null = null): UseDirectMessagesResult {
  const { currentUser } = useAppContext();
  const userId = currentUser?.user.id ?? '';
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [pendingMessageIds, setPendingMessageIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const activeConversationRef = useRef<string | null>(null);
  const syncingConversationRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const syncMessages = useCallback(async (id: string) => {
    if (!id || !userId || syncingConversationRef.current === id) {
      return;
    }

    syncingConversationRef.current = id;
    try {
      const latestPersisted = [...messagesRef.current].reverse().find((message) => !isOptimisticMessage(message.id));
      const missing = await fetchConversationMessagesSince(
        id,
        userId,
        latestPersisted ? { sentAt: latestPersisted.sentAt, id: latestPersisted.id } : null,
      );
      if (activeConversationRef.current !== id || missing.length === 0) {
        return;
      }
      setMessages((currentMessages) => mergeMessages(currentMessages, missing));
    } catch (syncError) {
      if (activeConversationRef.current === id) {
        setError(syncError instanceof Error ? syncError.message : 'Messages could not be synced.');
      }
    } finally {
      if (syncingConversationRef.current === id) {
        syncingConversationRef.current = null;
      }
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let openedConversationId: string | null = null;
    setIsLoading(true);
    setMessages([]);
    setPendingMessageIds([]);
    setError(null);
    setConversationId(null);
    activeConversationRef.current = null;

    const openThread = selectedConversationId
      ? fetchConversationThread(selectedConversationId, userId)
      : peerUserId
        ? createDirectConversation(userId, peerUserId)
        : Promise.reject(new Error('Choose a conversation to open.'));

    openThread.then((thread) => {
      if (cancelled) return;
      openedConversationId = thread.conversation.id;
      activeConversationRef.current = thread.conversation.id;
      setConversationId(thread.conversation.id);
      setMessages(thread.messages);
      setError(null);

      if (isSupabaseAuthConfigured()) {
        unsubscribe = subscribeToPersistentMessages(
          thread.conversation.id,
          (message) => {
            if (cancelled) return;
            setMessages((currentMessages) => mergeMessages(currentMessages, [message]));
          },
          (message) => {
            if (!cancelled) setError(message);
          },
          () => {
            if (!cancelled) void syncMessages(thread.conversation.id);
          },
        );
      }
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Conversation could not be opened.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (openedConversationId && activeConversationRef.current === openedConversationId) {
        activeConversationRef.current = null;
      }
    };
  }, [peerUserId, selectedConversationId, userId, syncMessages]);

  useEffect(() => {
    if (!conversationId) return;

    const handleOnline = () => {
      void syncMessages(conversationId);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncMessages(conversationId);
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [conversationId, syncMessages]);

  const send = async (body: string) => {
    if (!conversationId || !userId) {
      setError('Sign in to send messages.');
      return false;
    }

    const normalizedBody = body.trim();
    if (!normalizedBody) {
      setError('Write a message before sending.');
      return false;
    }

    const optimisticId = createOptimisticId();
    const optimisticMessage: Message = {
      id: optimisticId,
      conversationId,
      senderId: userId,
      body: normalizedBody,
      sentAt: new Date().toISOString(),
      readAt: null,
    };

    setMessages((currentMessages) => mergeMessages(currentMessages, [optimisticMessage]));
    setPendingMessageIds((currentIds) => [...currentIds, optimisticId]);
    setIsSending(true);
    setError(null);

    try {
      const message = await sendConversationMessage(conversationId, userId, normalizedBody);
      if (activeConversationRef.current === conversationId) {
        setMessages((currentMessages) => mergeMessages(
          currentMessages.filter((currentMessage) => currentMessage.id !== optimisticId),
          [message],
        ));
      }
      return true;
    } catch (sendError) {
      if (activeConversationRef.current === conversationId) {
        setMessages((currentMessages) => currentMessages.filter((currentMessage) => currentMessage.id !== optimisticId));
        setError(sendError instanceof Error ? sendError.message : 'Message could not be sent.');
      }
      return false;
    } finally {
      setPendingMessageIds((currentIds) => currentIds.filter((id) => id !== optimisticId));
      setIsSending(false);
    }
  };

  return { messages, isLoading, isSending, pendingMessageIds, error, send };
}
