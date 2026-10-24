import { describe, expect, it } from 'vitest';
import { createPost, fetchFeedPage } from './service';

describe('feed pagination', () => {
  it('returns a stable cursor without duplicates when a newer post arrives', async () => {
    const first = await createPost({ authorId: 'test-user', content: 'Pagination test one' });
    const second = await createPost({ authorId: 'test-user', content: 'Pagination test two' });
    const third = await createPost({ authorId: 'test-user', content: 'Pagination test three' });

    const firstPage = await fetchFeedPage({ limit: 2 });
    expect(firstPage.posts).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();

    const newer = await createPost({ authorId: 'test-user', content: 'Pagination test four' });
    const secondPage = await fetchFeedPage({ limit: 2, cursor: firstPage.nextCursor });

    const seenIds = [...firstPage.posts, ...secondPage.posts].map((post) => post.id);
    expect(new Set(seenIds).size).toBe(seenIds.length);
    expect(seenIds).toEqual(expect.arrayContaining([first.id, second.id, third.id]));
    expect(seenIds).not.toContain(newer.id);
  });

  it('clamps an out-of-range page size', async () => {
    const page = await fetchFeedPage({ limit: 0 });
    expect(page.posts).toHaveLength(1);
  });
});
