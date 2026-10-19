'use client';

import { useCallback, useEffect, useState } from 'react';
import { createEvent, deleteEvent, fetchEvents, setEventRsvp, updateEvent, type CreateEventInput, type EventView } from './service';

interface UseEventsResult {
  events: EventView[];
  isLoading: boolean;
  error: string | null;
  addEvent: (input: CreateEventInput) => Promise<void>;
  editEvent: (eventId: string, input: Pick<CreateEventInput, 'title' | 'description' | 'startsAt'>) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  rsvp: (eventId: string, status: 'going' | 'interested' | 'cancelled') => Promise<void>;
}

export function useEvents(userId: string): UseEventsResult {
  const [events, setEvents] = useState<EventView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setEvents(await fetchEvents(userId));
      setError(null);
    } catch {
      setError('Events could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addEvent = async (input: CreateEventInput) => {
    const event = await createEvent(input);
    setEvents((current) => [...current, { ...event, rsvpCount: 0, viewerStatus: null }].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
  };
  const editEvent = async (eventId: string, input: Pick<CreateEventInput, 'title' | 'description' | 'startsAt'>) => {
    const event = await updateEvent(eventId, userId, input);
    setEvents((current) => current.map((item) => item.id === eventId ? { ...event, rsvpCount: item.rsvpCount, viewerStatus: item.viewerStatus } : item));
  };
  const removeEvent = async (eventId: string) => {
    await deleteEvent(eventId, userId);
    setEvents((current) => current.filter((event) => event.id !== eventId));
  };
  const rsvp = async (eventId: string, status: 'going' | 'interested' | 'cancelled') => {
    const rsvpResult = await setEventRsvp(eventId, userId, status);
    setEvents((current) => current.map((event) => event.id !== eventId ? event : {
      ...event,
      rsvpCount: event.rsvpCount + Number(rsvpResult.status === 'going') - Number(event.viewerStatus === 'going'),
      viewerStatus: rsvpResult.status,
    }));
  };
  return { events, isLoading, error, addEvent, editEvent, removeEvent, rsvp };
}
