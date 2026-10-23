import { withSupabase } from 'npm:@supabase/server@1'
import Stripe from 'npm:stripe@^23'

const bundleEnvironmentKeys = {
  tokens_100: 'STRIPE_TOKEN_PRICE_100_ID',
  tokens_600: 'STRIPE_TOKEN_PRICE_600_ID',
  tokens_1200: 'STRIPE_TOKEN_PRICE_1200_ID',
} as const

type BundleId = keyof typeof bundleEnvironmentKeys

function getCheckoutConfig() {
  const mode = Deno.env.get('STRIPE_TOKEN_MODE')
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const webhookSecret = Deno.env.get('STRIPE_TOKEN_WEBHOOK_SECRET') ?? ''
  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? ''
  const prices = Object.fromEntries(
    Object.entries(bundleEnvironmentKeys).map(([bundleId, envName]) => [bundleId, Deno.env.get(envName) ?? '']),
  ) as Record<BundleId, string>

  let validAppOrigin = false
  try {
    const appUrl = new URL(appBaseUrl)
    validAppOrigin = appUrl.protocol === 'https:' && appUrl.pathname === '/' && !appUrl.search && !appUrl.hash
  } catch {
    validAppOrigin = false
  }

  const keyMatchesMode = mode === 'live'
    ? secretKey.startsWith('sk_live_')
    : mode === 'test' && secretKey.startsWith('sk_test_')
  const enabled = Deno.env.get('TOKEN_CHECKOUT_ENABLED') === 'true'
    && keyMatchesMode
    && webhookSecret.startsWith('whsec_')
    && validAppOrigin
    && Object.values(prices).every((priceId) => priceId.startsWith('price_'))

  return { enabled, mode, secretKey, appBaseUrl, prices }
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })

    const userId = ctx.userClaims?.id
    if (!userId) return Response.json({ error: 'Sign in to use your token wallet.' }, { status: 401 })

    let body: { action?: string; bundleId?: string }
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid checkout request.' }, { status: 400 })
    }

    const config = getCheckoutConfig()
    if (body.action === 'status') {
      return Response.json({ enabled: config.enabled })
    }
    if (!config.enabled) {
      return Response.json({ error: 'Token purchases are not enabled yet.' }, { status: 503 })
    }

    const bundleId = body.bundleId
    if (bundleId !== 'tokens_100' && bundleId !== 'tokens_600' && bundleId !== 'tokens_1200') {
      return Response.json({ error: 'Choose a valid token bundle.' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await ctx.supabase
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) return Response.json({ error: 'Your account could not be verified.' }, { status: 500 })
    if (!profile || profile.status !== 'active') {
      return Response.json({ error: 'An active Sanctuary account is required to buy tokens.' }, { status: 403 })
    }

    try {
      const stripe = new Stripe(config.secretKey)
      const appOrigin = new URL(config.appBaseUrl).origin
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: config.prices[bundleId], quantity: 1 }],
        client_reference_id: userId,
        metadata: {
          sanctuary_purchase: 'token_bundle',
          user_id: userId,
          bundle_id: bundleId,
        },
        success_url: `${appOrigin}/?wallet=success`,
        cancel_url: `${appOrigin}/?wallet=cancelled`,
      })
      if (!session.url) return Response.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 })
      return Response.json({ url: session.url })
    } catch {
      return Response.json({ error: 'Secure token checkout could not be started.' }, { status: 502 })
    }
  }),
}
