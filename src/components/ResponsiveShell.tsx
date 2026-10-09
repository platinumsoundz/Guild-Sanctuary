'use client';

import type { ReactNode } from 'react';
import styles from './ResponsiveShell.module.css';

interface ResponsiveShellProps {
  children: ReactNode;
}

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  return (
    <div className={`${styles.workspace} w-full min-w-0 max-w-full overflow-x-clip`}>
      <header className={styles.toolbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">G</span>
          <span className={styles.brandName}>GUILD <span>/</span> SANCTUARY</span>
        </div>
      </header>
      <div className={`${styles.stage} w-full min-w-0 max-w-full`}>
        <div className={`${styles.viewport} w-full min-w-0 max-w-full overflow-x-clip`}>
          {children}
        </div>
      </div>
    </div>
  );
}