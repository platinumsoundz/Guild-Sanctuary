import { ImageResponse } from 'next/og';
import { createSanctuaryPwaIcon } from '@/lib/sanctuaryPwaIcon';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(createSanctuaryPwaIcon(size.width), size);
}
