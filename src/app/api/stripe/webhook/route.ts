import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/services/supabase/database.types';

export const runtime = 'nodejs';

const tipPriceEnvironmentKeys = {
  tip_5_usd: { environmentKey: 'STRIPE_PRICE_TIP_5_USD', amountCents: 500 },
  tip_10_usd: { environmentKey: 'STRIPE_PRICE_TIP_10_USD', amountCents: 1000 },
  tip_25_usd: { environmentKey: 'STRIPE_PRICE_TIP_25_USD', amountCents: 2500 },
} as const;

type TipOption = keyof typeof tipPriceEnvironmentKeys;

function isTipOption(value: unknown): value is TipOption {
  return typeof value === 'string' && Object.hasOwn(tipPriceEnvironmentKeys, value);
}

function configuredTipPrices(): Map<string, TipOption> {
  const prices = new Map<string, TipOption>();
  for (const [tipOption, configuration] of Object.entries(tipPriceEnvironmentKeys) as [TipOption, (typeof tipPriceEnvironmentKeys)[TipOption]][]) {
    const priceId = process.env[configuration.environmentKey];
    if (!priceId) {
      throw new Error(`Missing ${configuration.environmentKey}.`);
    }
    if (prices.has(priceId)) {
      throw new Error('Each contribution amount must use a distinct configured Stripe Price ID.');
    }
    prices.set(priceId, tipOption);
  }
  return prices;
}

export async function POST(request: Request): Promise<Response> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const signature = request.headers.get('stripe-signature');

  if (
    process.env.COMMUNITY_TIPS_ENABLED !== 'true' ||
    !stripeSecretKey ||
    !stripeWebhookSecret ||
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    console.error('Stripe webhook is missing server configuration.');
    return Response.json({ error: 'Webhook service is not configured.' }, { status: 503 });
  }
  if (!signature) {
    return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  const expectsLiveEvents = stripeSecretKey.startsWith('sk_live_');
  const expectsTestEvents = stripeSecretKey.startsWith('sk_test_');
  if (!expectsLiveEvents && !expectsTestEvents) {
    console.error('Stripe webhook has an unsupported API key mode.');
    return Response.json({ error: 'Webhook service is not configured.' }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey);
  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch {
    return Response.json({ error: 'Invalid Stripe webhook signature or payload.' }, { status: 400 });
  }
  if (event.livemode !== expectsLiveEvents) {
    return Response.json({ error: 'Stripe event mode does not match server configuration.' }, { status: 400 });
  }

  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  ) {
    return Response.json({ received: true });
  }

  try {
    const checkout = await stripe.checkout.sessions.retrieve(event.data.object.id, {
      expand: ['line_items.data.price'],
    });
    if (checkout.mode !== 'payment' || checkout.payment_status !== 'paid') {
      return Response.json({ received: true, fulfilled: false });
    }

    const tipOption = checkout.metadata?.tip_option;
    if (!isTipOption(tipOption)) {
      throw new Error('Stripe checkout is missing a supported community tip option.');
    }

    const lineItems = checkout.line_items?.data ?? [];
    if (lineItems.length !== 1 || lineItems[0].quantity !== 1) {
      throw new Error('Stripe checkout must contain exactly one community tip.');
    }
    const lineItem = lineItems[0];
    const price = typeof lineItem.price === 'string'
      ? await stripe.prices.retrieve(lineItem.price)
      : lineItem.price;
    if (!price) {
      throw new Error('Stripe checkout is missing its configured Price.');
    }
    const configuredPrices = configuredTipPrices();
    const configuredTip = configuredPrices.get(price.id);
    const expectedTip = tipPriceEnvironmentKeys[tipOption];

    if (
      !configuredTip ||
      configuredTip !== tipOption ||
      price.type !== 'one_time' ||
      price.unit_amount !== expectedTip.amountCents ||
      checkout.amount_total !== expectedTip.amountCents ||
      checkout.currency !== 'usd' ||
      price.currency !== 'usd'
    ) {
      throw new Error('Stripe checkout does not match a configured one-time community contribution.');
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data: recorded, error } = await supabase.rpc('record_community_tip', {
      requested_event_id: event.id,
      requested_event_type: event.type,
      requested_session_id: checkout.id,
      requested_tip_option: tipOption,
      requested_amount_total: checkout.amount_total,
      requested_currency: checkout.currency,
    });

    if (error) {
      throw new Error(`Supabase fulfillment failed: ${error.message}`);
    }

    return Response.json({ received: true, recorded });
  } catch (error) {
    console.error('Stripe checkout fulfillment failed.', {
      eventId: event.id,
      error: error instanceof Error ? error.message : 'Unknown fulfillment error.',
    });
    return Response.json({ error: 'Payment fulfillment failed.' }, { status: 500 });
  }
}
