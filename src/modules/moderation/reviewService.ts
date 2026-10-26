import { getSupabaseBrowserClient } from '@/services/supabase';
import type { TokenPurchaseReviewRow } from '@/services/supabase/database.types';

export interface PurchaseReview extends TokenPurchaseReviewRow {
  username?: string;
  displayName?: string;
}

export async function fetchPurchaseReviews(
  status: 'open' | 'resolved' | 'dismissed' | null = 'open',
): Promise<PurchaseReview[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('admin_list_purchase_reviews', {
    requested_status: status,
  });
  if (error) throw new Error(error.message || 'Purchase reviews could not be loaded.');
  return data ?? [];
}

export async function resolvePurchaseReview(
  reviewId: string,
  status: 'resolved' | 'dismissed',
  notes: string,
): Promise<void> {
  const trimmed = notes.trim();
  if (trimmed.length < 3 || trimmed.length > 2000) {
    throw new Error('Add resolution notes between 3 and 2,000 characters.');
  }
  const { error } = await getSupabaseBrowserClient().rpc('admin_resolve_purchase_review', {
    requested_review_id: reviewId,
    requested_status: status,
    requested_notes: trimmed,
  });
  if (error) throw new Error(error.message || 'The purchase review could not be updated.');
}
