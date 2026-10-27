import { getSupabaseBrowserClient } from '@/services/supabase';

export type ReflectionMood = 'low' | 'heavy' | 'steady' | 'good' | 'bright';

export interface ReflectionEntry {
  id: string;
  date: string;
  mood: ReflectionMood;
  intention: string;
  reflection: string;
  createdAt: string;
  updatedAt: string;
}

type ReflectionRow = {
  id: string;
  user_id: string;
  reflection_date: string;
  title: string;
  intention: string;
  content: string;
  mood: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ReflectionRow): ReflectionEntry {
  const moods: ReflectionMood[] = ['low', 'heavy', 'steady', 'good', 'bright'];
  if (!row.mood || !moods.includes(row.mood as ReflectionMood)) {
    throw new Error('A saved reflection has an unsupported mood value. Contact support if this continues.');
  }
  return {
    id: row.id,
    date: row.reflection_date,
    mood: row.mood as ReflectionMood,
    intention: row.intention ?? '',
    reflection: row.content ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireReflectionOwner(expectedUserId: string): Promise<string> {
  if (!expectedUserId) throw new Error('Sign in to use your reflection diary.');
  const { data, error } = await getSupabaseBrowserClient().auth.getUser();
  if (error) throw new Error(`Your sign-in could not be verified: ${error.message}`);
  if (!data.user) throw new Error('Sign in to save and revisit your reflections.');
  if (data.user.id !== expectedUserId) {
    throw new Error('Your active account does not match this diary. Sign out and sign in again.');
  }
  return data.user.id;
}

export async function fetchDailyReflections(userId: string): Promise<ReflectionEntry[]> {
  const ownerId = await requireReflectionOwner(userId);
  const { data, error } = await getSupabaseBrowserClient()
    .from('daily_reflections')
    .select('id,user_id,reflection_date,title,intention,content,mood,created_at,updated_at')
    .eq('user_id', ownerId)
    .order('reflection_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3650);
  if (error) throw new Error(`Your reflection diary could not be loaded: ${error.message}`);
  return (data ?? []).map((row) => mapRow(row as ReflectionRow));
}

export async function saveDailyReflection(
  userId: string,
  entry: Pick<ReflectionEntry, 'date' | 'mood' | 'intention' | 'reflection'>,
): Promise<ReflectionEntry> {
  const ownerId = await requireReflectionOwner(userId);
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(entry.date)) throw new Error('Choose a valid reflection date.');
  if (!['low', 'heavy', 'steady', 'good', 'bright'].includes(entry.mood)) throw new Error('Choose a supported mood.');
  const intention = entry.intention.trim().slice(0, 180);
  const reflection = entry.reflection.trim().slice(0, 1200);
  if (!intention && !reflection) throw new Error('Add an intention or a few words before saving your reflection.');

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from('daily_reflections')
    .upsert({
      user_id: ownerId,
      reflection_date: entry.date,
      title: '',
      intention,
      content: reflection,
      mood: entry.mood,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,reflection_date' })
    .select('id,user_id,reflection_date,title,intention,content,mood,created_at,updated_at')
    .single();
  if (error) throw new Error(`Your reflection could not be saved to your account: ${error.message}`);
  return mapRow(data as ReflectionRow);
}

export async function deleteDailyReflections(userId: string): Promise<void> {
  const ownerId = await requireReflectionOwner(userId);
  const { error } = await getSupabaseBrowserClient()
    .from('daily_reflections')
    .delete()
    .eq('user_id', ownerId);
  if (error) throw new Error(`Your reflection history could not be deleted: ${error.message}`);
}
