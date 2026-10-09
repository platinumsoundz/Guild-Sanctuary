import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/services/supabase/database.types';

export const runtime = 'nodejs';

const priceEnvironmentKeys = {
  credits_500: 'STRIPE_PRICE_CREDITS_500',
  credits_1500: 'STRIPE_PRICE_CREDITS_1500',
  vip_wayfinder: 'STRIPE_PRICE_VIP_WAYFINDER',
  vip_champion: 'STRIPE_PRICE_VIP_CHAMPION',
} as const;

type ProductKey = keyof typeof priceEnvironmentKeys;

function configuredPriceIds(): Map<string, ProductKey> {
  const prices = new Map<string, ProductKey>();
  for (const [productKey, environmentKey] of Object.entries(priceEnvironmentKeys) as [ProductKey, string][]) {
    const priceId = process.env[environmentKey];
    if (!priceId) {
      throw new Error(`Missing ${environmentKey}.`);
    }
    if (prices.has(priceId)) {
      throw new Error('Each Stripe product must use a distinct configured price ID.');
    }
    prices.set(priceId, productKey);
  }
  return prices;
}

export async function POST(request: Request): Promise<Response> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const signature = request.headers.get('stripe-signature');

  if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Stripe webhook is missing server configuration.');
    return Response.json({ error: 'Webhook service is not configured.' }, { status: 503 });
  }
  if (!signature) {
    return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  const expectsLiveEvents = stripeSecretKey.startsWith('sk_live_') || stripeSecretKey.startsWith('rk_live_');
  const expectsTestEvents = stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('rk_test_');
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

    const userId = checkout.client_reference_id;
    if (
      !userId ||
      checkout.metadata?.user_id !== userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    ) {
      throw new Error('Stripe checkout is missing a valid matching user identity.');
    }

    const lineItems = checkout.line_items?.data ?? [];
    if (lineItems.length !== 1 || lineItems[0].quantity !== 1) {
      throw new Error('Stripe checkout must contain exactly one configured item.');
    }
    const lineItem = lineItems[0];
    const price = typeof lineItem.price === 'string'
      ? await stripe.prices.retrieve(lineItem.price)
      : lineItem.price;
    if (!price) {
      throw new Error('Stripe checkout is missing its configured Price.');
    }
    const productKey = configuredPriceIds().get(price.id);

    if (
      !productKey ||
      !price.unit_amount ||
      !checkout.amount_total ||
      checkout.currency !== price.currency ||
      checkout.amount_total < price.unit_amount
    ) {
      throw new Error('Stripe checkout does not match a configured paid product.');
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data: fulfilled, error } = await supabase.rpc('fulfill_stripe_checkout', {
      requested_event_id: event.id,
      requested_event_type: event.type,
      requested_session_id: checkout.id,
      requested_user_id: userId,
      requested_product_key: productKey,
      requested_amount_total: checkout.amount_total,
      requested_currency: checkout.currency,
    });

    if (error) {
      throw new Error(`Supabase fulfillment failed: ${error.message}`);
    }

    return Response.json({ received: true, fulfilled });
  } catch (error) {
    console.error('Stripe checkout fulfillment failed.', {
      eventId: event.id,
      error: error instanceof Error ? error.message : 'Unknown fulfillment error.',
    });
    return Response.json({ error: 'Payment fulfillment failed.' }, { status: 500 });
  }
}
