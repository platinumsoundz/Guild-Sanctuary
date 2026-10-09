import type { Coordinates, WorldType } from '@/types';
import type { Event, EventRsvp, EventRsvpStatus, SocialComment, SocialLike } from '@/types/database';

export interface CreateEventInput {
  creatorId: string;
  worldType: WorldType;
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

const eventsByWorld: Record<WorldType, Event[]> = {
  sanctuary: [],
  guild: [],
};
const rsvps: EventRsvp[] = [];
const likes: SocialLike[] = [];
const comments: SocialComment[] = [];
let nextEventId = 1;
let nextRsvpId = 1;
let nextEngagementId = 1;

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
  return Object.values(eventsByWorld).flat().find((event) => event.id === eventId);
}

export async function fetchEvents(worldType: WorldType, userId: string): Promise<EventView[]> {
  await delay();
  return eventsByWorld[worldType]
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

  await delay();
  const event: Event = {
    id: `event-local-${nextEventId++}`,
    creatorId: input.creatorId,
    title: input.title.trim(),
    description: input.description.trim(),
    worldType: input.worldType,
    locationCoords: input.locationCoords,
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    createdAt: new Date().toISOString(),
  };
  eventsByWorld[input.worldType].push(event);
  return event;
}

export async function updateEvent(eventId: string, creatorId: string, input: Pick<CreateEventInput, 'title' | 'description' | 'startsAt'>): Promise<Event> {
  validateEvent(input.title, input.description, input.startsAt);
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
  await delay();
  const worldEvents = Object.values(eventsByWorld).find((items) => items.some((event) => event.id === eventId && event.creatorId === creatorId));
  const index = worldEvents?.findIndex((event) => event.id === eventId && event.creatorId === creatorId) ?? -1;
  if (!worldEvents || index < 0) {
    throw new Error('This event could not be deleted.');
  }

  worldEvents.splice(index, 1);
  for (let index = rsvps.length - 1; index >= 0; index -= 1) {
    if (rsvps[index].eventId === eventId) rsvps.splice(index, 1);
  }
  for (let index = likes.length - 1; index >= 0; index -= 1) {
    if (likes[index].targetId === eventId) likes.splice(index, 1);
  }
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    if (comments[index].targetId === eventId) comments.splice(index, 1);
  }
}

export async function setEventRsvp(eventId: string, userId: string, status: 'going' | 'interested' | 'cancelled'): Promise<EventRsvp> {
  if (!userId || !findEvent(eventId)) {
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
  if (!userId || !findEvent(eventId)) {
    throw new Error('This event is unavailable for liking.');
  }
  await delay();
  const existingIndex = likes.findIndex((like) => like.targetId === eventId && like.userId === userId);
  if (existingIndex >= 0) {
    likes.splice(existingIndex, 1);
  } else {
    likes.push({
      id: `event-like-${nextEngagementId++}`,
      targetType: 'event',
      targetId: eventId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  return { liked: existingIndex < 0, count: likes.filter((like) => like.targetId === eventId).length };
}

export async function fetchEventComments(eventId: string): Promise<SocialComment[]> {
  if (!findEvent(eventId)) {
    throw new Error('Comments for this event are unavailable.');
  }
  await delay();
  return comments.filter((comment) => comment.targetId === eventId).map((comment) => ({ ...comment }));
}

export async function addEventComment(eventId: string, authorId: string, body: string): Promise<SocialComment> {
  const normalizedBody = body.trim();
  if (!authorId || !findEvent(eventId) || normalizedBody.length < 1 || normalizedBody.length > 1000) {
    throw new Error('Comments must contain 1 to 1,000 characters.');
  }
  await delay();
  const comment: SocialComment = {
    id: `event-comment-${nextEngagementId++}`,
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
  const removedEventIds = new Set(Object.values(eventsByWorld).flat().filter((event) => event.creatorId === userId).map((event) => event.id));
  for (const worldEvents of Object.values(eventsByWorld)) {
    for (let index = worldEvents.length - 1; index >= 0; index -= 1) {
      if (worldEvents[index].creatorId === userId) worldEvents.splice(index, 1);
    }
  }
  for (let index = rsvps.length - 1; index >= 0; index -= 1) {
    if (rsvps[index].userId === userId || removedEventIds.has(rsvps[index].eventId)) rsvps.splice(index, 1);
  }
  for (let index = likes.length - 1; index >= 0; index -= 1) {
    if (likes[index].userId === userId || removedEventIds.has(likes[index].targetId)) likes.splice(index, 1);
  }
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    if (comments[index].authorId === userId || removedEventIds.has(comments[index].targetId)) comments.splice(index, 1);
  }
}
