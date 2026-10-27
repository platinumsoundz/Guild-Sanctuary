# Settings

Owns the account settings hub, persisted account preferences, profile privacy controls, social-link editing, layout selection, and the account-deletion confirmation UI.

## Persistence

- With Supabase configured, account preferences are loaded from and saved to `public.account_settings`; profile privacy and social-link fields are saved through the authenticated profile path.
- In local/demo mode without Supabase configuration, settings use browser-local storage. That fallback is not production-grade storage and must not be confused with server persistence.
- The direct-message privacy toggle is live. The saved `allowDirectMessages` preference is authoritative for conversation creation and is synchronized to the profile privacy fields by a database trigger.
- Profile discovery and layout selection are persisted through the configured account settings/profile path.

## Intentionally unavailable preferences

These are shown as disabled/coming soon and are not functional yet:
- Show my online status
- Email notifications
- Personalize my feed

Do not enable these controls until their backend behavior and privacy expectations are implemented and tested.

## Account deletion boundary

The Settings screen does not currently provide a production server-side account deletion workflow. Its confirmation UI is not proof of server-authorized reauthentication, auditable erasure, or policy-compliant retention. Implement deletion only with a server-authorized step-up challenge and explicit cascading erasure/retention rules.
