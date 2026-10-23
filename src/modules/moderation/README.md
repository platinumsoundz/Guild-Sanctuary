# Moderation

Owns community reports, the moderator queue, and audited moderation actions. `ReportContentButton` lets members report posts, shorts, events, or messages. `ModerationDashboard` is mounted in the main navigation only for sessions whose `profile.role` is `moderator` or `admin`.

The module relies on Supabase for the moderation queue and actions. `submit_content_report` and `apply_moderation_action` are security-definer RPCs that re-check the caller's active status and protected role, enforce report rate limits, and append audit evidence. The browser cannot update `profiles.role`.

The dashboard is intentionally unavailable when Supabase is not configured. Do not replace the RPCs with client-side authorization checks. Production operations still need a documented escalation policy, retention rules, appeal handling, and regular audit-log review.
