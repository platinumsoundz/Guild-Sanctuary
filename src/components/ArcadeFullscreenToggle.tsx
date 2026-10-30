'use client';

import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export function ArcadeFullscreenToggle() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(Boolean(document.fullscreenEnabled));
    const sync = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = async () => {
    const target = document.fullscreenElement
      ? document.fullscreenElement
      : document.querySelector<HTMLElement>('[data-arcade-fullscreen]:focus-within') ??
        document.querySelector<HTMLElement>('[data-arcade-fullscreen]');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (target?.requestFullscreen) await target.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      setActive(Boolean(document.fullscreenElement));
    }
  };

  return (
    <button type="button" onClick={toggle} disabled={!supported} aria-label={active ? 'Exit fullscreen' : 'Enter fullscreen'} aria-pressed={active} title={supported ? (active ? 'Exit fullscreen' : 'Play fullscreen') : 'Fullscreen is not supported in this browser'}>
      {active ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      {active ? 'Exit fullscreen' : 'Fullscreen'}
    </button>
  );
}
