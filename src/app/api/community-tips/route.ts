import Stripe from 'stripe';

export const runtime = 'nodejs';

const tipOptions = {
  tip_5_usd: { priceEnvironmentKey: 'STRIPE_PRICE_TIP_5_USD', amountCents: 500 },
  tip_10_usd: { priceEnvironmentKey: 'STRIPE_PRICE_TIP_10_USD', amountCents: 1000 },
  tip_25_usd: { priceEnvironmentKey: 'STRIPE_PRICE_TIP_25_USD', amountCents: 2500 },
} as const;

type TipOption = keyof typeof tipOptions;

function isTipOption(value: unknown): value is TipOption {
  return typeof value === 'string' && Object.hasOwn(tipOptions, value);
}

function tipsAreEnabled(): boolean {
  return process.env.COMMUNITY_TIPS_ENABLED === 'true';
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function readHostedPaymentLink(environmentKey: string): string | null {
  const configuredLink = process.env[environmentKey]?.trim();
  if (!configuredLink) return null;

  let paymentUrl: URL;
  try {
    paymentUrl = new URL(configuredLink);
  } catch {
    throw new Error(`${environmentKey} must be a valid HTTPS URL.`);
  }
  if (paymentUrl.protocol !== 'https:' || paymentUrl.username || paymentUrl.password) {
    throw new Error(`${environmentKey} must be a credential-free HTTPS URL.`);
  }

  return paymentUrl.toString();
}

function getConfiguration(): { stripe: Stripe; appUrl: URL } {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.APP_BASE_URL;
  if (!secretKey || !baseUrl) {
    throw new Error('Missing STRIPE_SECRET_KEY or APP_BASE_URL.');
  }
  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
    throw new Error('STRIPE_SECRET_KEY must be a standard test or live secret key.');
  }

  const appUrl = new URL(baseUrl);
  if (
    (process.env.NODE_ENV === 'production' && appUrl.protocol !== 'https:') ||
    appUrl.pathname !== '/' ||
    appUrl.search ||
    appUrl.hash ||
    appUrl.username ||
    appUrl.password
  ) {
    throw new Error('APP_BASE_URL must be the canonical HTTPS site origin in production.');
  }

  return { stripe: new Stripe(secretKey), appUrl };
}

export async function GET(): Promise<Response> {
  try {
    return jsonResponse({
      stripeTipsEnabled: tipsAreEnabled(),
      lemonSqueezyCheckoutUrl: readHostedPaymentLink('LEMON_SQUEEZY_CHECKOUT_URL'),
      monzoContributionUrl: readHostedPaymentLink('MONZO_CONTRIBUTION_URL'),
    });
  } catch (error: unknown) {
    console.error('Community support links are not configured correctly.', error);
    return jsonResponse({ error: 'Community support options are temporarily unavailable.' }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!tipsAreEnabled()) {
    return jsonResponse({ error: 'Community contributions are not enabled.' }, 503);
  }

  let configuration: ReturnType<typeof getConfiguration>;
  try {
    configuration = getConfiguration();
  } catch (error: unknown) {
    console.error('Community tip checkout is not configured.', error);
    return jsonResponse({ error: 'Community contributions are temporarily unavailable.' }, 503);
  }

  const origin = request.headers.get('origin');
  if (!origin || origin !== configuration.appUrl.origin) {
    return jsonResponse({ error: 'Request origin is not allowed.' }, 403);
  }
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return jsonResponse({ error: 'Expected a JSON request.' }, 415);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > 1024) {
    return jsonResponse({ error: 'Request is too large.' }, 413);
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 1024) {
      return jsonResponse({ error: 'Request is too large.' }, 413);
    }
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('option' in body) ||
    !isTipOption(body.option)
  ) {
    return jsonResponse({ error: 'Choose one of the listed contribution amounts.' }, 400);
  }

  const option = body.option;
  const selectedTip = tipOptions[option];
  const priceId = process.env[selectedTip.priceEnvironmentKey];
  if (!priceId) {
    console.error(`Community tip checkout is missing ${selectedTip.priceEnvironmentKey}.`);
    return jsonResponse({ error: 'Community contributions are temporarily unavailable.' }, 503);
  }

  try {
    const price = await configuration.stripe.prices.retrieve(priceId);
    if (
      !price.active ||
      price.type !== 'one_time' ||
      price.currency !== 'usd' ||
      price.unit_amount !== selectedTip.amountCents
    ) {
      throw new Error(`${selectedTip.priceEnvironmentKey} must be an active one-time USD price for the listed amount.`);
    }

    const session = await configuration.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { tip_option: option },
      submit_type: 'donate',
      allow_promotion_codes: false,
      success_url: new URL('/?tip=success', configuration.appUrl).toString(),
      cancel_url: new URL('/?tip=cancelled', configuration.appUrl).toString(),
    });
    if (!session.url) {
      throw new Error('Stripe did not return a Checkout URL.');
    }
    return jsonResponse({ url: session.url });
  } catch (error: unknown) {
    console.error('Community tip checkout creation failed.', error);
    return jsonResponse({ error: 'Secure checkout could not be started. Please try again later.' }, 502);
  }
}
