'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, AudioLines, Check, Gamepad2, Maximize2, Minimize2, Settings2, Volume2, X } from 'lucide-react';
import styles from './GuildConsolePlayer.module.css';

type Props = { title: string; url: string; onExit: () => void };
const BUTTON_LABELS = ['A / Cross · Select', 'B / Circle · Back', 'D-pad / stick · Navigate'];

export function GuildConsolePlayer({ title, url, onExit }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const previousButtons = useRef<boolean[]>([]);
  const previousDirections = useRef({ x: 0, y: 0 });
  const controllerConnectedRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [volume, setVolume] = useState(70);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [notice, setNotice] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      try { screen.orientation.unlock(); } catch { /* Orientation lock is optional and browser-dependent. */ }
    } catch { setNotice('Use your browser’s Back or fullscreen control if fullscreen cannot close here.'); }
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
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
        try { screen.orientation.unlock(); } catch { /* Orientation lock is optional and browser-dependent. */ }
      } else {
        if (document.fullscreenElement) await document.exitFullscreen();
        await stage.requestFullscreen();
        try {
          const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
          if (orientation.lock) await orientation.lock('landscape');
          else throw new Error('Orientation lock is not supported');
          setNotice('');
        } catch {
          setNotice('Fullscreen is active. Rotate your device to landscape for the intended layout.');
        }
      }
    } catch { setNotice('Fullscreen is not available in this browser or must be started from a direct tap.'); }
  }, []);

  const menuTargets = useCallback(() => {
    if (!menuRef.current) return [] as HTMLElement[];
    return Array.from(menuRef.current.querySelectorAll<HTMLElement>('[data-guild-action]:not(:disabled)'));
  }, []);
  const moveMenuFocus = useCallback((direction: -1 | 1) => {
    const targets = menuTargets();
    if (!targets.length) return;
    const current = targets.indexOf(document.activeElement as HTMLElement);
    const next = current < 0 ? 0 : (current + direction + targets.length) % targets.length;
    targets[next]?.focus();
  }, [menuTargets]);
  const activateFocused = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && menuRef.current?.contains(active) && active.matches('[data-guild-action]:not(:disabled)')) active.click();
    else menuTargets()[0]?.click();
  }, [menuTargets]);
  const goBack = useCallback(() => {
    if (settingsOpen) { setSettingsOpen(false); return; }
    if (menuOpen) { setMenuOpen(false); return; }
    setMenuOpen(true);
  }, [menuOpen, settingsOpen]);
  const menuOpenRef = useRef(menuOpen);
  const activateFocusedRef = useRef(activateFocused);
  const goBackRef = useRef(goBack);
  const moveMenuFocusRef = useRef(moveMenuFocus);
  menuOpenRef.current = menuOpen;
  activateFocusedRef.current = activateFocused;
  goBackRef.current = goBack;
  moveMenuFocusRef.current = moveMenuFocus;

  useEffect(() => {
    const sync = () => {
      const active = document.fullscreenElement === stageRef.current;
      setIsFullscreen(active);
      if (!active) {
        try { screen.orientation.unlock(); } catch { /* Escape/browser exits may not expose orientation unlock. */ }
      }
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const timer = window.requestAnimationFrame(() => menuTargets()[0]?.focus());
    return () => window.cancelAnimationFrame(timer);
  }, [menuOpen, settingsOpen, menuTargets]);

  useEffect(() => {
    let active = true;
    let frame = 0;
    let lastMoveAt = 0;
    const poll = (now: number) => {
      if (!active) return;
      let pads: (Gamepad | null)[] = [];
      try { if (typeof navigator.getGamepads === 'function') pads = Array.from(navigator.getGamepads()); } catch { pads = []; }
      const pad = pads.find((candidate) => candidate?.connected) ?? null;
      if (controllerConnectedRef.current !== Boolean(pad)) {
        controllerConnectedRef.current = Boolean(pad);
        setControllerConnected(Boolean(pad));
      }
      if (pad) {
        const buttons = pad.buttons.map((button) => button.pressed || button.value > 0.65);
        const pressed = (index: number) => Boolean(buttons[index] && !previousButtons.current[index]);
        if (pressed(16) || pressed(9)) setMenuOpen((open) => !open);
        if (menuOpenRef.current) {
          if (pressed(0)) activateFocusedRef.current();
          if (pressed(1)) goBackRef.current();
          const x = (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0) || (Math.abs(pad.axes[0] ?? 0) > 0.55 ? Math.sign(pad.axes[0]) : 0);
          const y = (buttons[13] ? 1 : 0) - (buttons[12] ? 1 : 0) || (Math.abs(pad.axes[1] ?? 0) > 0.55 ? Math.sign(pad.axes[1]) : 0);
          if (now - lastMoveAt > 180 && (x !== previousDirections.current.x || y !== previousDirections.current.y) && (x !== 0 || y !== 0)) {
            if (y !== 0) moveMenuFocusRef.current(y as -1 | 1);
            else if (x !== 0) moveMenuFocusRef.current(x as -1 | 1);
            lastMoveAt = now;
          }
          previousDirections.current = { x, y };
        }
        previousButtons.current = buttons;
      } else {
        previousButtons.current = [];
        previousDirections.current = { x: 0, y: 0 };
      }
      frame = window.requestAnimationFrame(poll);
    };
    const connected = () => { controllerConnectedRef.current = true; setControllerConnected(true); };
    const disconnected = () => { controllerConnectedRef.current = false; setControllerConnected(false); previousButtons.current = []; };
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
    const applyAudioSettings = () => {
      const media = Array.from(document.querySelectorAll<HTMLMediaElement>('[data-guild-audio]'));
      media.forEach((item) => { item.muted = !musicEnabled; item.volume = volume / 100; });
    };
    applyAudioSettings();
    const observer = new MutationObserver(applyAudioSettings);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [musicEnabled, volume]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        if (menuOpen) { event.preventDefault(); goBack(); }
        else if (event.key === 'Escape' && !document.fullscreenElement) setMenuOpen(true);
      }
      if ((event.key === 'Home' || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g')) && !event.repeat) {
        event.preventDefault();
        setMenuOpen((open) => !open);
      }
      if (!menuOpen) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); moveMenuFocus(1); }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); moveMenuFocus(-1); }
      if ((event.key === 'Enter' || event.key === ' ') && !(document.activeElement instanceof HTMLInputElement)) {
        const active = document.activeElement as HTMLElement | null;
        if (active && menuRef.current?.contains(active) && active.matches('[data-guild-action]')) return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goBack, menuOpen, moveMenuFocus]);

  return (
    <div className={styles.stage} ref={stageRef} aria-label={`${title} game player`}>
      <div className={styles.topBar}>
        <button type="button" onClick={() => setMenuOpen(true)} className={styles.menuButton} aria-label="Open Guild system menu"><Gamepad2 size={18} /><span>The Guild</span></button>
        <div className={styles.gameTitle}>{title}</div>
        <div className={styles.actions}>
          <span className={styles.controllerState} aria-live="polite">{controllerConnected ? 'Controller connected' : 'Touch / keyboard ready'}</span>
          <button type="button" className={styles.iconButton} onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          <button type="button" className={styles.iconButton} onClick={() => void returnHome()} aria-label="Exit game and return to Guild home"><X size={18} /></button>
        </div>
      </div>
      <div className={styles.gameFrame}>
        <iframe src={url} title={title} allow="fullscreen; gamepad; pointer-lock; autoplay" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-fullscreen" />
      </div>
      <div className={styles.touchToolbar}>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open console controls"><Gamepad2 size={17} /> Console controls</button>
        <button type="button" onClick={() => setControlsVisible((visible) => !visible)} aria-expanded={controlsVisible}>{controlsVisible ? 'Hide floating menu' : 'Show floating menu'}</button>
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {menuOpen && <div className={styles.scrim} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
        <section className={styles.systemMenu} ref={menuRef} role="dialog" aria-modal="true" aria-labelledby="guild-menu-title" onKeyDown={(event) => { if (event.key === 'Escape' || event.key === 'Backspace') { event.preventDefault(); goBack(); } }}>
          <header className={styles.menuHeader}><div><p className={styles.eyebrow}>SYSTEM MENU</p><h2 id="guild-menu-title">The Guild</h2></div><button type="button" className={styles.iconButton} onClick={() => setMenuOpen(false)} aria-label="Resume game"><X size={18} /></button></header>
          <p className={styles.menuSubhead}>Your game stays open behind this menu. Use touch, keyboard or controller to navigate.</p>
          <button type="button" data-guild-action className={styles.menuAction} onClick={() => { setMenuOpen(false); setSettingsOpen(false); }}><Gamepad2 size={19} /><span><strong>Resume game</strong><small>Return to {title}</small></span></button>
          <button type="button" data-guild-action className={styles.menuAction} onClick={() => setSettingsOpen((open) => !open)}><Settings2 size={19} /><span><strong>Game and controller settings</strong><small>Input, sound and display options</small></span></button>
          {settingsOpen && <div className={styles.settingsPanel}>
            <label className={styles.settingRow}><span><Volume2 size={17} /> Guild music enabled</span><input data-guild-action type="checkbox" checked={musicEnabled} onChange={(event) => setMusicEnabled(event.target.checked)} /></label>
            <label className={styles.settingRow}><span>Guild music volume <strong>{volume}%</strong></span><input data-guild-action type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
            <div className={styles.controllerDiagnostic}><AudioLines size={17} /><div><strong>{controllerConnected ? 'Controller detected' : 'No controller exposed to this page'}</strong><p>Directional controls navigate this menu. A confirms, B backs out, and Home/Guide or Start opens and closes the menu where exposed.</p></div></div>
            <div className={styles.buttonLegend}>{BUTTON_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
            <p className={styles.finePrint}>Audio controls affect Sanctuary media explicitly marked as Guild-managed audio. They cannot control sound inside this cross-origin game iframe.</p>
          </div>}
          <button type="button" data-guild-action className={styles.menuAction} onClick={() => void toggleFullscreen()}><Maximize2 size={19} /><span><strong>{isFullscreen ? 'Exit fullscreen' : 'Display fullscreen'}</strong><small>Expand or restore the game view</small></span></button>
          <button type="button" data-guild-action className={styles.exitAction} onClick={() => void returnHome()}><ArrowLeft size={19} /><span><strong>Exit to Guild home</strong><small>Close the game and return to your Guild dashboard</small></span></button>
          <div className={styles.virtualControls} aria-label="Virtual console navigation controls">
            <div className={styles.dpad} aria-label="Directional navigation">
              <button type="button" onClick={() => moveMenuFocus(-1)} aria-label="Navigate up"><ArrowUp size={20} /></button>
              <button type="button" onClick={() => moveMenuFocus(-1)} aria-label="Navigate left"><ArrowLeft size={20} /></button>
              <button type="button" onClick={() => moveMenuFocus(1)} aria-label="Navigate right"><ArrowRight size={20} /></button>
              <button type="button" onClick={() => moveMenuFocus(1)} aria-label="Navigate down"><ArrowDown size={20} /></button>
            </div>
            <div className={styles.abButtons}><button type="button" onClick={activateFocused} aria-label="A button, select or confirm"><strong>A</strong><small>Select</small></button><button type="button" onClick={goBack} aria-label="B button, back or cancel"><strong>B</strong><small>Back</small></button></div>
          </div>
          <footer className={styles.menuFooter}><Check size={15} /> Touch controls operate this Guild menu. The games retain their own native touch controls; iframe limitations prevent this overlay from injecting gameplay input.</footer>
        </section>
      </div>}
      {!menuOpen && controlsVisible && <button type="button" className={styles.quickMenu} onClick={() => setMenuOpen(true)} aria-label="Open Guild menu"><Gamepad2 size={20} /><span>MENU</span></button>}
    </div>
  );
}
