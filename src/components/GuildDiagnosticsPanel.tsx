'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, Gamepad2, Keyboard, MonitorSmartphone, Volume2 } from 'lucide-react';
import { getConnectedGamepad } from '@/lib/controllerInput';
import styles from './GuildDiagnosticsPanel.module.css';

type ControllerSnapshot = {
  supported: boolean;
  connected: boolean;
  id: string;
  mapping: string;
  axes: number;
  buttons: number;
};

const EMPTY_SNAPSHOT: ControllerSnapshot = {
  supported: false,
  connected: false,
  id: '',
  mapping: '',
  axes: 0,
  buttons: 0,
};

/**
 * Read-only device diagnostics for the Guild Quick Menu. Audio is only played
 * after an explicit click; no microphone or device scanning is performed.
 */
export function GuildDiagnosticsPanel() {
  const [controller, setController] = useState(EMPTY_SNAPSHOT);
  const [audioMessage, setAudioMessage] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);

  const refreshController = useCallback(() => {
    const supported = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';
    const pad = supported ? getConnectedGamepad() : null;
    setController({
      supported,
      connected: Boolean(pad),
      id: pad?.id ?? '',
      mapping: pad?.mapping || 'standard / browser-defined',
      axes: pad?.axes.length ?? 0,
      buttons: pad?.buttons.length ?? 0,
    });
  }, []);

  useEffect(() => {
    refreshController();
    window.addEventListener('gamepadconnected', refreshController);
    window.addEventListener('gamepaddisconnected', refreshController);
    const poll = window.setInterval(refreshController, 1200);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('gamepadconnected', refreshController);
      window.removeEventListener('gamepaddisconnected', refreshController);
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== 'closed') void context.close();
    };
  }, [refreshController]);

  const playAudioTest = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      setAudioMessage('This browser does not support the built-in audio test.');
      return;
    }

    try {
      const oldContext = audioContextRef.current;
      if (oldContext && oldContext.state !== 'closed') await oldContext.close();
      const context = new AudioContextConstructor();
      audioContextRef.current = context;
      await context.resume();

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.02);
      gain.gain.setValueAtTime(0.045, context.currentTime + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.21);
      oscillator.onended = () => {
        if (audioContextRef.current === context) {
          audioContextRef.current = null;
          void context.close();
        }
      };
      setAudioMessage('A short test tone was played. If you heard nothing, check device volume and mute settings.');
    } catch {
      setAudioMessage('The audio test could not start. Try again after interacting with the page, or check browser audio permissions.');
    }
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="guild-diagnostics-title">
      <div className={styles.heading}>
        <span className={styles.headingIcon}><Gamepad2 size={16} /></span>
        <div><h3 id="guild-diagnostics-title">Device diagnostics</h3><p>Local checks · nothing is uploaded</p></div>
      </div>

      <div className={styles.deviceRow}>
        <span className={styles.deviceIcon}><Gamepad2 size={16} /></span>
        <div className={styles.deviceCopy}>
          <strong>Controller</strong>
          <span>{!controller.supported ? 'Gamepad API unavailable in this browser' : controller.connected ? 'Connected' : 'No controller detected'}</span>
          {controller.connected && <small>{controller.id || 'Controller'} · {controller.mapping} mapping · {controller.buttons} buttons · {controller.axes} axes</small>}
        </div>
        <span className={controller.connected ? styles.online : styles.neutral}>{controller.connected ? 'READY' : controller.supported ? 'WAITING' : 'N/A'}</span>
      </div>

      <div className={styles.deviceRow}>
        <span className={styles.deviceIcon}><Keyboard size={16} /></span>
        <div className={styles.deviceCopy}><strong>Keyboard input</strong><span>Shortcut: Ctrl / ⌘ + K opens Quick Menu</span></div>
        <span className={styles.neutral}>READY</span>
      </div>

      <div className={styles.deviceRow}>
        <span className={styles.deviceIcon}><MonitorSmartphone size={16} /></span>
        <div className={styles.deviceCopy}><strong>Touch input</strong><span>Use the Controls pad for navigation and selection on touch devices.</span></div>
        <span className={styles.neutral}>READY</span>
      </div>

      <div className={styles.audioRow}>
        <div className={styles.deviceIcon}><Volume2 size={16} /></div>
        <div className={styles.deviceCopy}><strong>Audio output</strong><span>Plays a brief tone only when you request a test.</span></div>
        <button type="button" onClick={() => void playAudioTest()}><AudioLines size={15} /> Test sound</button>
      </div>
      {audioMessage && <p className={styles.audioMessage} role="status" aria-live="polite>{audioMessage}</p>}
    </section>
  );
}
