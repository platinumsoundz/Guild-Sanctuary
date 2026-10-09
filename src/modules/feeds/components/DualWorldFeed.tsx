'use client';

import { useAppContext } from '@/context/AppContext';
import { WorldFeed } from './WorldFeed';

export function DualWorldFeed() {
  const { activeWorld } = useAppContext();

  return <WorldFeed worldType={activeWorld} />;
}