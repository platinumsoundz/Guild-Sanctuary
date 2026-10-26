# Moderation

Owns community reports, the moderator queue, and audited moderation actions. `ReportContentButton` lets members report posts, shorts, events, or messages. `ModerationDashboard` is mounted in the main navigation only for sessions whose `profile.role` is `moderator` or `admin`.

The module relies on Supabase for the moderation queue and actions. `submit_content_report` and `apply_moderation_action` are security-definer RPCs that re-check the caller's active status and protected role, enforce report rate limits, and append audit evidence. The browser cannot update `profiles.role`.

The dashboard has five tabs:

- **Reports** — open/reviewing reports with hide, remove, warn, temporary suspend, and ban actions.
- **Members** — moderator search by username/display name, wallet and spend history, internal notes, account actions, and admin-only role changes. Administrators cannot change their own role, and the last administrator cannot be demoted.
- **Appeals** — member appeals with resolution notes. Members submit appeals from Settings.
- **Refund reviews** — refund/chargeback cases where tokens had already been spent, plus partial refunds/disputes that need a manual decision.
- **Audit log** — recent audit events with actor, subject, and details.

The supporting RPCs are `submit_moderation_appeal`, `fetch_my_moderation_appeals`, `admin_list_appeals`, `admin_resolve_appeal`, `admin_search_members`, `admin_member_overview`, `admin_set_member_role`, `admin_add_member_note`, `admin_list_audit_events`, `admin_list_purchase_reviews`, and `admin_resolve_purchase_review`. Role checks use `current_moderation_role()` instead of the older `is_moderator()` so the module works on partially migrated projects. The migration is unapplied, so none of this has been validated against a live project.

The dashboard is intentionally unavailable when Supabase is not configured. Do not replace the RPCs with client-side authorization checks. Production operations still need a documented escalation policy, retention rules, appeal handling, and regular audit-log review.
