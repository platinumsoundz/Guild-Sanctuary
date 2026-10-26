'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Download, X } from 'lucide-react';
import styles from './ResponsiveShell.module.css';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface ResponsiveShellProps {
  children: ReactNode;
}

const HIDDEN_KEY = 'sanctuary-install-banner-hidden';

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || window.localStorage.getItem(HIDDEN_KEY) === 'true') return;

    setShowInstallBanner(true);

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setShowInstallBanner(false);
      setInstallEvent(null);
      window.localStorage.setItem(HIDDEN_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const hideInstallBanner = () => {
    setShowInstallBanner(false);
    window.localStorage.setItem(HIDDEN_KEY, 'true');
  };

  const installApp = async () => {
    if (!installEvent) {
      setInstallHelp(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') hideInstallBanner();
    setInstallEvent(null);
  };

  return (
    <div className={`${styles.workspace} w-full min-w-0 max-w-full overflow-x-clip`}>
      {showInstallBanner && (
        <aside className={styles.installBanner} aria-label="Install Sanctuary app">
          <div className={styles.installCopy}>
            <span className={styles.installIcon} aria-hidden="true"><Download size={17} /></span>
            <div>
              <p className={styles.installTitle}>Take Sanctuary with you</p>
              <p className={styles.installDescription}>
                {installHelp
                  ? 'Use your browser menu and choose “Install app” or “Add to Home Screen”.'
                  : 'Install the app for quicker access from your home screen.'}
              </p>
            </div>
          </div>
          <div className={styles.installActions}>
            <button className={styles.installButton} type="button" onClick={installApp}>
              {installHelp ? 'Got it' : 'Install'}
            </button>
            <button className={styles.hideInstallButton} type="button" aria-label="Hide install option" onClick={hideInstallBanner}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}
      <div className={`${styles.stage} w-full min-w-0 max-w-full`}>
        <div className={`${styles.viewport} w-full min-w-0 max-w-full overflow-x-clip`}>
          {children}
        </div>
      </div>
    </div>
  );
}
