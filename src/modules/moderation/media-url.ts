/**
 * Client-side guard for moderation media links.
 *
 * This is a presentation-layer safety check only. The server must validate
 * media origins and access independently; a valid HTTPS URL is not proof that
 * a resource is trusted or authorized.
 */
export function getSafeModerationMediaUrl(value: string | null | undefined): string | null {
  if (!value || value.length > 4096) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
