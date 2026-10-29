'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Expand, Gamepad2, LockKeyhole, Minimize2, Orbit, Play, RotateCcw, Trophy, X } from 'lucide-react';
import styles from './GuildWorld.module.css';
import { getConnectedGamepad, readGamepadButtons, readGamepadDirections } from '@/lib/controllerInput';
import { GuildCometDodge } from './GuildCometDodge';

type GuildWorldProps = {
  userId: string | null;
  isAuthenticated: boolean;
};

type GameState = 'ready' | 'playing' | 'paused' | 'won' | 'lost';

const BEST_KEY = 'sanctuary-guild-orbital-drift-best-v1';
const TARGET = 12;
const START_SECONDS = 35;

function readBest(): number {
  try {
    const value = Number(window.localStorage.getItem(BEST_KEY) ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export function GuildWorld({ userId, isAuthenticated }: GuildWorldProps) {
  const [controllerConnected, setControllerConnected] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);
  const [bigPicture, setBigPicture] = useState(false);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(START_SECONDS);
  const [ship, setShip] = useState({ x: 50, y: 72 });
  const [orb, setOrb] = useState({ x: 28, y: 35 });
  const [best, setBest] = useState(0);
  const [notice, setNotice] = useState('');
  const [isPageVisible, setIsPageVisible] = useState(true);
  const enterButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const lastButtons = useRef<boolean[]>([]);
  const gamepadActionAt = useRef(0);
  const shipRef = useRef(ship);
  const orbRef = useRef(orb);
  const scoreRef = useRef(score);
  const stateRef = useRef(gameState);

  useEffect(() => { shipRef.current = ship; }, [ship]);
  useEffect(() => { orbRef.current = orb; }, [orb]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const togglePause = useCallback(() => {
    setGameState((state) => state === 'playing' ? 'paused' : state === 'paused' ? 'playing' : state);
    setNotice((message) => message === 'Trial paused.' ? 'Back in orbit.' : 'Trial paused.');
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setSeconds(START_SECONDS);
    setShip({ x: 50, y: 72 });
    setOrb({ x: 24 + Math.floor(Math.random() * 52), y: 18 + Math.floor(Math.random() * 52) });
    setGameState('playing');
    setNotice('Collect 12 star fragments before the timer reaches zero.');
  }, []);

  const closeWorld = useCallback(() => {
    setWorldOpen(false);
    setBigPicture(false);
    setEntryOpen(false);
    setGameState('ready');
    setNotice('');
  }, []);

  const moveShip = useCallback((dx: number, dy: number) => {
    if (stateRef.current !== 'playing') return;
    const next = {
      x: Math.max(6, Math.min(94, shipRef.current.x + dx)),
      y: Math.max(12, Math.min(88, shipRef.current.y + dy)),
    };
    shipRef.current = next;
    setShip(next);
    const orbNow = orbRef.current;
    if (Math.hypot(next.x - orbNow.x, next.y - orbNow.y) < 8) {
      const nextScore = scoreRef.current + 1;
      scoreRef.current = nextScore;
      setScore(nextScore);
      if (nextScore >= TARGET) {
        setGameState('won');
        setNotice('Orbit stabilised. You completed the first Guild trial.');
        setBest((old) => {
          const nextBest = Math.max(old, nextScore);
          try { window.localStorage.setItem(BEST_KEY, String(nextBest)); } catch { /* Local best is optional. */ }
          return nextBest;
        });
      } else {
        setOrb({ x: 8 + Math.floor(Math.random() * 84), y: 14 + Math.floor(Math.random() * 70) });
      }
    }
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsPageVisible(document.visibilityState === 'visible');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing' || !isPageVisible) return;
    const timer = window.setInterval(() => {
      setSeconds((remaining) => {
        if (remaining <= 1) {
          setGameState('lost');
          setNotice('The fragments drifted away. Give it another run.');
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameState, isPageVisible]);

  useEffect(() => {
    if (!worldOpen) {
      if (entryOpen || controllerConnected) enterButtonRef.current?.focus({ preventScroll: true });
      return;
    }
    closeButtonRef.current?.focus({ preventScroll: true });
    const onDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onDialogKeyDown);
    return () => document.removeEventListener('keydown', onDialogKeyDown);
  }, [controllerConnected, entryOpen, worldOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setBest(readBest());
    try {
      if (window.localStorage.getItem('sanctuary-open-hidden-guild-entry') === '1') {
        window.localStorage.removeItem('sanctuary-open-hidden-guild-entry');
        setEntryOpen(true);
      }
    } catch {
      // Hidden entry can still be opened with a connected controller.
    }
    let frame = 0;
    let active = true;
    const poll = (time: number) => {
      if (!active) return;
      const pad = getConnectedGamepad();
      setControllerConnected(Boolean(pad));
      if (pad && isPageVisible) {
        const { buttons, pressed } = readGamepadButtons(pad, lastButtons.current);
        if (!worldOpen && pressed(0)) {
          if (!entryOpen) setEntryOpen(true);
          else if (!isAuthenticated || !userId) setNotice('Sign in to your Sanctuary account first. Your Guild will use that same identity.');
          else {
            setNotice('');
            setWorldOpen(true);
            setEntryOpen(false);
            setBest(readBest());
          }
        }
        if (worldOpen) {
          if (pressed(1)) closeWorld();
          if (pressed(9)) setBigPicture((value) => !value);
          if (time - gamepadActionAt.current > 140) {
            const { left, right, up, down } = readGamepadDirections(pad, pressed);
            if (left || right || up || down) {
              if (gameState === 'playing') moveShip((right ? 4 : left ? -4 : 0), (down ? 4 : up ? -4 : 0));
              else {
                const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []).filter((element) => element.offsetParent !== null);
                const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
                const direction = down || right ? 1 : -1;
                const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + focusable.length) % focusable.length;
                focusable[nextIndex]?.focus();
              }
              gamepadActionAt.current = time;
            }
            if (pressed(8)) togglePause();
            if (pressed(0)) {
              if (gameState === 'paused') setGameState('playing');
              else if (gameState !== 'playing') startGame();
              else moveShip(0, -4);
            }
          }
        }
        lastButtons.current = buttons;
      } else {
        lastButtons.current = [];
      }
      frame = window.requestAnimationFrame(poll);
    };
    frame = window.requestAnimationFrame(poll);
    return () => { active = false; window.cancelAnimationFrame(frame); };
  }, [closeWorld, entryOpen, gameState, isAuthenticated, isPageVisible, moveShip, startGame, togglePause, userId, worldOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        setEntryOpen((open) => !open);
        return;
      }
      if (!worldOpen) return;
      if (event.key === 'Escape') { if (bigPicture) setBigPicture(false); else closeWorld(); }
      if (event.key === 'F6') { event.preventDefault(); setBigPicture((value) => !value); }
      if (event.key.toLowerCase() === 'p' && (gameState === 'playing' || gameState === 'paused')) { event.preventDefault(); togglePause(); }
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { event.preventDefault(); if (gameState === 'playing') moveShip(-4, 0); }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { event.preventDefault(); if (gameState === 'playing') moveShip(4, 0); }
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') { event.preventDefault(); if (gameState === 'playing') moveShip(0, -4); }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') { event.preventDefault(); if (gameState === 'playing') moveShip(0, 4); }
      if (event.key === 'Enter' || event.key === ' ') { if (gameState === 'paused') setGameState('playing'); else if (gameState !== 'playing') startGame(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bigPicture, closeWorld, gameState, moveShip, startGame, togglePause, worldOpen]);

  const enterGuild = () => {
    if (!isAuthenticated || !userId) {
      setNotice('Sign in to your Sanctuary account first. Your Guild will use that same identity.');
      return;
    }
    setNotice('');
    setWorldOpen(true);
    setEntryOpen(false);
    setBest(readBest());
  };

  return (
    <>
      {!worldOpen && (
        <main className={styles.publicGuild} aria-labelledby="public-guild-title">
          <p className={styles.eyebrow}>THE GUILD · COMMUNITY WORLDS</p>
          <h1 id="public-guild-title">Your next world awaits.</h1>
          <p className={styles.publicGuildIntro}>{isAuthenticated
            ? 'Explore creator projects and community servers, or enter the Guild’s original browser arcade.'
            : 'Browse creator games and community servers. Sign in to Sanctuary to enter the Guild’s original browser arcade.'}</p>
          {isAuthenticated && <button type="button" className={styles.enterPublicGuild} onClick={enterGuild}>Enter Guild Arcade <span aria-hidden="true">↗</span></button>}
        </main>
      )}
      {isAuthenticated && !worldOpen && (entryOpen || controllerConnected) && (
        <aside className={styles.entry} aria-label="Guild entry">
          <div className={styles.entryIcon}><Gamepad2 size={19} aria-hidden="true" /></div>
          <div className={styles.entryCopy}>
            <strong>{controllerConnected ? 'Controller detected' : 'Accessibility entry'}</strong>
            <span>{notice || "The Guild is ready when you are."}</span>
          </div>
          <button ref={enterButtonRef} type="button" className={styles.enterButton} onClick={enterGuild}>Enter Guild <span aria-hidden="true">↗</span></button>
          {!controllerConnected && <button type="button" className={styles.dismiss} aria-label="Close Guild entry" onClick={() => setEntryOpen(false)}><X size={16} /></button>}
        </aside>
      )}
      {isAuthenticated && worldOpen && (
        <div className={`${styles.backdrop} ${bigPicture ? styles.backdropBigPicture : ""}`} role="dialog" aria-modal="true" aria-labelledby="guild-title">
          <section ref={dialogRef} className={`${styles.world} ${bigPicture ? styles.worldBigPicture : ""}`}>
            <header className={styles.topbar}>
              <div className={styles.brand}><span className={styles.brandMark}><Orbit size={20} /></span><span><small>THE SANCTUARY · HIDDEN WORLD</small><strong id="guild-title">The Guild</strong></span></div>
              <div className={styles.topActions}><span className={styles.connected}><Gamepad2 size={14} /> {controllerConnected ? 'Controller connected' : 'Keyboard / touch'}</span><button type="button" className={styles.bigPictureButton} onClick={() => setBigPicture((value) => !value)}>{bigPicture ? <Minimize2 size={16} /> : <Expand size={16} />}{bigPicture ? 'Windowed' : 'Big Picture'}</button><button ref={closeButtonRef} type="button" className={styles.closeButton} onClick={closeWorld}><X size={18} /> Exit Guild</button></div>
            </header>
            <div className={styles.content}>
              <div className={styles.hero}>
                <div className={styles.heroText}><p className={styles.eyebrow}>WORLD 01 · FIRST LIGHT</p><h1>Make your own<br /><em>orbit.</em></h1><p>A quiet corner of the cosmos, built for play. This first trial runs right here in your browser — no install, no account linking.</p><div className={styles.heroMeta}><span><i /> Browser game · Original prototype</span><span><LockKeyhole size={13} /> Personal progress stays on this device</span></div></div>
                <div className={styles.planet} aria-hidden="true"><div className={styles.planetRing} /><div className={styles.planetCore} /><span className={styles.planetMoon} /></div>
              </div>
              <div className={styles.sectionHead}><div><p className={styles.eyebrow}>THE ARCADE · PLAYABLE NOW</p><h2>Choose your first trial</h2></div><span className={styles.localPill}>ALPHA · LOCAL SAVE</span></div>
              <div className={styles.gameGrid}>
                <article className={styles.gameCard}>
                  <div className={styles.gameArt}><div className={styles.gameArtGlow} /><span className={styles.starOne}>✦</span><span className={styles.starTwo}>✧</span><span className={styles.gameOrb}>✦</span><span className={styles.shipGlyph}>⌁</span></div>
                  <div className={styles.gameDetails}><div className={styles.gameLabel}><span>ARCADE · 01</span><span>35 SEC</span></div><h3>Orbital Drift</h3><p>Guide your little starship through a field of drifting fragments. Collect twelve before the countdown ends.</p><div className={styles.gameFoot}><span><Gamepad2 size={14} /> Controller ready</span><button type="button" onClick={startGame} className={styles.playButton}><Play size={15} fill="currentColor" /> {gameState === 'playing' ? 'Restart trial' : 'Play trial'}</button></div></div>
                </article>
                <aside className={styles.progressCard}><div className={styles.progressIcon}><Trophy size={19} /></div><p className={styles.eyebrow}>YOUR LOCAL RECORD</p><strong>{best.toString().padStart(2, '0')} <small>fragments</small></strong><p>Your best run is saved on this device only. No cloud rewards or cross-world sharing are enabled in this prototype.</p><div className={styles.progressLine}><span style={{ width: `${Math.min(100, (best / TARGET) * 100)}%` }} /></div><small>Target: {TARGET} fragments</small></aside>
              </div>
              <section className={styles.gamePanel} aria-label="Orbital Drift game">
                <div className={styles.gameStatus}><span><i className={gameState === 'won' ? styles.statusWin : gameState === 'lost' ? styles.statusLost : ''} /> {gameState === 'playing' ? 'IN FLIGHT' : gameState === 'paused' ? 'PAUSED' : gameState === 'won' ? 'TRIAL COMPLETE' : gameState === 'lost' ? 'TRIAL ENDED' : 'READY WHEN YOU ARE'}</span><span>TIME {String(seconds).padStart(2, '0')}s · FRAGMENTS {String(score).padStart(2, '0')}/{TARGET}</span>{(gameState === 'playing' || gameState === 'paused') && <button type="button" className={styles.pauseButton} onClick={togglePause}>{gameState === 'paused' ? 'Resume' : 'Pause'}</button>}</div>
                <div className={styles.playfield} tabIndex={0} aria-label="Game field. Use arrow keys or WASD to move, or use a controller." onClick={(event) => event.currentTarget.focus()}>
                  <div className={styles.fieldStars} />
                  <div className={styles.fragment} style={{ left: `${orb.x}%`, top: `${orb.y}%` }} aria-label="Star fragment">✦</div>
                  <div className={styles.playerShip} style={{ left: `${ship.x}%`, top: `${ship.y}%` }} aria-label="Your ship">✧</div>
                  {gameState !== 'playing' && <div className={styles.gameOverlay}><strong>{gameState === 'paused' ? 'Hold your orbit' : gameState === 'won' ? 'Orbit stabilised' : gameState === 'lost' ? 'Try another orbit' : 'Your trial awaits'}</strong><span>{gameState === 'paused' ? 'Your timer is paused. Resume when you are ready.' : gameState === 'won' ? 'You collected every fragment.' : gameState === 'lost' ? `You collected ${score} of ${TARGET}. The stars are patient.` : 'Collect 12 fragments before time runs out.'}</span>{gameState === 'paused' ? <button type="button" onClick={() => setGameState('playing')}><Play size={14} fill="currentColor" /> Resume trial</button> : <button type="button" onClick={startGame}><RotateCcw size={14} /> {gameState === 'ready' ? 'Begin trial' : 'Try again'}</button>}</div>}
                </div>
                <div className={styles.gameControls}><span><kbd>← ↑ ↓ →</kbd> or <kbd>W A S D</kbd> move</span><span><kbd>A / ✕</kbd> on controller · <kbd>Esc / B</kbd> exit</span><div className={styles.touchControls}><button type="button" aria-label="Move up" onClick={() => moveShip(0, -5)}>↑</button><div><button type="button" aria-label="Move left" onClick={() => moveShip(-5, 0)}>←</button><button type="button" aria-label="Move down" onClick={() => moveShip(0, 5)}>↓</button><button type="button" aria-label="Move right" onClick={() => moveShip(5, 0)}>→</button></div></div></div>
                {notice && <p className={styles.notice} role="status">{notice}</p>}
              </section>
              <div className={styles.sectionHead}><div><p className={styles.eyebrow}>THE ARCADE · 02</p><h2>Comet Dodge</h2></div><span className={styles.localPill}>20-SECOND SURVIVAL</span></div>
              <GuildCometDodge />
              <footer className={styles.footer}><span>THE GUILD · ALPHA PROTOTYPE</span><span>Sanctuary identity · isolated game state · no verified rewards</span></footer>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
