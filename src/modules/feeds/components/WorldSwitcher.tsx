'use client';

import { useState } from 'react';
import type { WorldType } from '@/types';
import { WorldFeed } from './WorldFeed';
import styles from './WorldSwitcher.module.css';

const worlds: { type: WorldType; name: string; descriptor: string; mark: string }[] = [
  { type: 'sanctuary', name: 'The Sanctuary', descriptor: 'Reflect & grow', mark: 'S' },
  { type: 'guild', name: 'The Guild Hall', descriptor: 'Play & connect', mark: 'G' },
];

export function WorldSwitcher() {
  const [activeWorld, setActiveWorld] = useState<WorldType>('sanctuary');

  return (
    <div className={styles.worldApp} data-world={activeWorld}>
      <header className={styles.header}>
        <p className={styles.headerLabel}>CHOOSE YOUR WORLD</p>
        <nav className={styles.switcher} aria-label="Choose a world">
          {worlds.map((world) => (
            <button
              key={world.type}
              className={styles.worldButton}
              type="button"
              aria-pressed={activeWorld === world.type}
              onClick={() => setActiveWorld(world.type)}
            >
              <span className={styles.worldMark} aria-hidden="true">{world.mark}</span>
              <span className={styles.worldCopy}>
                <span className={styles.worldName}>{world.name}</span>
                <span className={styles.worldDescriptor}>{world.descriptor}</span>
              </span>
            </button>
          ))}
        </nav>
      </header>
      <WorldFeed worldType={activeWorld} />
    </div>
  );
}