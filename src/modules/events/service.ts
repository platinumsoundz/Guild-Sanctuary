/**
 * Compatibility barrel for the events module.
 *
 * Implementation is split by responsibility:
 * - eventStore.ts: browser-local demo state, validation, and lookup
 * - eventMappers.ts: database row to domain object mapping
 * - eventService.ts: event reads, creation, editing, deletion, and RSVPs
 * - eventEngagement.ts: likes, comments, and account cleanup
 */
export type { CreateEventInput, EventView } from './eventService';
export {
  createEvent,
  deleteEvent,
  fetchEvents,
  setEventRsvp,
  updateEvent,
} from './eventService';
export {
  addEventComment,
  fetchEventComments,
  getEventEngagement,
  removeUserEventData,
  toggleEventLike,
} from './eventEngagement';
