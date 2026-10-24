'use client';

import { useEffect, useState } from 'react';
import styles from './PwaInstallHelp.module.css';

interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallHelp() {
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const safariNavigator = navigator as Navigator & { standalone?: boolean };
    const updateInstalledState = () => {
      setIsInstalled(standaloneQuery.matches || safariNavigator.standalone === true);
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(isAppleMobile);
    updateInstalledState();
    standaloneQuery.addEventListener('change', updateInstalledState);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener('change', updateInstalledState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setIsInstalled(true);
    } catch {
      setInstructionsOpen(true);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <aside className={styles.installCard} aria-label="Install The Sanctuary">
      <div className={styles.actions}>
        {installPrompt && (
          <button className={styles.primaryButton} type="button" onClick={() => void installApp()}>
            Install The Sanctuary
          </button>
        )}
        <button
          className={styles.secondaryButton}
          type="button"
          aria-expanded={instructionsOpen}
          onClick={() => setInstructionsOpen((open) => !open)}
        >
          {instructionsOpen ? 'Hide install help' : installPrompt ? 'Installation help' : 'Install / Add to Home Screen'}
        </button>
        <button className={styles.closeButton} type="button" aria-label="Dismiss install help" onClick={() => setDismissed(true)}>
          ×
        </button>
      </div>
      {instructionsOpen && (
        <div className={styles.instructions}>
          {isIos ? (
            <p>In Safari, tap <strong>Share</strong>, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>. If you opened this in another iPhone or iPad browser and do not see that option, open the site in Safari.</p>
          ) : (
            <ul>
              <li>Android Chrome or Brave: open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Desktop Chrome, Brave, or Edge: use the install icon in the address bar or the browser menu.</li>
              <li>macOS Safari 17 or later: choose <strong>File → Add to Dock</strong>.</li>
              <li>Other browsers may offer a home-screen shortcut or bookmark instead of a standalone app.</li>
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
