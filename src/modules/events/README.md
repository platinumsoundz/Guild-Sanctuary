# Events

Owns community-wide event creation, editing, deletion, RSVPs, likes, and comments. `useEvents` and `MeetupCalendarPlaceholder` operate on one Sanctuary event list; there is no world-scoped event data.

When Supabase is configured, `service.ts` reads and writes `events`, `event_rsvps`, `social_likes`, and `social_comments`. Aggregate “going” counts come from the `event_rsvp_counts` view because RSVP rows are intentionally visible only to their owner and moderators. Like counts come from `social_like_counts`. Realtime is not required for events; the UI refreshes after mutations.

The in-memory repository remains a development fallback when Supabase is not configured. Capacity rules, organizer notifications, recurring events, geospatial search, and production abuse controls remain future work.
