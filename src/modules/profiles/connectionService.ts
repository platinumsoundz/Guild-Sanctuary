import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';

export type ConnectionStatus = 'none' | 'outgoing' | 'incoming' | 'connected';
export interface RelationshipState {
  following: boolean;
  connection: ConnectionStatus;
  connectionId: string | null;
  blocked: boolean;
}
export interface IncomingConnectionRequest {
  id: string;
  requesterId: string;
  createdAt: string;
}

type LocalConnection = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};
type LocalRelationshipStore = {
  follows: Array<{ followerId: string; followeeId: string }>;
  connections: LocalConnection[];
  blocks: Array<{ blockerId: string; blockedId: string }>;
};
const LOCAL_KEY = 'sanctuary-connection-relationships:v1';

function readLocalStore(): LocalRelationshipStore {
  if (typeof window === 'undefined') return { follows: [], connections: [], blocks: [] };
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid store');
    const value = parsed as Partial<LocalRelationshipStore>;
    return {
      follows: Array.isArray(value.follows) ? value.follows : [],
      connections: Array.isArray(value.connections) ? value.connections : [],
      blocks: Array.isArray(value.blocks) ? value.blocks : [],
    };
  } catch {
    return { follows: [], connections: [], blocks: [] };
  }
}
function writeLocalStore(store: LocalRelationshipStore): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
}
function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function pairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

export async function fetchRelationshipStates(userId: string, targetIds: string[]): Promise<Map<string, RelationshipState>> {
  const uniqueIds = [...new Set(targetIds.filter((id) => id && id !== userId))];
  const result = new Map<string, RelationshipState>(uniqueIds.map((id) => [id, {
    following: false, connection: 'none', connectionId: null, blocked: false,
  }]));
  if (!uniqueIds.length) return result;

  if (!isSupabaseCommunityStorageConfigured()) {
    const store = readLocalStore();
    for (const id of uniqueIds) {
      const state = result.get(id)!;
      state.following = store.follows.some((row) => row.followerId === userId && row.followeeId === id);
      state.blocked = store.blocks.some((row) => row.blockerId === userId && row.blockedId === id);
      const connection = store.connections.find((row) =>
        pairKey(row.requesterId, row.addresseeId) === pairKey(userId, id) && row.status !== 'declined');
      if (connection?.status === 'accepted') {
        state.connection = 'connected';
        state.connectionId = connection.id;
      } else if (connection?.status === 'pending') {
        state.connection = connection.requesterId === userId ? 'outgoing' : 'incoming';
        state.connectionId = connection.id;
      }
    }
    return result;
  }

  await requireCommunityStorageUser(userId);
  const client = getSupabaseBrowserClient();
  const [follows, connections, blocks] = await Promise.all([
    client.from('profile_follows').select('followee_id').eq('follower_id', userId).in('followee_id', uniqueIds),
    client.from('profile_connections')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .in('status', ['pending', 'accepted']),
    client.from('profile_blocks').select('blocked_id').eq('blocker_id', userId).in('blocked_id', uniqueIds),
  ]);
  if (follows.error) throw new Error(`Follow status could not be loaded: ${follows.error.message}`);
  if (connections.error) throw new Error(`Connection status could not be loaded: ${connections.error.message}`);
  if (blocks.error) throw new Error(`Block status could not be loaded: ${blocks.error.message}`);

  const followed = new Set(follows.data.map((row) => row.followee_id));
  const blocked = new Set(blocks.data.map((row) => row.blocked_id));
  for (const id of uniqueIds) {
    const state = result.get(id)!;
    state.following = followed.has(id);
    state.blocked = blocked.has(id);
    const row = connections.data.find((item) =>
      (item.requester_id === userId && item.addressee_id === id)
      || (item.requester_id === id && item.addressee_id === userId));
    if (!row) continue;
    state.connectionId = row.id;
    state.connection = row.status === 'accepted' ? 'connected'
      : row.requester_id === userId ? 'outgoing' : 'incoming';
  }
  return result;
}

export async function followProfile(userId: string, targetId: string): Promise<void> {
  if (!userId || !targetId || userId === targetId) throw new Error('Choose another member to follow.');
  if (!isSupabaseCommunityStorageConfigured()) {
    const store = readLocalStore();
    if (store.blocks.some((row) => (row.blockerId === userId && row.blockedId === targetId)
      || (row.blockerId === targetId && row.blockedId === userId))) throw new Error('This relationship is unavailable.');
    if (!store.follows.some((row) => row.followerId === userId && row.followeeId === targetId)) {
      store.follows.push({ followerId: userId, followeeId: targetId });
    }
    writeLocalStore(store); return;
  }
  await requireCommunityStorageUser(userId);
  const { error } = await getSupabaseBrowserClient().from('profile_follows').insert({ follower_id: userId, followee_id: targetId });
  if (error && error.code !== '23505') throw new Error(`Could not follow this member: ${error.message}`);
}

export async function unfollowProfile(userId: string, targetId: string): Promise<void> {
  if (!isSupabaseCommunityStorageConfigured()) {
    const store = readLocalStore();
    store.follows = store.follows.filter((row) => !(row.followerId === userId && row.followeeId === targetId));
    writeLocalStore(store); return;
  }
  await requireCommunityStorageUser(userId);
  const { error } = await getSupabaseBrowserClient().from('profile_follows').delete().eq('follower_id', userId).eq('followee_id', targetId);
  if (error) throw new Error(`Could not unfollow this member: ${error.message}`);
}

