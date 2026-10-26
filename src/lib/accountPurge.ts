import type { createAdminClient } from '@/lib/supabase/admin';

const mediaBucket = 'community-media';

async function listAllObjects(
  admin: ReturnType<typeof createAdminClient>,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage
      .from(mediaBucket)
      .list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const childPath = prefix ? `${prefix}/${item.name}` : item.name;
      // Folders have no id; recurse into them.
      if (!item.id) {
        paths.push(...await listAllObjects(admin, childPath));
      } else {
        paths.push(childPath);
      }
    }

    if (data.length < 1000) break;
    offset += data.length;
  }

  return paths;
}

/** Remove every stored media object owned by the account. */
export async function removeUserMedia(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const objects = await listAllObjects(admin, userId);
  for (let index = 0; index < objects.length; index += 100) {
    const batch = objects.slice(index, index + 100);
    if (batch.length > 0) {
      const { error } = await admin.storage.from(mediaBucket).remove(batch);
      if (error) throw error;
    }
  }
}
