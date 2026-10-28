import { withSupabase } from 'npm:@supabase/server@1'

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
]

function corsHeaders(origin: string | null, allowedOrigin: string) {
  const allowOrigin = origin && origin === allowedOrigin ? origin : allowedOrigin
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function jsonResponse(body: unknown, status: number, origin: string | null, allowedOrigin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin, allowedOrigin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

async function createTurnCredential(username: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(username))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? ''
    let allowedOrigin = ''
    try {
      const appUrl = new URL(appBaseUrl)
      if (appUrl.protocol !== 'https:' || appUrl.pathname !== '/' || appUrl.search || appUrl.hash) {
        return Response.json({ error: 'Call ICE configuration is not configured.' }, { status: 503 })
      }
      allowedOrigin = appUrl.origin
    } catch {
      return Response.json({ error: 'Call ICE configuration is not configured.' }, { status: 503 })
    }

    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') {
      return new Response('ok', { status: 200, headers: corsHeaders(origin, allowedOrigin) })
    }
    if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, origin, allowedOrigin)
    if (!origin || origin !== allowedOrigin) return jsonResponse({ error: 'Calls are only available from the configured Sanctuary origin.' }, 403, origin, allowedOrigin)

    const userId = ctx.userClaims?.id
    if (!userId) return jsonResponse({ error: 'Sign in to configure call connectivity.' }, 401, origin, allowedOrigin)

    let body: { conversationId?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid call configuration request.' }, 400, origin, allowedOrigin)
    }
    const conversationId = body.conversationId ?? ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) {
      return jsonResponse({ error: 'Choose a valid conversation.' }, 400, origin, allowedOrigin)
    }

    const [{ data: membership, error: membershipError }, { data: profile, error: profileError }] = await Promise.all([
      ctx.supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .is('left_at', null)
        .maybeSingle(),
      ctx.supabase
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .maybeSingle(),
    ])
    if (membershipError || profileError) return jsonResponse({ error: 'Your call permissions could not be verified.' }, 500, origin, allowedOrigin)
    if (!membership || profile?.status !== 'active') return jsonResponse({ error: 'An active conversation membership is required.' }, 403, origin, allowedOrigin)

    const configuredUrls = (Deno.env.get('TURN_SERVER_URLS') ?? '')
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.startsWith('turn:') || url.startsWith('turns:'))
    const turnSecret = Deno.env.get('TURN_SHARED_SECRET') ?? ''
    if (!configuredUrls.length || !turnSecret) {
      return jsonResponse({ iceServers: DEFAULT_ICE_SERVERS, turnConfigured: false }, 200, origin, allowedOrigin)
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60
    const username = `${expiresAt}:${userId}`
    const credential = await createTurnCredential(username, turnSecret)
    const iceServers: RTCIceServer[] = [
      ...DEFAULT_ICE_SERVERS,
      { urls: configuredUrls, username, credential },
    ]
    return jsonResponse({ iceServers, turnConfigured: true, expiresAt }, 200, origin, allowedOrigin)
  }),
}
