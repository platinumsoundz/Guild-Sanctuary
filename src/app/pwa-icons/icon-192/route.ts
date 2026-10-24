import { ImageResponse } from 'next/og';
import { createSanctuaryPwaIcon } from '@/lib/sanctuaryPwaIcon';

export function GET() {
  const size = 192;
  return new ImageResponse(createSanctuaryPwaIcon(size), { width: size, height: size });
}
