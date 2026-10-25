import type { Coordinates } from '@/types';
import type { Event, EventRsvp, SocialComment, SocialLike } from '@/types/database';

export const eventStore = {
  events: [] as Event[],
  rsvps: [] as EventRsvp[],
  likes: [] as SocialLike[],
  comments: [] as SocialComment[],
  nextEventId: 1,
  nextRsvpId: 1,
};

export function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

export function validateEvent(title: string, description: string, startsAt: string): void {
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

export function validateCoordinates(locationCoords: Coordinates): void {
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

export function findEvent(eventId: string): Event | undefined {
  return eventStore.events.find((event) => event.id === eventId);
}
