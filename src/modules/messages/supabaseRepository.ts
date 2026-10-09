import type { WorldType } from '@/types';
import type { Conversation, Message } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import type { ConversationRow, MessageRow } from '@/services/supabase/database.types';

export interface PersistentConversationThread {
  conversation: Conversation;
  messages: Message[];
}

function toConversation(row: ConversationRow, participantIds: string[]): Conversation {
  return {
    id: row.id,
    kind: row.kind,
    worldType: row.world_type,
    participantIds,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    sentAt: row.sent_at,
    readAt: row.read_at,
  };
}

async function getMembers(conversationIds: string[]): Promise<Map<string, string[]>> {
  if (conversationIds.length === 0) return new Map();
  const { data, error } = await getSupabaseBrowserClient()
    .from('conversation_members')
    .select('conversation_id,user_id')
    .in('conversation_id', conversationIds)
    .is('left_at', null);
  if (error) throw new Error(`Conversation members could not be loaded: ${error.message}`);

  const members = new Map<string, string[]>();
  for (const member of data) {
    const existing = members.get(member.conversation_id) ?? [];
    existing.push(member.user_id);
    members.set(member.conversation_id, existing);
  }
  return members;
}

export async function createPersistentConversation(
  kind: Conversation['kind'],
  worldType: WorldType,
  participantIds: string[],
  name: string | null,
): Promise<Conversation> {
  const client = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(`Authentication could not be verified: ${authError.message}`);
  if (!authData.user) throw new Error('Sign in with a Supabase account before starting a conversation.');

  const uniqueIds = [...new Set([authData.user.id, ...participantIds])];
  const { data: conversationId, error } = await client.rpc('create_conversation', {
    requested_kind: kind,
    requested_world: worldType,
    requested_member_ids: uniqueIds,
    requested_name: name,
  });
  if (error) throw new Error(`Conversation could not be created: ${error.message}`);

  const { data: row, error: conversationError } = await client
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  if (conversationError) throw new Error(`Conversation could not be loaded: ${conversationError.message}`);
  const memberMap = await getMembers([row.id]);
  return toConversation(row, memberMap.get(row.id) ?? []);
}

export async function fetchPersistentConversations(userId: string, worldType: WorldType): Promise<Conversation[]> {
  const client = getSupabaseBrowserClient();
  const { data: memberships, error: membershipError } = await client
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId)
    .is('left_at', null);
  if (membershipError) throw new Error(`Conversations could not be loaded: ${membershipError.message}`);
  const conversationIds = memberships.map(({ conversation_id }) => conversation_id);
  if (conversationIds.length === 0) return [];

  const { data: rows, error } = await client
    .from('conversations')
    .select('*')
    .in('id', conversationIds)
    .eq('world_type', worldType)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Conversations could not be loaded: ${error.message}`);

  const memberMap = await getMembers(rows.map(({ id }) => id));
  return rows.map((row) => toConversation(row, memberMap.get(row.id) ?? []));
}

export async function fetchPersistentThread(
  conversationId: string,
  worldType: WorldType,
): Promise<PersistentConversationThread> {
  const client = getSupabaseBrowserClient();
  const { data: row, error } = await client
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('world_type', worldType)
    .single();
  if (error) throw new Error(`Conversation could not be opened: ${error.message}`);

  const [memberMap, messageResult] = await Promise.all([
    getMembers([row.id]),
    client.from('messages')
      .select('*')
      .eq('conversation_id', row.id)
      .eq('state', 'visible')
      .order('sent_at', { ascending: false })
      .limit(500),
  ]);
  if (messageResult.error) throw new Error(`Messages could not be loaded: ${messageResult.error.message}`);

  return {
    conversation: toConversation(row, memberMap.get(row.id) ?? []),
    messages: messageResult.data.reverse().map(toMessage),
  };
}

export async function sendPersistentMessage(conversationId: string, body: string): Promise<Message> {
  const normalizedBody = body.trim();
  if (normalizedBody.length < 1 || normalizedBody.length > 2000) {
    throw new Error('Messages must contain 1 to 2,000 characters.');
  }
  const client = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(`Authentication could not be verified: ${authError.message}`);
  if (!authData.user) throw new Error('Sign in with a Supabase account before sending messages.');

  const { data, error } = await client
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: authData.user.id, body: normalizedBody })
    .select('*')
    .single();
  if (error) throw new Error(`Message could not be sent: ${error.message}`);
  return toMessage(data);
}

export function subscribeToPersistentMessages(
  conversationId: string,
  onMessage: (message: Message) => void,
  onError: (message: string) => void,
): () => void {
  const client = getSupabaseBrowserClient();
  const channel = client
    .channel(`conversation:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      onMessage(toMessage(payload.new as MessageRow));
    })
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(error?.message ?? `Message subscription ${status.toLowerCase()}.`);
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
}
