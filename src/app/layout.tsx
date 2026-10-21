import './globals.css'
import type { Metadata } from 'next'
import { AppContextProvider } from '@/context/AppContext'
import { AdSenseScript } from '@/modules/ads/AdSenseScript'

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
        <AdSenseScript />
        <AppContextProvider>
          {children}
        </AppContextProvider>
      </body>
    </html>
  )
}