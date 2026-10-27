'use client';

import { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import styles from './PwaInstallBanner.module.css';

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string };
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const DISMISS_KEY = 'sanctuary:pwa-install-dismissed:v1';

export function PwaInstallBanner() {
  const [canShow, setCanShow] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const android = /Android/i.test(navigator.userAgent);
    const chromium = /Chrome|Chromium|Edg|OPR|SamsungBrowser/i.test(navigator.userAgent);

    setInstalled(standalone);
    setIsIOS(ios);
    setIsAndroid(android);
    setCanShow(ios || android || chromium);
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === 'true');
    } catch {
      setDismissed(false);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanShow(true);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setCanShow(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const hideInstallOption = () => {
    setDismissed(true);
    setCanShow(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // The close control still works for this session if storage is unavailable.
    }
  };

  const install = async () => {
    if (!installPrompt) {
      setShowInstructions((visible) => !visible);
      return;
    }
    setIsPrompting(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') {
        hideInstallOption();
      }
    } finally {
      setIsPrompting(false);
    }
  };

  if (!canShow || dismissed || installed) return null;

  return (
    <aside className={styles.banner} aria-label="Install The Sanctuary">
      <span className={styles.icon} aria-hidden="true">
        {isIOS && !installPrompt ? <Share2 size={18} /> : <Download size={18} />}
      </span>
      <div className={styles.copy}>
        <strong>Install The Sanctuary</strong>
        <p>Keep your community close with quicker access from your home screen.</p>
        {showInstructions && isIOS && (
          <p className={styles.instructions}>
            {isIOS ? <>In Safari, tap Share, then choose <strong>Add to Home Screen</strong>.</> : isAndroid ? 'Open your browser menu and choose Install app or Add to Home screen.' : 'Open the browser menu and choose Install The Sanctuary or Install page as app.'}
          </p>
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.installButton} type="button" onClick={() => void install()} disabled={isPrompting}>
          {isPrompting ? 'Opening…' : installPrompt ? 'Install' : 'How to install'}
        </button>
        <button className={styles.closeButton} type="button" aria-label="Hide install option" onClick={hideInstallOption}>
          <X size={17} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
