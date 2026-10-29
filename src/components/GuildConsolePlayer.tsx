'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, AudioLines, Check, Gamepad2, Maximize2, Minimize2, Settings2, Volume2, X } from 'lucide-react';
import styles from './GuildConsolePlayer.module.css';

type Props = { title: string; url: string; onExit: () => void };
const HOME_BUTTON_CANDIDATES = [16];
const BUTTON_LABELS = ['A / Cross', 'B / Circle', 'X / Square', 'Y / Triangle'];

export function GuildConsolePlayer({ title, url, onExit }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const previousButtons = useRef<boolean[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [volume, setVolume] = useState(70);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [notice, setNotice] = useState('');

  const exitFullscreen = useCallback(async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); }
    catch { setNotice('Use your browser’s Back or fullscreen control if fullscreen cannot close here.'); }
  }, []);
  const returnHome = useCallback(async () => {
    await exitFullscreen();
    setMenuOpen(false);
    setSettingsOpen(false);
    onExit();
  }, [exitFullscreen, onExit]);
  const toggleFullscreen = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      if (document.fullscreenElement === stage) await document.exitFullscreen();
      else {
        if (document.fullscreenElement) await document.exitFullscreen();
        await stage.requestFullscreen();
      }
    } catch { setNotice('Fullscreen is not available in this browser or must be started from a direct tap.'); }
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  useEffect(() => {
    let active = true;
    let frame = 0;
    const poll = () => {
      if (!active) return;
      let pads: (Gamepad | null)[] = [];
      try { if (typeof navigator.getGamepads === 'function') pads = Array.from(navigator.getGamepads()); } catch { pads = []; }
      const pad = pads.find((candidate) => candidate?.connected) ?? null;
      setControllerConnected(Boolean(pad));
      if (pad) {
        const buttons = pad.buttons.map((button) => button.pressed || button.value > 0.65);
        if (HOME_BUTTON_CANDIDATES.some((index) => Boolean(buttons[index] && !previousButtons.current[index]))) setMenuOpen((open) => !open);
        previousButtons.current = buttons;
      } else previousButtons.current = [];
      frame = window.requestAnimationFrame(poll);
    };
    const connected = () => setControllerConnected(true);
    const disconnected = () => setControllerConnected(false);
    window.addEventListener('gamepadconnected', connected);
    window.addEventListener('gamepaddisconnected', disconnected);
    frame = window.requestAnimationFrame(poll);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('gamepadconnected', connected);
      window.removeEventListener('gamepaddisconnected', disconnected);
    };
  }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) setMenuOpen((open) => !open);
      if ((event.key === 'Home' || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g')) && !event.repeat) {
        event.preventDefault();
        setMenuOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={styles.stage} ref={stageRef} aria-label={`${title} game player`}>
      <div className={styles.topBar}>
        <button type="button" onClick={() => setMenuOpen(true)} className={styles.menuButton} aria-label="Open Guild system menu"><Gamepad2 size={18} /><span>The Guild</span></button>
        <div className={styles.gameTitle}>{title}</div>
        <div className={styles.actions}>
          <span className={styles.controllerState} aria-live="polite">{controllerConnected ? 'Controller connected' : 'Controller not detected'}</span>
          <button type="button" className={styles.iconButton} onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          <button type="button" className={styles.iconButton} onClick={() => void returnHome()} aria-label="Exit game to Guild home"><X size={18} /></button>
        </div>
      </div>
      <div className={styles.gameFrame}>
        <iframe src={url} title={title} allow="fullscreen; gamepad; pointer-lock; autoplay" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-fullscreen" />
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {menuOpen && <div className={styles.scrim} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
        <section className={styles.systemMenu} role="dialog" aria-modal="true" aria-labelledby="guild-menu-title">
          <header className={styles.menuHeader}><div><p className={styles.eyebrow}>SYSTEM MENU</p><h2 id="guild-menu-title">The Guild</h2></div><button type="button" className={styles.iconButton} onClick={() => setMenuOpen(false)} aria-label="Resume game"><X size={18} /></button></header>
          <p className={styles.menuSubhead}>Your game stays open behind this menu.</p>
          <button type="button" className={styles.menuAction} onClick={() => { setMenuOpen(false); setSettingsOpen(false); }}><Gamepad2 size={19} /><span><strong>Resume game</strong><small>Return to {title}</small></span></button>
          <button type="button" className={styles.menuAction} onClick={() => setSettingsOpen((open) => !open)}><Settings2 size={19} /><span><strong>Game and controller settings</strong><small>Input, sound and display options</small></span></button>
          {settingsOpen && <div className={styles.settingsPanel}>
            <label className={styles.settingRow}><span><Volume2 size={17} /> Guild music enabled</span><input type="checkbox" checked={musicEnabled} onChange={(event) => setMusicEnabled(event.target.checked)} /></label>
            <label className={styles.settingRow}><span>Guild music volume <strong>{volume}%</strong></span><input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
            <div className={styles.controllerDiagnostic}><AudioLines size={17} /><div><strong>{controllerConnected ? 'Controller detected' : 'No controller exposed to this page'}</strong><p>Home/Guide is available only when the browser exposes that button to the Gamepad API. Button labels vary by controller and browser.</p></div></div>
            <div className={styles.buttonLegend}>{BUTTON_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
            <p className={styles.finePrint}>Music controls apply to Guild-managed audio. They cannot directly mute audio produced inside a cross-origin game iframe.</p>
          </div>}
          <button type="button" className={styles.menuAction} onClick={() => void toggleFullscreen()}><Maximize2 size={19} /><span><strong>{isFullscreen ? 'Exit fullscreen' : 'Display fullscreen'}</strong><small>Expand or restore the game view</small></span></button>
          <button type="button" className={styles.exitAction} onClick={() => void returnHome()}><ArrowLeft size={19} /><span><strong>Exit to Guild home</strong><small>Close this game session</small></span></button>
          <footer className={styles.menuFooter}><Check size={15} /> Controller Home/Guide support varies by browser. The on-screen menu is always available.</footer>
        </section>
      </div>}
    </div>
  );
}
