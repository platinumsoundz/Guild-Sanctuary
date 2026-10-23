import './globals.css'
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AppContextProvider } from '@/context/AppContext'
import { AdsConsent } from '@/modules/ads/AdsConsent'

export const metadata: Metadata = {
  title: 'The Sanctuary',
  description: 'An intentional, privacy-focused community space for reflection and connection.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen antialiased">
        <AppContextProvider>
          {children}
        </AppContextProvider>
        <AdsConsent />
        <Analytics />
      </body>
    </html>
  )
}
