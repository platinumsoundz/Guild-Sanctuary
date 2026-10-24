'use client';

import { AppWorkspace } from '@/components/AppWorkspace';
import { useAppContext } from '@/context/AppContext';

export default function Home() {
  const { loginAsGuest, isAuthenticated } = useAppContext();

  return (
    <main className="min-h-screen">
      {!isAuthenticated && (
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 border-b border-neutral-800 px-6 py-4 md:px-12">
          <div>
            <h1 className="text-lg font-black tracking-tight">The Sanctuary</h1>
            <p className="text-xs text-neutral-400">A quieter community space for reflection and connection.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/guidelines"
              className="hidden text-xs font-semibold text-neutral-400 transition hover:text-white sm:inline"
            >
              Community guidelines
            </a>
            <button
              type="button"
              onClick={loginAsGuest}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-700"
            >
              Explore as guest
            </button>
          </div>
        </div>
      )}
      <AppWorkspace />
    </main>
  );
}
