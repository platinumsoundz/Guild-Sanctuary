'use client';

import { getSupabaseBrowserClient } from '@/services/supabase';
import { isApprovedTermsVersion } from './terms';

export interface TermsAcceptance {
  termsVersion: string;
  termsAcceptedAt: string;
}

export async function recordTermsAcceptance(version: string): Promise<TermsAcceptance> {
  const trimmed = version.trim();
  if (!isApprovedTermsVersion(trimmed)) {
    throw new Error('The terms version is not valid.');
  }
  const { data, error } = await getSupabaseBrowserClient().rpc('record_terms_acceptance', {
    requested_version: trimmed,
  });
  if (error) throw new Error(error.message || 'Your terms acceptance could not be recorded.');
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.terms_version !== 'string' || typeof result.terms_accepted_at !== 'string') {
    throw new Error('Your terms acceptance could not be confirmed.');
  }
  return {
    termsVersion: result.terms_version,
    termsAcceptedAt: result.terms_accepted_at,
  };
}

export async function requestAccountDeletion(): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc('request_account_deletion');
  if (error) throw new Error(error.message || 'Account deletion could not be scheduled.');
  if (typeof data !== 'string') throw new Error('Account deletion did not return a purge date.');
  return data;
}

export async function cancelAccountDeletion(): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc('cancel_account_deletion');
  if (error) throw new Error(error.message || 'Your account could not be restored.');
}
