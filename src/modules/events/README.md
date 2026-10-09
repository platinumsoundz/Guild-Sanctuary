# Events

Owns event creation, editing, deletion, world-scoped event listings, RSVP state, event likes, and comment threads across the Sanctuary and Guild Hall. `useEvents` composes the mock repository for calendar UI.

Use the shared `Event`, `EventRsvp`, `Coordinates`, and `WorldType` contracts for cross-module data. The in-memory demo checks organizer ownership and coordinate ranges. Production needs server-side authorization, persistent event/RSVP data, unique RSVP constraints, capacity enforcement, and moderation.