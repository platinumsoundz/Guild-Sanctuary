'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Message } from '@/types/database';
import { useAppContext } from '@/context/AppContext';
import { fetchConversationThread, openDirectConversation, sendConversationMessage } from './service';

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
    setIsLoading(true);
    setMessages([]);
    const openThread = selectedConversationId
      ? fetchConversationThread(selectedConversationId, userId)
      : peerUserId
        ? openDirectConversation(userId, peerUserId)
        : Promise.reject(new Error('Choose a conversation to open.'));
    openThread
      .then((thread) => {
        if (!cancelled) {
          setConversationId(thread.conversation.id);
          setMessages(thread.messages);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Conversation could not be opened.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [peerUserId, selectedConversationId, userId]);

  const refresh = useCallback(async () => {
    if (!conversationId || !userId) {
      return;
    }
    try {
      setMessages((await fetchConversationThread(conversationId, userId)).messages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Messages could not be loaded.');
    }
  }, [conversationId, userId]);

  const send = async (body: string) => {
    if (!conversationId || !userId) {
      setError('Sign in to send messages.');
      return false;
    }

    setIsSending(true);
    setError(null);
    try {
      const message = await sendConversationMessage(conversationId, userId, body);
      setMessages((currentMessages) => [...currentMessages, message]);
      return true;
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Message could not be sent.');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { messages, isLoading, isSending, error, send };
}