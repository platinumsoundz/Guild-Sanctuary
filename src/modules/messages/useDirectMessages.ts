'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '@/types/database';
import { useAppContext } from '@/context/AppContext';
import { fetchConversationThread, createDirectConversation, sendConversationMessage, subscribeToConversationMessages } from './service';

interface UseDirectMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  send: (body: string) => Promise<boolean>;
}

export function useDirectMessages(peerUserId: string | null, selectedConversationId: string | null = null): UseDirectMessagesResult {
  const { currentUser } = useAppContext();
  const userId = currentUser?.user.id ?? '';
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRequest = useRef(0);
  const activeConversationId = useRef<string | null>(null);

  useEffect(() => {
    const requestId = ++threadRequest.current;
    let cancelled = false;
    activeConversationId.current = null;
    setConversationId(null);
    setIsLoading(true);
    setIsSending(false);
    setMessages([]);
    setError(null);

    const openThread = selectedConversationId
      ? fetchConversationThread(selectedConversationId, userId)
      : peerUserId
        ? createDirectConversation(userId, peerUserId)
        : Promise.reject(new Error('Choose a conversation to open.'));
    openThread.then((thread) => {
      if (!cancelled && requestId === threadRequest.current) {
        activeConversationId.current = thread.conversation.id;
        setConversationId(thread.conversation.id);
        setMessages(thread.messages);
        setError(null);
      }
    }).catch((loadError) => {
      if (!cancelled && requestId === threadRequest.current) {
        setError(loadError instanceof Error ? loadError.message : 'Conversation could not be opened.');
      }
    }).finally(() => {
      if (!cancelled && requestId === threadRequest.current) setIsLoading(false);
    });
    return () => {
      cancelled = true;
      if (threadRequest.current === requestId) threadRequest.current += 1;
    };
  }, [peerUserId, selectedConversationId, userId]);

  const refresh = useCallback(async () => {
    const requestedConversationId = conversationId;
    const requestedThread = threadRequest.current;
    if (!requestedConversationId || !userId) return;
    try {
      const thread = await fetchConversationThread(requestedConversationId, userId);
      if (
        activeConversationId.current === requestedConversationId &&
        threadRequest.current === requestedThread &&
        thread.conversation.id === requestedConversationId
      ) {
        setMessages((currentMessages) => {
          const byId = new Map(currentMessages.map((message) => [message.id, message]));
          for (const message of thread.messages) byId.set(message.id, message);
          return [...byId.values()].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
        });
      }
    } catch (loadError) {
      if (activeConversationId.current === requestedConversationId && threadRequest.current === requestedThread) {
        setError(loadError instanceof Error ? loadError.message : 'Messages could not be loaded.');
      }
    }
  }, [conversationId, userId]);

  const send = async (body: string) => {
    const sendingConversationId = conversationId;
    const sendingThread = threadRequest.current;
    if (!sendingConversationId || !userId || activeConversationId.current !== sendingConversationId) {
      setError('Open a conversation and sign in before sending messages.');
      return false;
    }
    setIsSending(true);
    setError(null);
    try {
      const message = await sendConversationMessage(sendingConversationId, userId, body);
      if (
        activeConversationId.current === sendingConversationId &&
        threadRequest.current === sendingThread
      ) {
        setMessages((currentMessages) => currentMessages.some((existing) => existing.id === message.id)
          ? currentMessages
          : [...currentMessages, message].sort((a, b) => a.sentAt.localeCompare(b.sentAt)));
      }
      return true;
    } catch (sendError) {
      if (activeConversationId.current === sendingConversationId && threadRequest.current === sendingThread) {
        setError(sendError instanceof Error ? sendError.message : 'Message could not be sent.');
      }
      return false;
    } finally {
      if (activeConversationId.current === sendingConversationId && threadRequest.current === sendingThread) {
        setIsSending(false);
      }
    }
  };

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!conversationId || !userId || activeConversationId.current !== conversationId) return;
    let cancelled = false;
    let unsubscribe: () => void = () => {};

    void subscribeToConversationMessages(
      conversationId,
      userId,
      (incoming) => {
        if (activeConversationId.current !== conversationId) return;
        setMessages((currentMessages) => currentMessages.some((message) => message.id === incoming.id)
          ? currentMessages
          : [...currentMessages, incoming].sort((a, b) => a.sentAt.localeCompare(b.sentAt)));
      },
      (subscriptionError) => {
        if (activeConversationId.current === conversationId) setError(subscriptionError);
      },
    ).then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    }).catch((subscriptionError) => {
      if (!cancelled && activeConversationId.current === conversationId) {
        setError(subscriptionError instanceof Error
          ? subscriptionError.message
          : 'Live message updates could not be connected.');
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [conversationId, userId]);

  return { messages, isLoading, isSending, error, send };
}
