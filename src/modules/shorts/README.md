# Shorts

Owns the short-form video feed, local file/recording composer, playback, likes, comments, and reporting. The module supports Sanctuary/Guild world scoping; preserve that boundary in all database queries, media paths, signed URLs, comments, reactions, and moderation actions.

Current known experience: vertical clip cards, in-view playback, upload/recording, captions, likes, comments with edit/delete, and reporting. Supabase media storage is optional and uses signed playback URLs. The current upload limit is a hard-coded 5 MB and is not a production media pipeline.

Production gaps include configurable size/duration/quota enforcement, server-side media validation and scanning, transcoding/adaptive delivery, poster generation, creator profiles/library/drafts, feed modes and pagination, save/share actions, accessibility/data-saver controls, and verified RPC/RLS behaviour. Regression-test `get_short_engagement_stats` and related engagement RPCs before release.

See `docs/EVENTS_SHORTS_OVERHAUL.md` for the acceptance contract and delivery gates.
