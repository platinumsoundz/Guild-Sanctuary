# Connection discovery database integration handoff — 2026-10-28

Status: application and proposed migration work is on the feature branch; **nothing in this handoff confirms that the migrations have been applied to the connected Supabase project**.

## Migration sequence in this branch

1. `20261028150000_member_discovery_interests.sql` — member-owned interest tags, opt-in public visibility, and RLS.
2. `20261028170000_connection_relationships.sql` — follows, connection requests, blocks, saved/hidden profiles, public intentions, RLS, and relationship/message/content guard triggers.
3. `20261028180000_add_profile_report_target.sql` — adds the `user` value to the existing report-target enum.
4. `20261028180100_profile_report_rpc.sql` — extends report submission and target-owner lookup to handle profile reports.

The enum extension is intentionally separate from the function migration so the new enum value is committed before later SQL references it. Do not reorder or squash these migrations without checking PostgreSQL enum transaction behavior and the actual migration ledger.

## Required connected-project review

Before applying anything, the Supabase-connected agent must:

- Compare every version in this sequence against `supabase_migrations.schema_migrations` and the real schema; do not blindly replay or mark versions applied.
- Verify referenced objects and column names exist in the target project: `private.public_profile_projection`, `private.is_profile_blocked`, relationship guard/cleanup functions, message tables, report enums, report RPCs, notification types, and content visibility helpers.
- Review RLS and grants for each new table, including direct table access, RPC execute grants, and the ability to forge relationship rows or respond to another member's request.
- Verify block semantics in both directions across profile discovery, follows, connection requests, messages/conversations, posts, shorts, events, and comments. Confirm unblocking does not accidentally restore deleted relationships or bypass privacy settings.
- Review the profile-report RPC's behavior for messages and deleted/hidden targets, its rate limit, conflict behavior, and whether its replacement function signature/ownership/grants match the existing production definition.
- Run the included static contract check and pgTAP tests in a disposable/staging database; add authenticated multi-account tests for request/accept/decline, follow/unfollow, block/unblock, privacy visibility, report submission, and notification recipients.
- Capture evidence for migration order, test output, and rollback/recovery. Keep this PR draft until the database review and staging checks pass.

## Current automated evidence

The latest feature-branch GitHub CI run passed at `70b1bc5f906aa300396802ce4635f5b3deb5a3c3`, including static discovery checks, TypeScript typecheck, and build. These checks validate source contracts only; they do not execute the SQL against Supabase and are not proof of live RLS behavior.

## Security boundary

Do not treat browser localStorage fallback or hidden UI controls as a security boundary. Production privacy must be enforced by the connected database policies/functions and validated with multiple authenticated accounts. Do not apply migrations or change production roles/grants from a session without the Supabase connection.
