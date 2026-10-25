/**
 * Compatibility barrel for the feed module.
 *
 * Implementation is split by responsibility:
 * - feedStore.ts: browser-local demo state and shared validation
 * - feedPagination.ts: keyset pagination and cursor types
 * - postService.ts: post reads and mutations
 * - engagementService.ts: likes, comments, and account cleanup
 */
export type { CreatePostInput } from './postService';
export type { FeedCursor, FeedPage } from './feedPagination';
export { FEED_PAGE_SIZE, fetchFeed, fetchFeedPage } from './feedPagination';
export { createPost, deletePost, fetchPostsByAuthor, updatePost } from './postService';
export {
  addPostComment,
  fetchPostComments,
  getPostEngagement,
  removeUserFeedData,
  togglePostLike,
} from './engagementService';
