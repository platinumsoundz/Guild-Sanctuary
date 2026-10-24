import { ImageResponse } from 'next/og';
import { createSanctuaryPwaIcon } from '@/lib/sanctuaryPwaIcon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(createSanctuaryPwaIcon(size.width), size);
}
