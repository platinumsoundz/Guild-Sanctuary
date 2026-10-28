'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Gamepad2, RotateCcw, Shield, Play } from 'lucide-react';
import styles from './GuildCometDodge.module.css';
import { getConnectedGamepad, readGamepadButtons, readGamepadDirections } from '@/lib/controllerInput';

type Mode = 'ready' | 'playing' | 'paused' | 'won' | 'lost';

const ROUND_SECONDS = 20;

export function GuildCometDodge() {
  const [mode, setMode] = useState<Mode>('ready');
  const [shipX, setShipX] = useState(50);
  const [comet, setComet] = useState({ x: 22, y: 0 });
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [dodged, setDodged] = useState(0);
  const [controllerConnected, setControllerConnected] = useState(false);
  const shipRef = useRef(50);
  const cometRef = useRef({ x: 22, y: 0 });
  const lastButtons = useRef<boolean[]>([]);
  const modeRef = useRef<Mode>('ready');

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const start = useCallback(() => {
    shipRef.current = 50;
    cometRef.current = { x: 12 + Math.random() * 76, y: 0 };
    setShipX(50);
    setComet(cometRef.current);
    setSeconds(ROUND_SECONDS);
    setDodged(0);
    setMode('playing');
  }, []);

  const move = useCallback((direction: number) => {
    if (modeRef.current !== 'playing') return;
    shipRef.current = Math.max(7, Math.min(93, shipRef.current + direction * 6));
    setShipX(shipRef.current);
  }, []);

  useEffect(() => {
    if (mode !== 'playing') return;
    const timer = window.setInterval(() => setSeconds((remaining) => {
      if (remaining <= 1) {
        setMode('won');
        return 0;
      }
      return remaining - 1;
    }), 1000);
    const physics = window.setInterval(() => {
      if (modeRef.current !== 'playing') return;
      const current = cometRef.current;
      const next = { x: current.x, y: current.y + 4.2 };
      if (next.y >= 78 && next.y <= 90 && Math.abs(next.x - shipRef.current) < 10) {
        setMode('lost');
        return;
      }
      if (next.y > 105) {
        next.x = 8 + Math.random() * 84;
        next.y = -4;
        setDodged((count) => count + 1);
      }
      cometRef.current = next;
      setComet(next);
    }, 100);
    return () => { window.clearInterval(timer); window.clearInterval(physics); };
  }, [mode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) { event.preventDefault(); move(-1); }
      if (['ArrowRight', 'd', 'D'].includes(event.key)) { event.preventDefault(); move(1); }
      if (event.key.toLowerCase() === 'p' && (modeRef.current === 'playing' || modeRef.current === 'paused')) {
        setMode((current) => current === 'playing' ? 'paused' : 'playing');
      }
      if (event.key === 'Enter' && modeRef.current !== 'playing') {
        if (modeRef.current === 'paused') setMode('playing');
        else start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, start]);

  useEffect(() => {
    let frame = 0;
    let active = true;
    const poll = () => {
      if (!active) return;
      const pad = getConnectedGamepad();
      setControllerConnected(Boolean(pad));
      if (pad) {
        const { buttons, pressed } = readGamepadButtons(pad, lastButtons.current);
        const { left, right } = readGamepadDirections(pad, pressed);
        if (left) move(-1);
        if (right) move(1);
        if (pressed(8)) setMode((current) => current === 'playing' ? 'paused' : current === 'paused' ? 'playing' : current);
        if (pressed(0) && modeRef.current !== 'playing') {
          if (modeRef.current === 'paused') setMode('playing');
          else start();
        }
        lastButtons.current = buttons;
      } else lastButtons.current = [];
      frame = window.requestAnimationFrame(poll);
    };
    frame = window.requestAnimationFrame(poll);
    return () => { active = false; window.cancelAnimationFrame(frame); };
  }, [move, start]);

  return (
    <section className={styles.panel} aria-label="Comet Dodge game">
      <div className={styles.header}>
        <div><p className={styles.eyebrow}>ARCADE · 02</p><h3>Comet Dodge</h3><p>Survive the meteor shower for 20 seconds. Slide between lanes and keep your orbit clear.</p></div>
        <span className={styles.status}><Gamepad2 size={14} /> {controllerConnected ? 'Controller ready' : 'Keyboard / touch'}</span>
      </div>
      <div className={styles.hud}><span>{mode === 'playing' ? 'IN THE SHOWER' : mode === 'paused' ? 'PAUSED' : mode === 'won' ? 'YOU SURVIVED' : mode === 'lost' ? 'SHIP STRUCK' : 'READY'} </span><span>{String(seconds).padStart(2, '0')}s · {dodged} comets passed</span></div>
      <div className={styles.field} aria-label="Dodge falling comets using left and right arrows">
        <div className={styles.stars} />
        <span className={styles.comet} style={{ left: `${comet.x}%`, top: `${comet.y}%` }} aria-label="Falling comet">☄</span>
        <span className={styles.ship} style={{ left: `${shipX}%` }} aria-label="Your ship">✦</span>
        {mode !== 'playing' && <div className={styles.overlay}><strong>{mode === 'paused' ? 'Take a breath' : mode === 'won' ? 'Clear skies' : mode === 'lost' ? 'One more run?' : 'Trust your reflexes'}</strong><span>{mode === 'paused' ? 'The shower is paused.' : mode === 'won' ? `You dodged ${dodged} comets.` : mode === 'lost' ? 'A comet caught your ship. Try shifting earlier.' : 'Move left and right to avoid each falling comet.'}</span><button type="button" onClick={() => mode === 'paused' ? setMode('playing') : start()}><Play size={14} fill="currentColor" /> {mode === 'ready' ? 'Start trial' : mode === 'paused' ? 'Resume' : 'Try again'}</button></div>}
      </div>
      <div className={styles.controls}><span><kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd></span><span>Controller stick / D-pad · <kbd>P</kbd> pause</span><div><button type="button" aria-label="Move ship left" onClick={() => move(-1)}>←</button><button type="button" aria-label="Move ship right" onClick={() => move(1)}>→</button><button type="button" aria-label={mode === 'paused' ? 'Resume game' : 'Pause game'} onClick={() => setMode((current) => current === 'playing' ? 'paused' : current === 'paused' ? 'playing' : current)} disabled={mode !== 'playing' && mode !== 'paused'}>{mode === 'paused' ? <Play size={15} /> : <Shield size={15} />}</button><button type="button" aria-label="Restart Comet Dodge" onClick={start}><RotateCcw size={15} /></button></div></div>
    </section>
  );
}
