'use client';

import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    // Invalidate the previous thread immediately: a failed open or a slow request
    // must not leave the previous conversation available for sends or refreshes.
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
      if (!cancelled) {
        setConversationId(thread.conversation.id);
        setMessages(thread.messages);
        setError(null);
      }
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Conversation could not be opened.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [peerUserId, selectedConversationId, userId]);

  const refresh = useCallback(async () => {
    if (!conversationId || !userId) return;
    try {
      const thread = await fetchConversationThread(conversationId, userId);
      if (thread.conversation.id === conversationId) setMessages(thread.messages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Messages could not be loaded.');
    }
  }, [conversationId, userId]);

  const send = async (body: string) => {
    const sendingConversationId = conversationId;
    if (!sendingConversationId || !userId) {
      setError('Sign in to send messages.');
      return false;
    }
    setIsSending(true);
    setError(null);
    try {
      const message = await sendConversationMessage(sendingConversationId, userId, body);
      setMessages((currentMessages) => currentMessages.some((existing) => existing.id === message.id)
        ? currentMessages
        : [...currentMessages, message]);
      return true;
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Message could not be sent.');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!conversationId || !userId) return;
    let cancelled = false;
    let unsubscribe: () => void = () => {};

    void subscribeToConversationMessages(
      conversationId,
      userId,
      (incoming) => {
        setMessages((currentMessages) => currentMessages.some((message) => message.id === incoming.id)
          ? currentMessages
          : [...currentMessages, incoming]);
      },
      (subscriptionError) => setError(subscriptionError),
    ).then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    }).catch((subscriptionError) => {
      if (!cancelled) setError(subscriptionError instanceof Error
        ? subscriptionError.message
        : 'Live message updates could not be connected.');
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [conversationId, userId]);

  return { messages, isLoading, isSending, error, send };
}
