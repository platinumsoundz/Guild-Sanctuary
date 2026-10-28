import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicConfig } from '../../services/supabase/config'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (browserClient) return browserClient

  const { url, anonKey } = getSupabasePublicConfig()
  browserClient = createBrowserClient(url, anonKey)
  return browserClient
}
