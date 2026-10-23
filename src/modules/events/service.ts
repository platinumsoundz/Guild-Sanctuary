'use client';

import type { Coordinates } from '@/types';
import type { Event, EventRsvp, EventRsvpStatus, SocialComment, SocialLike } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import type { Database } from '@/services/supabase/database.types';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';

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

const events: Event[] = [];
const rsvps: EventRsvp[] = [];
const likes: SocialLike[] = [];
const comments: SocialComment[] = [];
let nextEventId = 1;
let nextRsvpId = 1;

type EventRow = Database['public']['Tables']['events']['Row'];

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description,
    locationCoords: { latitude: row.latitude, longitude: row.longitude },
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

function toRsvp(row: Database['public']['Tables']['event_rsvps']['Row']): EventRsvp {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

function validateEvent(title: string, description: string, startsAt: string): void {
  if (title.trim().length < 3 || title.trim().length > 100) {
    throw new Error('Event titles must be between 3 and 100 characters.');
  }
  if (description.trim().length > 2000) {
    throw new Error('Event descriptions cannot exceed 2,000 characters.');
  }
  if (!Number.isFinite(Date.parse(startsAt))) {
    throw new Error('Choose a valid event date and time.');
  }
}

function validateCoordinates(locationCoords: Coordinates): void {
  if (
    !Number.isFinite(locationCoords.latitude) ||
    locationCoords.latitude < -90 ||
    locationCoords.latitude > 90 ||
    !Number.isFinite(locationCoords.longitude) ||
    locationCoords.longitude < -180 ||
    locationCoords.longitude > 180
  ) {
    throw new Error('Enter valid latitude and longitude coordinates.');
  }
}

function findEvent(eventId: string): Event | undefined {
  return events.find((event) => event.id === eventId);
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
    const [countsResult, rsvpsResult] = await Promise.all([
      client.from('event_rsvp_counts').select('*').in('event_id', eventIds),
      userId
        ? client.from('event_rsvps').select('event_id, status').eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (countsResult.error) throw new Error(`Event RSVP totals could not be loaded: ${countsResult.error.message}`);
    if (rsvpsResult.error) throw new Error(`Your event RSVPs could not be loaded: ${rsvpsResult.error.message}`);
    const counts = new Map(countsResult.data.map((row) => [row.event_id, row.going_count]));
    const viewerStatuses = new Map(rsvpsResult.data.map((row) => [row.event_id, row.status as EventRsvpStatus]));
    return rows.map((row) => ({
      ...toEvent(row),
      rsvpCount: counts.get(row.id) ?? 0,
      viewerStatus: viewerStatuses.get(row.id) ?? null,
    }));
  }
  await delay();
  return events
    .slice()
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt))
    .map((event) => ({
      ...event,
      rsvpCount: rsvps.filter((rsvp) => rsvp.eventId === event.id && rsvp.status === 'going').length,
      viewerStatus: rsvps.find((rsvp) => rsvp.eventId === event.id && rsvp.userId === userId)?.status ?? null,
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
    id: `event-local-${nextEventId++}`,
    creatorId: input.creatorId,
    title: input.title.trim(),
    description: input.description.trim(),
    locationCoords: input.locationCoords,
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  return event;
}

export async function updateEvent(eventId: string, creatorId: string, input: Pick<CreateEventInput, 'title' | 'description' | 'startsAt'>): Promise<Event> {
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
  const index = events.findIndex((event) => event.id === eventId && event.creatorId === creatorId);
  if (index < 0) {
    throw new Error('This event could not be deleted.');
  }

  events.splice(index, 1);
  for (let idx = rsvps.length - 1; idx >= 0; idx -= 1) {
    if (rsvps[idx].eventId === eventId) rsvps.splice(idx, 1);
  }
}

export async function setEventRsvp(eventId: string, userId: string, status: 'going' | 'interested' | 'cancelled'): Promise<EventRsvp> {
  if (!userId) throw new Error('Sign in before responding to an event.');
  if (isSupabaseCommunityStorageConfigured()) {
    const currentUserId = await requireCommunityStorageUser(userId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('event_rsvps')
      .upsert({ event_id: eventId, user_id: currentUserId, status }, { onConflict: 'event_id,user_id' })
      .select('*')
      .single();
    if (error) throw new Error(`Your event RSVP could not be saved: ${error.message}`);
    return toRsvp(data);
  }
  if (!findEvent(eventId)) {
    throw new Error('This event is not available for RSVP.');
  }

  await delay();
  const existing = rsvps.find((rsvp) => rsvp.eventId === eventId && rsvp.userId === userId);
  if (existing) {
    existing.status = status;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const timestamp = new Date().toISOString();
  const rsvp: EventRsvp = {
    id: `rsvp-local-${nextRsvpId++}`,
    eventId,
    userId,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  rsvps.push(rsvp);
  return rsvp;
}

export async function getEventEngagement(eventId: string, userId: string) {
  if (!findEvent(eventId)) {
    throw new Error('This event is unavailable.');
  }
  return {
    liked: likes.some((like) => like.targetId === eventId && like.userId === userId),
    likesCount: likes.filter((like) => like.targetId === eventId).length,
    commentsCount: comments.filter((comment) => comment.targetId === eventId).length,
  };
}

export async function toggleEventLike(eventId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  if (!userId || !findEvent(eventId)) throw new Error('This event is unavailable for liking.');
  await delay();
  const existingIndex = likes.findIndex((like) => like.targetId === eventId && like.userId === userId);
  if (existingIndex >= 0) likes.splice(existingIndex, 1);
  else likes.push({ id: `event-like-${Date.now()}`, targetType: 'event', targetId: eventId, userId, createdAt: new Date().toISOString() });
  return { liked: existingIndex < 0, count: likes.filter((like) => like.targetId === eventId).length };
}

export async function fetchEventComments(eventId: string): Promise<SocialComment[]> {
  if (!findEvent(eventId)) throw new Error('Comments for this event are unavailable.');
  await delay();
  return comments.filter((comment) => comment.targetId === eventId).map((comment) => ({ ...comment }));
}

export async function addEventComment(eventId: string, authorId: string, body: string): Promise<SocialComment> {
  const normalizedBody = body.trim();
  if (!findEvent(eventId) || !authorId || normalizedBody.length < 1 || normalizedBody.length > 1000) {
    throw new Error('Comments must contain 1 to 1,000 characters.');
  }
  await delay();
  const comment: SocialComment = {
    id: `event-comment-${Date.now()}`,
    targetType: 'event',
    targetId: eventId,
    authorId,
    body: normalizedBody,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  return { ...comment };
}

export function removeUserEventData(userId: string): void {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].creatorId === userId) events.splice(index, 1);
  }
  for (let index = rsvps.length - 1; index >= 0; index -= 1) {
    if (rsvps[index].userId === userId) rsvps.splice(index, 1);
  }
}
