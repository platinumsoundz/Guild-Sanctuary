import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CURRENT_TERMS_VERSION,
  isApprovedTermsVersion,
  isMissingTermsTableError,
  isTermsAcceptanceRequired,
} from './terms';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('terms configuration', () => {
  it('keeps acceptance off by default', () => {
    vi.stubEnv('NEXT_PUBLIC_TERMS_REQUIRED', undefined as unknown as string);
    expect(isTermsAcceptanceRequired()).toBe(false);
  });

  it('only enables acceptance for the exact string true', () => {
    vi.stubEnv('NEXT_PUBLIC_TERMS_REQUIRED', 'true');
    expect(isTermsAcceptanceRequired()).toBe(true);

    for (const value of ['false', '1', 'yes', 'TRUE', '']) {
      vi.stubEnv('NEXT_PUBLIC_TERMS_REQUIRED', value);
      expect(isTermsAcceptanceRequired()).toBe(false);
    }
  });

  it('pins a version that the terms_acceptances CHECK constraint accepts', () => {
    // The migration constraint is
    //   terms_version = 'sanctuary-terms-draft-2026-10-26'
    // and a different string here would make every insert fail.
    expect(CURRENT_TERMS_VERSION).toBe('sanctuary-terms-draft-2026-10-26');
    expect(isApprovedTermsVersion(CURRENT_TERMS_VERSION)).toBe(true);
  });
});

describe('isApprovedTermsVersion', () => {
  it('rejects missing and non-string values', () => {
    expect(isApprovedTermsVersion(null)).toBe(false);
    expect(isApprovedTermsVersion(undefined)).toBe(false);
    expect(isApprovedTermsVersion(42 as unknown as string)).toBe(false);
  });

  it('rejects versions outside the safe character set or length', () => {
    expect(isApprovedTermsVersion('')).toBe(false);
    expect(isApprovedTermsVersion('v1')).toBe(false);
    expect(isApprovedTermsVersion('2026 10 26 draft')).toBe(false);
    expect(isApprovedTermsVersion('terms/2026')).toBe(false);
    expect(isApprovedTermsVersion("terms'; drop table profiles; --")).toBe(false);
    expect(isApprovedTermsVersion('a'.repeat(41))).toBe(false);
  });

  it('accepts tagged version strings', () => {
    expect(isApprovedTermsVersion('2026-10-26-draft')).toBe(true);
    expect(isApprovedTermsVersion('sanctuary-terms-draft-2026-10-26')).toBe(true);
    expect(isApprovedTermsVersion('v1.2.3')).toBe(true);
    expect(isApprovedTermsVersion('a'.repeat(40))).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(isApprovedTermsVersion('  2026-10-26  ')).toBe(true);
  });
});

describe('isMissingTermsTableError', () => {
  it('treats an absent remote flag and null error as not missing', () => {
    expect(isMissingTermsTableError(null)).toBe(false);
  });

  it('recognises both PostgREST and PostgreSQL missing-table errors', () => {
    expect(isMissingTermsTableError({ code: 'PGRST205', message: 'Could not find the table' })).toBe(true);
    expect(isMissingTermsTableError({ code: '42P01', message: 'relation does not exist' })).toBe(true);
    expect(isMissingTermsTableError({
      message: "Could not find the table 'public.terms_acceptances' in the schema cache",
    })).toBe(true);
    expect(isMissingTermsTableError({
      message: 'relation "public.terms_acceptances" does not exist',
    })).toBe(true);
  });

  it('does not hide unrelated failures such as a permission error', () => {
    expect(isMissingTermsTableError({ code: '42501', message: 'permission denied for table terms_acceptances' }))
      .toBe(false);
    expect(isMissingTermsTableError({ code: '23505', message: 'duplicate key value violates unique constraint' }))
      .toBe(false);
  });
});
