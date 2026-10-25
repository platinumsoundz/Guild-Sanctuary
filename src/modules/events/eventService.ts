'use client';

import type { Coordinates } from '@/types';
import type { Event, EventRsvp, EventRsvpStatus } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';
import { toEvent, toRsvp } from './eventMappers';
import {
  delay,
  eventStore,
  findEvent,
  validateCoordinates,
  validateEvent,
} from './eventStore';

export interface CreateEventInput {
  creatorId: string;
  title: string;
  description: string;
  locationCoords: Coordinates;
  startsAt: string;
  endsAt?: string | null;
}

export interface EventView extends Event {
  rsvpCount: number;
  viewerStatus: EventRsvpStatus | null;
}

export async function fetchEvents(userId: string): Promise<EventView[]> {
  if (isSupabaseCommunityStorageConfigured()) {
    const client = getSupabaseBrowserClient();
    const { data: rows, error } = await client
      .from('events')
      .select('*')
      .eq('state', 'visible')
      .order('starts_at', { ascending: true });
    if (error) throw new Error(`Events could not be loaded: ${error.message}`);

    if (rows.length === 0) return [];
    const eventIds = rows.map((row) => row.id);
    const { data: countRows, error: countsError } = await client
      .from('event_rsvp_counts')
      .select('*')
      .in('event_id', eventIds);
    if (countsError) throw new Error(`Event RSVP totals could not be loaded: ${countsError.message}`);

    let viewerRsvpRows: { event_id: string; status: string }[] = [];
    if (userId) {
      const { data, error: rsvpError } = await client
        .from('event_rsvps')
        .select('event_id, status')
        .eq('user_id', userId);
      if (rsvpError) throw new Error(`Your event RSVPs could not be loaded: ${rsvpError.message}`);
      viewerRsvpRows = data;
    }
    const counts = new Map(countRows.map((row) => [row.event_id, row.going_count]));
    const viewerStatuses = new Map(viewerRsvpRows.map((row) => [row.event_id, row.status as EventRsvpStatus]));
    return rows.map((row) => ({
      ...toEvent(row),
      rsvpCount: counts.get(row.id) ?? 0,
      viewerStatus: viewerStatuses.get(row.id) ?? null,
    }));
  }
  await delay();
  return eventStore.events
    .slice()
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt))
    .map((event) => ({
      ...event,
      rsvpCount: eventStore.rsvps.filter((rsvp) => rsvp.eventId === event.id && rsvp.status === 'going').length,
      viewerStatus: eventStore.rsvps.find((rsvp) => rsvp.eventId === event.id && rsvp.userId === userId)?.status ?? null,
    }));
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  validateEvent(input.title, input.description, input.startsAt);
  validateCoordinates(input.locationCoords);
  if (!input.creatorId) {
    throw new Error('Sign in before creating an event.');
  }

  if (isSupabaseCommunityStorageConfigured()) {
    const userId = await requireCommunityStorageUser(input.creatorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('events')
      .insert({
        creator_id: userId,
        title: input.title.trim(),
        description: input.description.trim(),
        latitude: input.locationCoords.latitude,
        longitude: input.locationCoords.longitude,
        starts_at: new Date(input.startsAt).toISOString(),
        ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
      })
      .select('*')
      .single();
    if (error) throw new Error(`Event could not be saved: ${error.message}`);
    return toEvent(data);
  }

  await delay();
  const event: Event = {
    id: `event-local-${eventStore.nextEventId++}`,
    creatorId: input.creatorId,
    title: input.title.trim(),
    description: input.description.trim(),
    locationCoords: input.locationCoords,
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    createdAt: new Date().toISOString(),
  };
  eventStore.events.push(event);
  return event;
}

export async function updateEvent(
  eventId: string,
  creatorId: string,
  input: Pick<CreateEventInput, 'title' | 'description' | 'startsAt'>,
): Promise<Event> {
  validateEvent(input.title, input.description, input.startsAt);
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(creatorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('events')
      .update({
        title: input.title.trim(),
        description: input.description.trim(),
        starts_at: new Date(input.startsAt).toISOString(),
      })
      .eq('id', eventId)
      .eq('creator_id', creatorId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`Event could not be updated: ${error.message}`);
    if (!data) throw new Error('This event could not be updated.');
    return toEvent(data);
  }
  await delay();
  const event = findEvent(eventId);
  if (!event || event.creatorId !== creatorId) {
    throw new Error('This event could not be updated.');
  }

  event.title = input.title.trim();
  event.description = input.description.trim();
  event.startsAt = new Date(input.startsAt).toISOString();
  return event;
}

export async function deleteEvent(eventId: string, creatorId: string): Promise<void> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(creatorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('creator_id', creatorId)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Event could not be deleted: ${error.message}`);
    if (!data) throw new Error('This event could not be deleted.');
    return;
  }
  await delay();
  const index = eventStore.events.findIndex((event) => event.id === eventId && event.creatorId === creatorId);
  if (index < 0) {
    throw new Error('This event could not be deleted.');
  }

  eventStore.events.splice(index, 1);
  for (let idx = eventStore.rsvps.length - 1; idx >= 0; idx -= 1) {
    if (eventStore.rsvps[idx].eventId === eventId) eventStore.rsvps.splice(idx, 1);
  }
}

export async function setEventRsvp(
  eventId: string,
  userId: string,
  status: 'going' | 'interested' | 'cancelled',
): Promise<EventRsvp> {
  if (!userId) throw new Error('Sign in before responding to an event.');
  if (isSupabaseCommunityStorageConfigured()) {
    const currentUserId = await requireCommunityStorageUser(userId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('event_rsvps')
      .upsert({ event_id: eventId, user_id: currentUserId, status, updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' })
      .select('*')
      .single();
    if (error) throw new Error(`Your event RSVP could not be saved: ${error.message}`);
    return toRsvp(data);
  }
  if (!findEvent(eventId)) {
    throw new Error('This event is not available for RSVP.');
  }

  await delay();
  const existing = eventStore.rsvps.find((rsvp) => rsvp.eventId === eventId && rsvp.userId === userId);
  if (existing) {
    existing.status = status;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const timestamp = new Date().toISOString();
  const rsvp: EventRsvp = {
    id: `rsvp-local-${eventStore.nextRsvpId++}`,
    eventId,
    userId,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  eventStore.rsvps.push(rsvp);
  return rsvp;
}
