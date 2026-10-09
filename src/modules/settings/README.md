# Settings

Owns the account settings hub, persisted account preferences, profile privacy controls, social-link editing, layout selection, and account deletion confirmation UI. Social URLs are limited to HTTPS profile pages on Facebook, X/Twitter, and YouTube. Account deletion requires the active demo session, matching email, exact `DELETE` phrase, and the demo second-factor code when 2FA is enabled.

Settings currently use browser-local storage. This is not production-grade reauthentication or server-side data erasure; production must use a server-authorized step-up challenge and a deletion workflow with auditable cascading erasure/retention policies.
