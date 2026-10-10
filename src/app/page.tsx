import { AppWorkspace } from '@/components/AppWorkspace'
import SanctuaryFeed from '@/components/SanctuaryFeed'
import CheckoutButton from '@/components/CheckoutButton'

export default function Home() {
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

      {/* Main App Workspace or Feed */}
      <div className="grid gap-8">
        <AppWorkspace />
        <SanctuaryFeed />
      </div>
    </main>
  )
}