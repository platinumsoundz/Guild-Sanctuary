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
type InstallPlatform = 'ios' | 'android' | 'desktop';

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [installPlatform, setInstallPlatform] = useState<InstallPlatform>('desktop');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setInstallPlatform(isIOS ? 'ios' : /Android/i.test(userAgent) ? 'android' : 'desktop');

    let wasHidden = false;
    try {
      wasHidden = window.localStorage.getItem(HIDDEN_KEY) === 'true';
    } catch {
      // The banner remains dismissible for the current session if storage is blocked.
    }
    if (standalone || wasHidden) return;

    setShowInstallBanner(true);

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallHelp(false);
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setShowInstallBanner(false);
      setInstallEvent(null);
      try {
        window.localStorage.setItem(HIDDEN_KEY, 'true');
      } catch {
        // Installation still hides the banner for this session.
      }
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
    try {
      window.localStorage.setItem(HIDDEN_KEY, 'true');
    } catch {
      // The close control still works for this session if storage is unavailable.
    }
  };

  const installApp = async () => {
    if (!installEvent) {
      setInstallHelp(true);
      return;
    }
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === 'accepted') {
        hideInstallBanner();
      } else {
        setInstallHelp(true);
      }
    } catch {
      setInstallEvent(null);
      setInstallHelp(true);
    }
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
                  ? installPlatform === 'ios'
                    ? 'In Safari, tap Share, then choose “Add to Home Screen”.'
                    : installPlatform === 'android'
                      ? 'Open your browser menu and choose “Install app” or “Add to Home screen”.'
                      : 'Open your browser menu and choose “Install The Sanctuary” or “Install page as app”.'
                  : 'Install the app for quicker access from your home screen.'}
              </p>
            </div>
          </div>
          <div className={styles.installActions}>
            <button className={styles.installButton} type="button" onClick={installHelp ? hideInstallBanner : installApp}>
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
