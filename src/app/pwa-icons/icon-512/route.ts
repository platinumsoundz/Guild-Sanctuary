import { ImageResponse } from 'next/og';
import { createSanctuaryPwaIcon } from '@/lib/sanctuaryPwaIcon';

export function GET() {
  const size = 512;
  return new ImageResponse(createSanctuaryPwaIcon(size), { width: size, height: size });
}
