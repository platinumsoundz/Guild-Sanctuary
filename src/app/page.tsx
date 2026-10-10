'use client';

import { AppWorkspace } from '@/components/AppWorkspace'
import SanctuaryFeed from '@/components/SanctuaryFeed'
import CheckoutButton from '@/components/CheckoutButton'
import { useAppContext } from '@/context/AppContext'

export default function Home() {
  const { loginAsGuest, isAuthenticated } = useAppContext();

  return (
    <main className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto space-y-8">
      {/* Top Navigation / Header */}
      <header className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Guild & Sanctuary</h1>
          <p className="text-sm text-neutral-400">Privacy-first 3D community space</p>
        </div>
        <CheckoutButton priceId="price_1KbqZnRf52sa89N2..." />
      </header>

      {/* Guest Mode Callout (shows if not logged in) */}
      {!isAuthenticated && (
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Bypass Verification Limits</h3>
            <p className="text-xs text-neutral-400">Jump right into the workspace without waiting for an email link.</p>
          </div>
          <button
            type="button"
            onClick={loginAsGuest}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold px-4 py-2 rounded-lg border border-neutral-700 transition"
          >
            Continue as Guest
          </button>
        </div>
      )}

      {/* Main App Workspace or Feed */}
      <div className="grid gap-8">
        <AppWorkspace />
        <SanctuaryFeed />
      </div>
    </main>
  )
}