export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Serves a root-level ads.txt only when the publisher ID is explicitly set
 * for this deployment. Do not derive the identity from the repository fallback.
 */
export function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

  if (!clientId || !/^ca-pub-\d+$/.test(clientId)) {
    return new Response('AdSense publisher is not configured.\n', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const publisherId = `pub-${clientId.slice('ca-pub-'.length)}`;
  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
