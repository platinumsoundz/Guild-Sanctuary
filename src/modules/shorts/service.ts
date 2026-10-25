/**
 * Compatibility barrel for the shorts module.
 *
 * Implementation is split by responsibility:
 * - shortsStore.ts: browser-local demo state and lookup
 * - shortVideoService.ts: video reads, uploads, edits, and deletion
 * - shortEngagementService.ts: likes, comments, and account cleanup
 */
export {
  createShortVideo,
  deleteShortVideo,
  fetchShortVideos,
  updateShortVideo,
} from './shortVideoService';
export {
  addShortComment,
  fetchShortComments,
  getShortEngagement,
  removeUserShortData,
  toggleShortLike,
} from './shortEngagementService';
