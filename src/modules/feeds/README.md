# Feeds

Owns The Sanctuary's unified post feed, composer, post editing/deletion, likes, and comments. `Feed` is the supported page component; `useFeed` and `service.ts` operate on one community-wide feed with no world selector.

The local repository is demo-only. When the optional Supabase adapter is configured, it reads and writes authenticated `posts`, media paths, likes, and comments. A production rollout still needs complete Auth/RLS, media processing, pagination, moderation, rate limits, and storage validation.
