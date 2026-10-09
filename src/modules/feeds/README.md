# Feeds

Owns the Sanctuary and Guild Hall feed experiences, post presentation, CRUD service, likes/comments, and `useFeed` hook. Posts are tagged with the active `WorldType`; the UI supports create, edit, delete, likes, and comment threads. Posts display author identity, timestamp, story tags, image attachments, MP3 audio, and MP4 video controls. The composer accepts image/audio/video URLs or small local uploads.

Use the `src/modules/feeds/index.ts` entry point to compose feed views. Posts use the shared `Post` and `WorldType` contracts from `src/types`; sibling module internals are not dependencies. Media data URLs and posts are demo-only in-memory state; production must use managed media storage and enforce authorization, upload scanning, and moderation on the server.