export async function requestConnection(userId: string, targetId: string): Promise<void> {
  if (!userId || !targetId || userId === targetId) throw new Error('Choose another member to connect with.');
  if (!isSupabaseCommunityStorageConfigured()) {
    const store = readLocalStore();
    if (store.blocks.some((row) => (row.blockerId === userId && row.blockedId === targetId)
      || (row.blockerId === targetId && row.blockedId === userId))) throw new Error('This relationship is unavailable.');
    const existing = store.connections.find((row) => pairKey(row.requesterId, row.addresseeId) === pairKey(userId, targetId));
    if (existing?.status === 'accepted') throw new Error('You are already connected.');
    if (existing?.status === 'pending') throw new Error('A connection request already exists.');
    store.connections = store.connections.filter((row) => pairKey(row.requesterId, row.addresseeId) !== pairKey(userId, targetId));
    store.connections.push({ id: makeId(), requesterId: userId, addresseeId: targetId, status: 'pending', createdAt: new Date().toISOString() });
    writeLocalStore(store); return;
  }
  await requireCommunityStorageUser(userId);
  const client = getSupabaseBrowserClient();
  const { data: existing, error: lookupError } = await client.from('profile_connections')
    .select('id, status').or(`and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`).maybeSingle();
  if (lookupError) throw new Error(`Could not check existing connection: ${lookupError.message}`);
  if (existing?.status === 'accepted') throw new Error('You are already connected.');
  if (existing?.status === 'pending') throw new Error('A connection request already exists.');
  if (existing?.status === 'declined') {
    const { error } = await client.from('profile_connections').delete().eq('id', existing.id);
    if (error) throw new Error(`Could not renew the connection request: ${error.message}`);
  }
  const [memberLowId, memberHighId] = [userId, targetId].sort();
  const { error } = await client.from('profile_connections').insert({
    member_low_id: memberLowId, member_high_id: memberHighId,
    requester_id: userId, addressee_id: targetId, status: 'pending',
  });
  if (error) throw new Error(`Could not send connection request: ${error.message}`);
}

export async function respondToConnection(userId: string, connectionId: string, response: 'accepted' | 'declined'): Promise<void> {
  if (!isSupabaseCommunityStorageConfigured()) {
    const store = readLocalStore();
    const connection = store.connections.find((row) => row.id === connectionId && row.addresseeId === userId && row.status === 'pending');
    if (!connection) throw new Error('This request is no longer available.');
    connection.status = response;
    writeLocalStore(store); return;
  }
  await requireCommunityStorageUser(userId);
  const { error } = await getSupabaseBrowserClient().from('profile_connections')
    .update({ status: response, responded_at: new Date().toISOString() })
    .eq('id', connectionId).eq('addressee_id', userId).eq('status', 'pending');
  if (error) throw new Error(`Could not update this connection request: ${error.message}`);
}

export async function blockProfile(userId: string, targetId: string): Promise<void> {
  if (!userId || !targetId || userId === targetId) throw new Error('You cannot block your own profile.');
  if (!isSupabaseCommunityStorageConfigured()) {
    const store = readLocalStore();
    if (!store.blocks.some((row) => row.blockerId === userId && row.blockedId === targetId)) store.blocks.push({ blockerId: userId, blockedId: targetId });
    store.follows = store.follows.filter((row) => !((row.followerId === userId && row.followeeId === targetId) || (row.followerId === targetId && row.followeeId === userId)));
    store.connections = store.connections.map((row) => pairKey(row.requesterId, row.addresseeId) === pairKey(userId, targetId) && row.status === 'pending' ? { ...row, status: 'declined' } : row);
    writeLocalStore(store); return;
  }
  await requireCommunityStorageUser(userId);
  const { error } = await getSupabaseBrowserClient().from('profile_blocks').insert({ blocker_id: userId, blocked_id: targetId });
  if (error && error.code !== '23505') throw new Error(`Could not block this member: ${error.message}`);
}

export async function unblockProfile(userId: string, targetId: string): Promise<void> {
  if (!isSupabaseCommunityStorageConfigured()) {
    const store = readLocalStore();
    store.blocks = store.blocks.filter((row) => !(row.blockerId === userId && row.blockedId === targetId));
    writeLocalStore(store); return;
  }
  await requireCommunityStorageUser(userId);
  const { error } = await getSupabaseBrowserClient().from('profile_blocks').delete().eq('blocker_id', userId).eq('blocked_id', targetId);
  if (error) throw new Error(`Could not unblock this member: ${error.message}`);
}

export async function fetchIncomingConnectionRequests(userId: string): Promise<IncomingConnectionRequest[]> {
  if (!isSupabaseCommunityStorageConfigured()) {
    return readLocalStore().connections.filter((row) => row.addresseeId === userId && row.status === 'pending')
      .map((row) => ({ id: row.id, requesterId: row.requesterId, createdAt: row.createdAt }));
  }
  await requireCommunityStorageUser(userId);
  const { data, error } = await getSupabaseBrowserClient().from('profile_connections')
    .select('id, requester_id, created_at').eq('addressee_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
  if (error) throw new Error(`Incoming connection requests could not be loaded: ${error.message}`);
  return data.map((row) => ({ id: row.id, requesterId: row.requester_id, createdAt: row.created_at }));
}
