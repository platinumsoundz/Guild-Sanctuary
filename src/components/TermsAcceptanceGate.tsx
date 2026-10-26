'use client';

import Link from 'next/link';
import { useState } from 'react';

interface TermsAcceptanceGateProps {
  version: string;
  onAccept: (version: string) => Promise<void>;
  onSignOut: () => void;
}

export function TermsAcceptanceGate({ version, onAccept, onSignOut }: TermsAcceptanceGateProps) {
  const [accepted, setAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onAccept(version);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your acceptance could not be recorded.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">One more step</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Accept the community terms</h1>
      <p className="mt-4 text-neutral-300">
        To continue using The Sanctuary, confirm that you are 13 or older and accept the Terms, Privacy
        Notice, and Community Guidelines.
      </p>
      <ul className="mt-4 flex flex-wrap gap-4 text-sm text-emerald-300">
        <li><Link className="underline underline-offset-4" href="/terms" target="_blank">Terms</Link></li>
        <li><Link className="underline underline-offset-4" href="/privacy" target="_blank">Privacy Notice</Link></li>
        <li><Link className="underline underline-offset-4" href="/guidelines" target="_blank">Community Guidelines</Link></li>
      </ul>
      <p className="mt-3 text-xs text-neutral-500">
        Document version <code className="text-neutral-400">{version}</code> will be stored with a
        server-recorded time against your account.
      </p>
      <label className="mt-7 flex items-start gap-3 text-sm text-neutral-300">
        <input
          className="mt-1 h-4 w-4 accent-emerald-500"
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.currentTarget.checked)}
        />
        <span>I am 13 or older and accept these documents.</span>
      </label>
      {error && <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" role="alert">{error}</p>}
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => void submit()}
          disabled={!accepted || isSaving}
        >
          {isSaving ? 'Recording…' : 'Accept and continue'}
        </button>
        <button
          className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm text-neutral-200 hover:border-neutral-500"
          type="button"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
