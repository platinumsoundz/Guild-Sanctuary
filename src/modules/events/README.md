# Events

Owns event discovery, creation/editing/deletion, RSVPs, event reactions, and comments. The current experience is rendered by `MeetupCalendarPlaceholder`; the component name is legacy and should be renamed as part of the Events UX rebuild.

The service supports Sanctuary/Guild world scoping when reading and mutating event records. Keep the active `world_type` explicit through every query, mutation, RSVP, engagement action, notification, and moderation flow.

Current known experience: event list, map-pin explorer, nearby coordinate matching, create/edit form, RSVP actions, comments/reactions, and reporting. Current gaps to close in the overhaul include venue/address and online-event support, categories/search/calendar views, full event detail, privacy/visibility controls, capacity/waitlist, organiser management, reminders, and production-grade validation/notifications.

See `docs/EVENTS_SHORTS_OVERHAUL.md` for the acceptance contract and delivery gates.
