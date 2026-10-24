import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AppContextProvider } from '@/context/AppContext'
import { PwaInstallHelp } from '@/components/PwaInstallHelp'
import { AdsConsent } from '@/modules/ads/AdsConsent'

const adsEnabled =
  process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true' &&
  process.env.VERCEL_ENV === 'production'

export const metadata: Metadata = {
  title: 'The Sanctuary',
  applicationName: 'The Sanctuary',
  description: 'An intentional, privacy-focused community space for reflection and connection.',
  appleWebApp: {
    capable: true,
    title: 'The Sanctuary',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0b2b20',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen antialiased">
        <PwaInstallHelp />
        <AppContextProvider>
          {children}
        </AppContextProvider>
        <AdsConsent enabled={adsEnabled} />
        <Analytics />
      </body>
    </html>
  )
}
