/**
 * Terms acceptance is deliberately configuration-gated.
 *
 * The public /terms page is still a marked draft. Keep
 * NEXT_PUBLIC_TERMS_REQUIRED unset (or false) until the operator details,
 * jurisdiction, age, consumer, refund, and privacy wording have been approved
 * and confirmed by qualified review. Turning the flag on requires the approved
 * page to replace the draft first.
 *
 * The version string is pinned by a CHECK constraint on
 * public.terms_acceptances, so changing it requires a migration.
 */
export const CURRENT_TERMS_VERSION = 'sanctuary-terms-draft-2026-10-26';

export function isTermsAcceptanceRequired(): boolean {
  return process.env.NEXT_PUBLIC_TERMS_REQUIRED === 'true';
}

export function isApprovedTermsVersion(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  return /^[A-Za-z0-9._-]{4,40}$/.test(value.trim());
}

/**
 * Detect a project where public.terms_acceptances has not been applied yet.
 * PostgREST reports a missing table through its schema cache before Postgres
 * ever sees the query, so both codes matter.
 */
export function isMissingTermsTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  return /could not find the table|relation .* does not exist/i.test(error.message ?? '');
}
