'use client';

import { useState } from 'react';

interface AccountDeletionNoticeProps {
  purgeAfter: string;
  onRestore: () => Promise<void>;
  onSignOut: () => void;
}

export function AccountDeletionNotice({ purgeAfter, onRestore, onSignOut }: AccountDeletionNoticeProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const purgeDate = new Date(purgeAfter).toLocaleString('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const restore = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      await onRestore();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Your account could not be restored.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">Account deletion scheduled</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Your profile is hidden</h1>
      <p className="mt-4 text-neutral-300">
        Your profile, posts, Shorts, events, and comments are hidden from the community now. The account
        and its media will be permanently purged on <strong className="text-white">{purgeDate}</strong>.
      </p>
      <p className="mt-3 text-neutral-400">
        Changed your mind? Restore the account before that date. After the grace period ends, deletion is final.
      </p>
      {error && <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" role="alert">{error}</p>}
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => void restore()}
          disabled={isRestoring}
        >
          {isRestoring ? 'Restoring…' : 'Restore my account'}
        </button>
        <button
          className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm text-neutral-200 hover:border-neutral-500"
          type="button"
          onClick={onSignOut}
        >
          Sign out and continue deletion
        </button>
      </div>
    </main>
  );
}
