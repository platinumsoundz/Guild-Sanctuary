import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Fallback to safe placeholders if the env vars are missing, empty, or invalid
  const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : 'https://xgpzvmhldyoyrwwebcic.supabase.co'
  const supabaseAnonKey = (rawKey && rawKey.length > 10) ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}