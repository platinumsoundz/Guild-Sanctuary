import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AppContextProvider } from '@/context/AppContext'
import { PwaInstallHelp } from '@/components/PwaInstallHelp'
import { AdsConsent } from '@/modules/ads/AdsConsent'
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_ENABLED,
  isAdsProductionDeployment,
  isValidAdsenseClientId,
} from '@/modules/ads/config'

const adsEnabled =
  ADSENSE_ENABLED &&
  isAdsProductionDeployment() &&
  isValidAdsenseClientId(ADSENSE_CLIENT_ID)

export const metadata: Metadata = {
  title: 'The Sanctuary',
  applicationName: 'The Sanctuary',
  description: 'An intentional, privacy-focused community space for reflection and connection.',
  appleWebApp: {
    capable: true,
    title: 'The Sanctuary',
    statusBarStyle: 'black-translucent',
  },
  ...(adsEnabled
    ? {
        other: {
          'google-adsense-account': ADSENSE_CLIENT_ID,
        },
      }
    : {}),
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
