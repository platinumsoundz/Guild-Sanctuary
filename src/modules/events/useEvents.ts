'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createEvent, deleteEvent, fetchEvents, setEventRsvp, updateEvent, type CreateEventInput, type EventView } from './service';

interface UseEventsResult {
  events: EventView[];
  isLoading: boolean;
  error: string | null;
  addEvent: (input: CreateEventInput) => Promise<void>;
  editEvent: (eventId: string, input: Pick<CreateEventInput, 'title' | 'description' | 'startsAt' | 'locationCoords' | 'locationLabel'>) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  rsvp: (eventId: string, status: 'going' | 'interested' | 'cancelled') => Promise<void>;
}

export function useEvents(userId: string): UseEventsResult {
  const [events, setEvents] = useState<EventView[]>([]);
  const [eventsUserId, setEventsUserId] = useState(userId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const sessionReady = eventsUserId === userId;
  const visibleEvents = sessionReady ? events : [];
  const visibleError = sessionReady ? error : null;

  const refresh = useCallback(async () => {
    const requestId = ++requestGeneration.current;
    const requestedUserId = userId;
    setIsLoading(true);
    try {
      const nextEvents = await fetchEvents(requestedUserId);
      if (requestId !== requestGeneration.current) return;
      setEvents(nextEvents);
      setError(null);
    } catch {
      if (requestId === requestGeneration.current) setError('Events could not be loaded.');
    } finally {
      if (requestId === requestGeneration.current) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setEventsUserId(userId);
    setEvents([]);
    setError(null);
    setIsLoading(true);
    void refresh();
    return () => { requestGeneration.current += 1; };
  }, [userId, refresh]);

  const addEvent = async (input: CreateEventInput) => {
    if (!sessionReady) throw new Error('Wait for your account events to finish loading.');
    const generation = requestGeneration.current;
    const event = await createEvent(input);
    if (generation !== requestGeneration.current) return;
    setEvents((current) => [...current, { ...event, rsvpCount: 0, viewerStatus: null }].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
  };
  const editEvent = async (eventId: string, input: Pick<CreateEventInput, 'title' | 'description' | 'startsAt' | 'locationCoords'>) => {
    if (!sessionReady) throw new Error('Wait for your account events to finish loading.');
    const generation = requestGeneration.current;
    const event = await updateEvent(eventId, userId, input);
    if (generation !== requestGeneration.current) return;
    setEvents((current) => current.map((item) => item.id === eventId ? { ...event, rsvpCount: item.rsvpCount, viewerStatus: item.viewerStatus } : item));
  };
  const removeEvent = async (eventId: string) => {
    if (!sessionReady) throw new Error('Wait for your account events to finish loading.');
    const generation = requestGeneration.current;
    await deleteEvent(eventId, userId);
    if (generation !== requestGeneration.current) return;
    setEvents((current) => current.filter((event) => event.id !== eventId));
  };
  const rsvp = async (eventId: string, status: 'going' | 'interested' | 'cancelled') => {
    if (!sessionReady) throw new Error('Wait for your account events to finish loading.');
    const generation = requestGeneration.current;
    const rsvpResult = await setEventRsvp(eventId, userId, status);
    if (generation !== requestGeneration.current) return;
    setEvents((current) => current.map((event) => event.id !== eventId ? event : {
      ...event,
      rsvpCount: event.rsvpCount + Number(rsvpResult.status === 'going') - Number(event.viewerStatus === 'going'),
      viewerStatus: rsvpResult.status,
    }));
  };
  return { events: visibleEvents, isLoading: !sessionReady || isLoading, error: visibleError, addEvent, editEvent, removeEvent, rsvp };
}
