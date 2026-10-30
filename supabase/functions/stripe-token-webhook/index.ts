import { withSupabase } from 'npm:@supabase/server@1'
import Stripe from 'npm:stripe@^23'

const cryptoProvider = Stripe.createSubtleCryptoProvider()
const bundles = {
  tokens_100: { tokens: 100, amount: 100 },
  tokens_600: { tokens: 600, amount: 500 },
  tokens_1200: { tokens: 1200, amount: 1000 },
} as const

type BundleId = keyof typeof bundles

function getWebhookConfig() {
  const mode = Deno.env.get('STRIPE_TOKEN_MODE')
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const signingSecret = Deno.env.get('STRIPE_TOKEN_WEBHOOK_SECRET') ?? ''
  const keyMatchesMode = mode === 'live'
    ? secretKey.startsWith('sk_live_')
    : mode === 'test' && secretKey.startsWith('sk_test_')
  return {
    mode,
    secretKey,
    signingSecret,
    enabled: keyMatchesMode && signingSecret.startsWith('whsec_'),
  }
}

function isBundleId(value: string | undefined): value is BundleId {
  return value === 'tokens_100' || value === 'tokens_600' || value === 'tokens_1200'
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 })

    const config = getWebhookConfig()
    if (!config.enabled) return Response.json({ error: 'Token webhook is not configured.' }, { status: 503 })

    const signature = req.headers.get('stripe-signature')
    if (!signature) return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 })

    let event: Stripe.Event
    try {
      const rawBody = await req.text()
      const stripe = new Stripe(config.secretKey)
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        config.signingSecret,
        undefined,
        cryptoProvider,
      )
    } catch {
      return Response.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 })
    }

    if (event.livemode !== (config.mode === 'live')) {
      return Response.json({ error: 'Stripe event mode does not match the configured token mode.' }, { status: 400 })
    }

    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object as Stripe.Dispute
      const paymentIntentId = typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent?.id
      if (!paymentIntentId) return Response.json({ received: true })

      const { data: existingPurchase, error: purchaseLookupError } = await ctx.supabaseAdmin
        .from('token_ledger')
        .select('user_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()
      if (purchaseLookupError) return Response.json({ error: 'Disputed token purchase could not be located.' }, { status: 500 })

      let userId = existingPurchase?.user_id ?? null
      if (!userId) {
        try {
          const stripe = new Stripe(config.secretKey)
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
          const metadata = paymentIntent.metadata
          const metadataUserId = metadata.user_id ?? metadata.sanctuary_user_id
          const isTokenPurchase = metadata.sanctuary_purchase === 'token_bundle' || Boolean(metadata.sanctuary_order_id)
          if (isTokenPurchase && metadataUserId && isUuid(metadataUserId)) userId = metadataUserId

          if (!userId) {
            const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 })
            const sessionMetadata = sessions.data[0]?.metadata
            const sessionUserId = sessionMetadata?.user_id ?? sessionMetadata?.sanctuary_user_id
            const isTokenSession = sessionMetadata?.sanctuary_purchase === 'token_bundle' || Boolean(sessionMetadata?.sanctuary_order_id)
            if (isTokenSession && sessionUserId && isUuid(sessionUserId)) userId = sessionUserId
          }
        } catch {
          return Response.json({ error: 'Disputed payment could not be verified with Stripe.' }, { status: 500 })
        }
      }

      if (!userId || !isUuid(userId)) return Response.json({ received: true })
      const { error: holdError } = await ctx.supabaseAdmin.rpc('place_token_spending_hold', {
        requested_user_id: userId,
        requested_case_reference: `stripe_dispute:${dispute.id}`,
        requested_reason_code: 'chargeback',
        requested_actor: 'stripe_webhook',
      })
      if (holdError) return Response.json({ error: 'Token spending could not be paused for the dispute.' }, { status: 500 })
      return Response.json({ received: true, spending_paused: true })
    }

    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
      return Response.json({ received: true })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata
    if (!metadata || metadata.sanctuary_purchase !== 'token_bundle') {
      return Response.json({ received: true })
    }
    if (session.payment_status !== 'paid') {
      return Response.json({ received: true, pending: true })
    }

    const userId = metadata.user_id
    const bundleId = metadata.bundle_id
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    if (
      session.mode !== 'payment'
      || !userId
      || !isUuid(userId)
      || session.client_reference_id !== userId
      || !isBundleId(bundleId)
      || !paymentIntentId
      || session.currency !== 'gbp'
      || session.amount_total !== bundles[bundleId].amount
    ) {
      return Response.json({ error: 'Paid Checkout Session does not match a configured token bundle.' }, { status: 400 })
    }

    const { error } = await ctx.supabaseAdmin.rpc('record_token_bundle_purchase', {
      requested_event_id: event.id,
      requested_event_type: event.type,
      requested_session_id: session.id,
      requested_user_id: userId,
      requested_bundle_id: bundleId,
      requested_amount_total: session.amount_total,
      requested_currency: session.currency,
      requested_livemode: event.livemode,
      requested_payment_intent_id: paymentIntentId,
    })
    if (error) return Response.json({ error: 'Token purchase could not be recorded.' }, { status: 500 })

    return Response.json({ received: true })
  }),
}
