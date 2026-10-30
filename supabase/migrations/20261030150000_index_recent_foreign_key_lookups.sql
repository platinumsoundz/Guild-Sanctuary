-- Add covering indexes for foreign-key lookups identified by Supabase Performance Advisor.
-- These indexes are additive and preserve all existing data and access policies.

create index if not exists moderation_user_notifications_actor_id_idx
  on public.moderation_user_notifications (actor_id);

create index if not exists platform_page_visibility_updated_by_idx
  on public.platform_page_visibility (updated_by);

create index if not exists sanctuary_feedback_submitted_by_idx
  on public.sanctuary_feedback (submitted_by);

create index if not exists stripe_payment_entitlements_user_id_idx
  on public.stripe_payment_entitlements (user_id);
