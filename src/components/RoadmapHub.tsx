'use client';

import { useState } from 'react';
import { Compass, Gamepad2 } from 'lucide-react';
import { SanctuaryRoadmap } from '@/components/SanctuaryRoadmap';
import { GuildRoadmap } from '@/components/GuildRoadmap';
import styles from './RoadmapHub.module.css';

type RoadmapKind = 'sanctuary' | 'guild';

export function RoadmapHub({ initialView = 'sanctuary' }: { initialView?: RoadmapKind }) {
  const [view, setView] = useState<RoadmapKind>(initialView);
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>ONE PLACE FOR PROJECT DIRECTION</p>
        <h1>Roadmaps</h1>
        <p>See what is available, what is being built, and what still needs verification across Sanctuary and the Guild.</p>
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Choose a roadmap">
        <button type="button" role="tab" aria-selected={view === 'sanctuary'} className={view === 'sanctuary' ? styles.activeTab : styles.tab} onClick={() => setView('sanctuary')}><Compass size={17} /> Sanctuary</button>
        <button type="button" role="tab" aria-selected={view === 'guild'} className={view === 'guild' ? styles.activeTab : styles.tab} onClick={() => setView('guild')}><Gamepad2 size={17} /> Guild & games</button>
      </div>
      <section role="tabpanel" aria-label={view === 'sanctuary' ? 'Sanctuary roadmap' : 'Guild and games roadmap'}>
        {view === 'sanctuary' ? <SanctuaryRoadmap /> : <GuildRoadmap />}
      </section>
    </main>
  );
}
