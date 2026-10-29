'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Home, Gamepad2, Library, Music2, Image as ImageIcon, Settings, Newspaper, Search,
  MessageSquare, CalendarDays, CalendarCheck, UserRound, Bell, Clapperboard, Map,
  Wallet, ShoppingBag, HeartHandshake, ShieldCheck, ChevronRight, Menu, X, LogOut
} from 'lucide-react';
import type { NavigationState } from '@/context/AppContext';
import { canAccessSanctuaryFeature } from '@/lib/sanctuaryFeatureGates';
import { NotificationBar } from './NotificationBar';
import { getConnectedGamepad, readGamepadButtons, readGamepadDirections, type LogicalDirection } from '@/lib/controllerInput';
import styles from './GuildNavigation.module.css';

export type GuildPage = 'home' | 'arcade' | 'trials' | 'library' | 'music' | 'photos' | 'tools' | NavigationState;
type Item = { id: GuildPage; label: string; icon: typeof Home; description?: string };
const guildItems: Item[] = [
  { id: 'home', label: 'Guild Home', icon: Home },
  { id: 'arcade', label: 'Featured Games', icon: Gamepad2, description: 'Launch The 5 Sleeves and browser games' },
  { id: 'trials', label: 'Guild Trials', icon: Gamepad2, description: 'Original Guild arcade games' },
  { id: 'library', label: 'My Game Collection', icon: Library, description: 'Your saved game catalogue' },
  { id: 'music', label: 'Music Player', icon: Music2, description: 'Audio selected from this device' },
  { id: 'photos', label: 'Photo Slideshow', icon: ImageIcon, description: 'Private local gallery' },
  { id: 'tools', label: 'Guild Tools', icon: Settings, description: 'Gaming links and Cloud Lab status' },
];
const sanctuaryItems: Item[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'feed', label: 'Community', icon: Newspaper },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'shorts', label: 'Shorts', icon: Clapperboard },
  { id: 'planner', label: 'Daily Planner', icon: CalendarCheck },
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'games', label: 'Cosmic Arcade', icon: Gamepad2 },
  { id: 'roadmap', label: 'Sanctuary Roadmap', icon: Map },
  { id: 'guild-roadmap', label: 'Guild Roadmap', icon: Gamepad2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'shop', label: 'Token Shop', icon: ShoppingBag },
  { id: 'support', label: 'Support the community', icon: HeartHandshake },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'admin', label: 'Admin & Moderation', icon: ShieldCheck },
];
const noDirections = { up: false, down: false, left: false, right: false };

