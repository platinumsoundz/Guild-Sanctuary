import { withSupabase } from 'npm:@supabase/server@1'

const ALLOWED_ACTIONS = new Set(['status', 'start', 'stop', 'reset', 'delete'])

function corsHeaders(origin: string | null, allowedOrigin: string) {
  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function jsonResponse(body: unknown, status: number, origin: string | null, allowedOrigin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin, allowedOrigin),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
    },
  })
}

function configuredOrigin(): string | null {
  const raw = Deno.env.get('APP_BASE_URL') ?? ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) return null
    return url.origin
  } catch {
    return null
  }
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const allowedOrigin = configuredOrigin()
    if (!allowedOrigin) {
      return Response.json({ error: 'Cloud Lab control is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }

    const origin = req.headers.get('origin')
    if (req.method === 'OPTIONS') {
      return new Response('ok', { status: 200, headers: corsHeaders(origin, allowedOrigin) })
    }
    if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, origin, allowedOrigin)
    if (!origin || origin !== allowedOrigin) {
      return jsonResponse({ error: 'Use Cloud Lab from the configured Sanctuary origin.' }, 403, origin, allowedOrigin)
    }

    const userId = ctx.userClaims?.id
    if (!userId) return jsonResponse({ error: 'Sign in to access Cloud Lab.' }, 401, origin, allowedOrigin)

    let body: { action?: unknown }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid Cloud Lab request.' }, 400, origin, allowedOrigin)
    }
    if (!body || typeof body !== 'object' || typeof body.action !== 'string' || !ALLOWED_ACTIONS.has(body.action)) {
      return jsonResponse({ error: 'Choose a supported Cloud Lab action.' }, 400, origin, allowedOrigin)
    }

    const { data: profile, error: profileError } = await ctx.supabase
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) return jsonResponse({ error: 'Your account permissions could not be verified.' }, 500, origin, allowedOrigin)
    if (profile?.status !== 'active') return jsonResponse({ error: 'An active Sanctuary account is required.' }, 403, origin, allowedOrigin)

    if (body.action !== 'status') {
      // Fail closed until a provider adapter, spend guard, and idempotent lifecycle worker exist.
      // Never change the visible lifecycle state to imply a VM or terminal was started.
      return jsonResponse({
        error: 'Cloud Lab runtime is not provisioned yet.',
        code: 'RUNTIME_NOT_CONFIGURED',
        action: body.action,
        retryable: false,
      }, 503, origin, allowedOrigin)
    }

    const { data: workspace, error: workspaceError } = await ctx.supabase
      .from('guild_workspace_status')
      .select('id, state, disk_quota_mb, cpu_limit_millicores, memory_limit_mb, runtime_limit_minutes, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (workspaceError) {
      return jsonResponse({
        error: 'Cloud Lab status is unavailable until its database migration is installed.',
        code: 'CONTROL_PLANE_UNAVAILABLE',
      }, 503, origin, allowedOrigin)
    }

    return jsonResponse({
      configured: false,
      runtimeAvailable: false,
      workspace: workspace ?? null,
      message: workspace
        ? 'Workspace metadata exists, but no terminal runtime is connected.'
        : 'No workspace has been provisioned. Cloud Lab does not start compute in this build.',
    }, 200, origin, allowedOrigin)
  }),
}
