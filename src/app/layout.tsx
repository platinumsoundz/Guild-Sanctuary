import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Guild & Sanctuary',
  description: 'A shared space for spiritual growth, gaming, and community.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}