import type { Event, EventRsvp } from '@/types/database';
import type { Database } from '@/services/supabase/database.types';

type EventRow = Database['public']['Tables']['events']['Row'];

export function toEvent(row: EventRow): Event {
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

export function toRsvp(row: Database['public']['Tables']['event_rsvps']['Row']): EventRsvp {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
