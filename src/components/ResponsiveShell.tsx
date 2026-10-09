'use client';

import { useState, type ReactNode } from 'react';
import styles from './ResponsiveShell.module.css';

interface ResponsiveShellProps {
  children: ReactNode;
}

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  const [isMobilePreview, setIsMobilePreview] = useState(false);

  return (
    <div className={`${styles.workspace} w-full min-w-0 max-w-full overflow-x-clip`}>
      <header className={styles.toolbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">G</span>
          <span className={styles.brandName}>GUILD <span>/</span> SANCTUARY</span>
        </div>
        <button
          className={styles.previewButton}
          type="button"
          aria-pressed={isMobilePreview}
          onClick={() => setIsMobilePreview((preview) => !preview)}
        >
          <span className={styles.previewGlyph} aria-hidden="true" />
          {isMobilePreview ? 'Full-width view' : 'Mobile preview'}
        </button>
      </header>
      <div className={`${styles.stage} w-full min-w-0 max-w-full ${isMobilePreview ? styles.mobileStage : ''}`}>
        <div className={`${styles.viewport} w-full min-w-0 max-w-full overflow-x-clip ${isMobilePreview ? styles.mobileViewport : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}