export function GuildNavigation({ selectedPage, role, onSelect, onExit }: {
  selectedPage: GuildPage;
  role: string;
  onSelect: (page: GuildPage) => void;
  onExit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const previousButtons = useRef<boolean[]>([]);
  const previousDirections = useRef(noDirections);
  const lastActionAt = useRef(0);
  const wasOpen = useRef(false);

  const allowed = sanctuaryItems.filter((item) => {
    if (item.id === 'admin') return ['moderator', 'admin', 'developer', 'owner'].includes(role);
    if (item.id === 'wallet') return canAccessSanctuaryFeature('wallet', role);
    if (item.id === 'shop') return canAccessSanctuaryFeature('tokenShop', role);
    return true;
  });
  const label = [...guildItems, ...allowed].find((item) => item.id === selectedPage)?.label ?? 'Sanctuary';
  const choose = (page: GuildPage) => { onSelect(page); setOpen(false); };

  const moveFocus = (direction: LogicalDirection) => {
    if (!open) {
      setOpen(true);
      window.setTimeout(() => document.querySelector<HTMLButtonElement>('[data-guild-nav-item="true"]')?.focus(), 0);
      return;
    }
    const items = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-guild-nav-item="true"]'));
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const delta = direction === 'up' || direction === 'left' ? -1 : 1;
    items[(current < 0 ? 0 : current + delta + items.length) % items.length]?.focus();
  };

  const activateFocused = () => {
    if (!open) {
      setOpen(true);
      window.setTimeout(() => document.querySelector<HTMLButtonElement>('[data-guild-nav-item="true"]')?.focus(), 0);
      return;
    }
    const focused = document.activeElement;
    if (focused instanceof HTMLButtonElement && focused.dataset.guildNavItem === 'true') focused.click();
    else document.querySelector<HTMLButtonElement>('[data-guild-nav-item="true"]')?.focus();
  };

  const goBack = () => {
    if (open) setOpen(false);
    else if (selectedPage !== 'home') choose('home');
  };

  useEffect(() => {
    if (open) {
      window.setTimeout(() => document.querySelector<HTMLButtonElement>('[data-guild-nav-item="true"]')?.focus(), 0);
    } else if (wasOpen.current) {
      menuButtonRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    const poll = () => {
      const pad = getConnectedGamepad();
      if (!pad) {
        previousButtons.current = [];
        previousDirections.current = noDirections;
        return;
      }
      const state = readGamepadButtons(pad, previousButtons.current);
      const directions = readGamepadDirections(pad, state.pressed);
      const direction = (Object.keys(directions) as LogicalDirection[]).find((key) =>
        directions[key] && !previousDirections.current[key]
      );
      const start = state.pressed(9) || state.pressed(16);
      const confirm = state.pressed(0);
      const back = state.pressed(1);
      const now = Date.now();
      if (now - lastActionAt.current > 150) {
        if (start) { setOpen((value) => !value); lastActionAt.current = now; }
        else if (back) { goBack(); lastActionAt.current = now; }
        else if (confirm) { activateFocused(); lastActionAt.current = now; }
        else if (direction) { moveFocus(direction); lastActionAt.current = now; }
      }
      previousButtons.current = state.buttons;
      previousDirections.current = directions;
    };
    const timer = window.setInterval(poll, 80);
    window.addEventListener('gamepadconnected', poll);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('gamepadconnected', poll);
    };
  }, [open, selectedPage]);

  const render = (item: Item) => {
    const Icon = item.icon;
    return <button type="button" key={item.id} className={styles.item} data-active={selectedPage === item.id} data-guild-nav-item="true" onClick={() => choose(item.id)}>
      <Icon size={19} /><span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span><ChevronRight size={16} />
    </button>;
  };

  return <header className={styles.header}>
    <button ref={menuButtonRef} type="button" className={styles.menu} aria-label={open ? 'Close Guild navigation' : 'Open Guild navigation'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? <X size={22} /> : <Menu size={22} />}<span>MENU</span>
    </button>
    <button type="button" className={styles.brand} onClick={() => choose('home')} aria-label="Guild Home">
      <span className={styles.mark}><Gamepad2 size={21} /></span><span><small>CONSOLE MODE</small><strong>THE GUILD</strong></span>
    </button>
    <div className={styles.current} aria-live="polite">{label}</div>
    <div className={styles.notificationSlot}><NotificationBar compact /></div>
    <button type="button" className={styles.exit} onClick={onExit}><LogOut size={17} /><span>Sanctuary</span></button>
    {open && <button type="button" className={styles.scrim} aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <nav className={styles.drawer} data-open={open} aria-label="Guild and Sanctuary pages" aria-hidden={!open}>
      <div className={styles.drawerHead}><div><small>YOUR CONSOLE</small><h2>Navigation</h2></div><button type="button" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <p className={styles.group}>THE GUILD</p>{guildItems.map(render)}
      <p className={styles.group}>SANCTUARY PAGES</p>{allowed.map(render)}
      <button type="button" className={styles.return} onClick={onExit}><LogOut size={17} /> Exit Guild · Return to Sanctuary</button>
    </nav>
    <div className={styles.touchConsole}>
      <button type="button" className={styles.touchToggle} aria-expanded={controlsOpen} onClick={() => setControlsOpen((value) => !value)}>{controlsOpen ? <X size={17} /> : <Gamepad2 size={17} />}<span>{controlsOpen ? 'Hide controls' : 'Controls'}</span></button>
      {controlsOpen && <div className={styles.touchPad} aria-label="Guild navigation controls">
        <button type="button" className={styles.padUp} aria-label="Navigate up" onClick={() => moveFocus('up')}>↑</button>
        <button type="button" className={styles.padLeft} aria-label="Navigate previous" onClick={() => moveFocus('left')}>←</button>
        <button type="button" className={styles.padDown} aria-label="Navigate down" onClick={() => moveFocus('down')}>↓</button>
        <button type="button" className={styles.padRight} aria-label="Navigate next" onClick={() => moveFocus('right')}>→</button>
        <button type="button" className={styles.padA} onClick={activateFocused}><strong>A</strong><small>Select</small></button>
        <button type="button" className={styles.padB} onClick={goBack}><strong>B</strong><small>Back</small></button>
      </div>}
    </div>
  </header>;
}
