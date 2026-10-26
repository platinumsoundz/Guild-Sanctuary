'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, Heart, MessageCircle, X } from 'lucide-react';
import { useAppContext, type NavigationState } from '@/context/AppContext';
import { getSupabaseBrowserClient } from '@/services/supabase';
import styles from './NotificationBar.module.css';

type NotificationItem = {
  id: string;
  actor_id: string;
  notification_type: 'like' | 'comment';
  target_type: 'post' | 'short' | 'event';
  target_id: string;
  created_at: string;
  read_at: string | null;
  actorName: string;
  username: string;
};

const destinationFor: Record<NotificationItem['target_type'], NavigationState> = {
  post: 'feed',
  short: 'shorts',
  event: 'events',
};

export function NotificationBar() {
  const { currentUser, isGuest, setActiveNavigation } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!currentUser || isGuest || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setItems([]);
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.id !== currentUser.user.id) {
        setItems([]);
        setIsConnected(false);
        setError(null);
        return;
      }

      const { data, error: queryError } = await client
        .from('notifications')
        .select('id,actor_id,notification_type,target_type,target_id,created_at,read_at')
        .eq('recipient_id', currentUser.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (queryError) throw queryError;

      const actorIds = [...new Set((data ?? []).map((item) => item.actor_id))];
      const actorNames = new Map<string, { displayName: string; username: string }>();
      if (actorIds.length) {
        const { data: actors, error: actorsError } = await client
          .from('public_profiles')
          .select('id,display_name,username')
          .in('id', actorIds);
        if (actorsError) throw actorsError;
        for (const actor of actors ?? []) {
          actorNames.set(actor.id, {
            displayName: actor.display_name || actor.username,
            username: actor.username,
          });
        }
      }

      setItems((data ?? []).map((item) => {
        const actor = actorNames.get(item.actor_id);
        return {
          ...item,
          actorName: actor?.displayName ?? 'A community member',
          username: actor?.username ?? '',
        };
      }));
      setIsConnected(true);
      setError(null);
    } catch {
      setError('Notifications could not be loaded right now.');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isGuest]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = items.filter((item) => !item.read_at).length;

  const markRead = async (item: NotificationItem) => {
    if (!currentUser || item.read_at) return;
    try {
      const client = getSupabaseBrowserClient();
      const readAt = new Date().toISOString();
      const { error: updateError } = await client
        .from('notifications')
        .update({ read_at: readAt })
        .eq('id', item.id)
        .eq('recipient_id', currentUser.user.id);
      if (updateError) throw updateError;
      setItems((previous) => previous.map((entry) => entry.id === item.id ? { ...entry, read_at: readAt } : entry));
    } catch {
      setError('This notification could not be marked as read.');
    }
  };

  const markAllRead = async () => {
    if (!currentUser || unreadCount === 0) return;
    try {
      const client = getSupabaseBrowserClient();
      const readAt = new Date().toISOString();
      const { error: updateError } = await client
        .from('notifications')
        .update({ read_at: readAt })
        .eq('recipient_id', currentUser.user.id)
        .is('read_at', null);
      if (updateError) throw updateError;
      setItems((previous) => previous.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
      setError(null);
    } catch {
      setError('Notifications could not be marked as read.');
    }
  };

  const openNotification = async (item: NotificationItem) => {
    await markRead(item);
    setIsOpen(false);
    setActiveNavigation(destinationFor[item.target_type]);
  };

  if (!currentUser || isGuest) return null;

  return (
    <aside className={styles.bar} aria-label="Notifications">
      <div className={styles.inner}>
        <span className={styles.label}>COMMUNITY ACTIVITY</span>
        <div className={styles.actions}>
          {isConnected && unreadCount > 0 && (
            <span className={styles.unreadSummary}>{unreadCount} unread</span>
          )}
          <button
            type="button"
            className={styles.bellButton}
            aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            aria-expanded={isOpen}
            aria-controls="sanctuary-notification-panel"
            onClick={() => {
              setIsOpen((open) => !open);
              if (!isOpen) void loadNotifications();
            }}
          >
            <Bell size={17} aria-hidden="true" />
            <span>Notifications</span>
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        </div>
      </div>

      {isOpen && (
        <section id="sanctuary-notification-panel" className={styles.panel} aria-label="Recent notifications">
          <header className={styles.panelHeader}>
            <div>
              <h2>Notifications</h2>
              <p>Likes and comments on your community posts.</p>
            </div>
            <div className={styles.panelActions}>
              {isConnected && unreadCount > 0 && (
                <button type="button" className={styles.markAllButton} onClick={() => void markAllRead()}>
                  <CheckCheck size={15} aria-hidden="true" /> Mark all read
                </button>
              )}
              <button type="button" className={styles.closeButton} aria-label="Close notifications" onClick={() => setIsOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          {isGuest ? (
            <p className={styles.emptyState}>Guest mode is for exploring. Sign in to receive personal notifications.</p>
          ) : !isConnected && !isLoading ? (
            <p className={styles.emptyState}>Sign in with your connected Sanctuary account to enable notifications.</p>
          ) : isLoading && items.length === 0 ? (
            <p className={styles.emptyState}>Loading notifications…</p>
          ) : error ? (
            <p className={styles.error} role="alert">{error}</p>
          ) : items.length === 0 ? (
            <p className={styles.emptyState}>You're all caught up. New likes and comments will appear here.</p>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${item.read_at ? '' : styles.unread}`}
                    onClick={() => void openNotification(item)}
                  >
                    <span className={styles.itemIcon} aria-hidden="true">
                      {item.notification_type === 'like' ? <Heart size={17} /> : <MessageCircle size={17} />}
                    </span>
                    <span className={styles.itemCopy}>
                      <span><strong>{item.actorName}</strong> {item.notification_type === 'like' ? 'liked your' : 'commented on your'} {item.target_type === 'short' ? 'Short' : item.target_type}.</span>
                      <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </span>
                    {!item.read_at && <span className={styles.unreadDot} aria-label="Unread" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </aside>
  );
}
