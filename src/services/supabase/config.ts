/**
 * Shared validation for the public Supabase project configuration.
 *
 * The anon/publishable key is intended for browser use; never put a service-role
 * key in NEXT_PUBLIC_* variables. Authorization must still be enforced by RLS
 * and server-side database functions.
 */
export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!rawUrl || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the deployment environment.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.');
  }

  const localHost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
  if (parsedUrl.protocol !== 'https:' && !(localHost && parsedUrl.protocol === 'http:')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must use HTTPS outside local development.');
  }

  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must not contain credentials, query parameters, or a fragment.');
  }

  return { url: parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, ''), anonKey };
}
