import './globals.css'
import type { Metadata, Viewport } from 'next'
import { AppContextProvider } from '@/context/AppContext'
import { PwaServiceWorker } from '@/components/PwaServiceWorker'
import { AdSenseScript } from '@/modules/ads/AdSenseScript'
import { THEME_PREFERENCES, THEME_CATALOGUE } from '@/lib/themes'

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
  themeColor: '#080b1b',
  colorScheme: 'light dark',
}

const themeBootstrap = `
(() => {
  try {
    const saved = window.localStorage.getItem('sanctuary-theme');
    const supported = ${JSON.stringify(THEME_PREFERENCES)};
    const preference = supported.includes(saved) ? saved : 'dark';
    const theme = preference === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : preference;
    const definitions = ${JSON.stringify(THEME_CATALOGUE.map(({id,colorScheme,tailwindDark})=>({id,colorScheme,tailwindDark})))};
    const definition = definitions.find((item) => item.id === theme) || definitions[0];
    document.documentElement.dataset.theme = definition.id;
    document.documentElement.style.colorScheme = definition.colorScheme;
    document.documentElement.dataset.layout = 'comfortable';
    document.documentElement.classList.toggle('dark', definition.tailwindDark);
  } catch {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.dataset.layout = 'comfortable';
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
