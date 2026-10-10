import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guild & Sanctuary',
  description: 'An intentional, privacy-focused 3D browser space.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}