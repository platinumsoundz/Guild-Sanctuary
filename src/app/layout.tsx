import './globals.css'
import type { Metadata, Viewport } from 'next'
import { AppContextProvider } from '@/context/AppContext'
import { PwaServiceWorker } from '@/components/PwaServiceWorker'
import { AdSenseScript } from '@/modules/ads/AdSenseScript'

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
  colorScheme: 'light dark',
}

const themeBootstrap = `
(() => {
  try {
    const saved = window.localStorage.getItem('sanctuary-theme');
    const theme = saved === 'light' || saved === 'dark' || saved === 'dusk' ? saved : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme !== 'light');
  } catch {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className="min-h-screen antialiased">
        <AdSenseScript />
        <PwaServiceWorker />
        <AppContextProvider>
          {children}
        </AppContextProvider>
      </body>
    </html>
  )
}
