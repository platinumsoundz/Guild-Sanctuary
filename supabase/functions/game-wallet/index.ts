import { withSupabase } from 'npm:@supabase/server@1'

const GAME_IDS = new Set(['sleeves-online', 'training-3d'])
const SESSION_TTL_MS = 30 * 60 * 1000
const DEFAULT_APP_ORIGINS = [
  'https://the-sanctuary.platinumashley.workers.dev',
  'http://localhost:3000',
]

function allowedOrigins(): Set<string> {
  const origins = new Set(DEFAULT_APP_ORIGINS)
  const configured = Deno.env.get('APP_BASE_URL')
  if (configured) {
    try {
      const url = new URL(configured)
      if (url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash) {
        origins.add(url.origin)
      }
    } catch {
      // Invalid app origin is ignored; the explicit safe defaults remain.
    }
  }
  return origins
}

function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  return !!origin && allowedOrigins().has(origin)
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function validToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
    if (!isAllowedOrigin(req)) return Response.json({ error: 'Wallet bridge is only available from the configured Sanctuary app origin.' }, { status: 403 })

    const userId = ctx.userClaims?.id
    if (!userId) return Response.json({ error: 'Sign in to connect a game wallet.' }, { status: 401 })

    let body: { action?: string; gameId?: string; sessionToken?: string }
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid game wallet request.' }, { status: 400 })
    }

    const gameId = body.gameId
    if (!gameId || !GAME_IDS.has(gameId)) {
      return Response.json({ error: 'Choose a supported Sanctuary game.' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await ctx.supabase
      .from('profiles')
      .select('status,suspended_until')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) return Response.json({ error: 'Your account could not be verified.' }, { status: 500 })
    const active = profile?.status === 'active'
      || (profile?.status === 'suspended' && !!profile.suspended_until && Date.parse(profile.suspended_until) <= Date.now())
    if (!active) return Response.json({ error: 'An active Sanctuary account is required to connect a game wallet.' }, { status: 403 })

    if (body.action === 'issue-session') {
      const token = randomToken()
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
      const { error } = await ctx.supabaseAdmin.from('game_wallet_sessions').insert({
        user_id: userId,
        game_id: gameId,
        token_hash: await hashToken(token),
        expires_at: expiresAt,
      })
      if (error) return Response.json({ error: 'A game wallet session could not be created.' }, { status: 500 })

      const { data: wallet, error: walletError } = await ctx.supabaseAdmin
        .from('token_wallets')
        .select('balance_tokens')
        .eq('user_id', userId)
        .maybeSingle()
      if (walletError) return Response.json({ error: 'Your token balance could not be loaded.' }, { status: 500 })

      return Response.json({
        sessionToken: token,
        gameId,
        expiresAt,
        balanceTokens: wallet?.balance_tokens ?? 0,
      })
    }

    if (body.action === 'balance') {
      if (!validToken(body.sessionToken)) return Response.json({ error: 'A valid game wallet session is required.' }, { status: 400 })
      const tokenHash = await hashToken(body.sessionToken)
      const { data: session, error: sessionError } = await ctx.supabaseAdmin
        .from('game_wallet_sessions')
        .select('id,user_id,game_id,expires_at,revoked_at')
        .eq('token_hash', tokenHash)
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .maybeSingle()
      if (sessionError) return Response.json({ error: 'The game wallet session could not be verified.' }, { status: 500 })
      if (!session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) {
        return Response.json({ error: 'The game wallet session has expired. Reconnect the game.' }, { status: 401 })
      }

      const { data: wallet, error: walletError } = await ctx.supabaseAdmin
        .from('token_wallets')
        .select('balance_tokens')
        .eq('user_id', userId)
        .maybeSingle()
      if (walletError) return Response.json({ error: 'Your token balance could not be loaded.' }, { status: 500 })

      await ctx.supabaseAdmin.from('game_wallet_sessions').update({ last_used_at: new Date().toISOString() }).eq('id', session.id)
      return Response.json({ gameId, balanceTokens: wallet?.balance_tokens ?? 0, expiresAt: session.expires_at })
    }

    if (body.action === 'revoke-session') {
      if (!validToken(body.sessionToken)) return Response.json({ error: 'A valid game wallet session is required.' }, { status: 400 })
      const { error } = await ctx.supabaseAdmin.from('game_wallet_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', await hashToken(body.sessionToken))
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .is('revoked_at', null)
      if (error) return Response.json({ error: 'The game wallet session could not be closed.' }, { status: 500 })
      return Response.json({ revoked: true })
    }

    return Response.json({ error: 'Unsupported game wallet action.' }, { status: 400 })
  }),
}
