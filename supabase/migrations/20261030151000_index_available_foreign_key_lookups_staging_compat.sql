-- Staging compatibility: this staging snapshot does not yet contain
-- platform_page_visibility or sanctuary_feedback. Index only the tables present.
create index if not exists moderation_user_notifications_actor_id_idx
  on public.moderation_user_notifications (actor_id);

create index if not exists stripe_payment_entitlements_user_id_idx
  on public.stripe_payment_entitlements (user_id);
