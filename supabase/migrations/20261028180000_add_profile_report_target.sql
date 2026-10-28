-- Add profile-level reports in a separate migration so the new enum value
-- is committed before later migrations reference it in function bodies.
alter type public.report_target_type add value if not exists 'user';
