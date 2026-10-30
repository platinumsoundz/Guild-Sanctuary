'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Home, Gamepad2, Library, Music2, Image as ImageIcon, Settings, Newspaper, Search,
  MessageSquare, CalendarDays, CalendarCheck, UserRound, Bell, Clapperboard, Map,
  Wallet, ShoppingBag, HeartHandshake, ShieldCheck, ChevronRight, Menu, X, LogOut, SlidersHorizontal, Maximize2, Monitor, Check, Keyboard
} from 'lucide-react';
import type { NavigationState } from '@/context/AppContext';
import { canAccessSanctuaryFeature, canAccessSanctuaryPage } from '@/lib/sanctuaryFeatureGates';
import { fetchPageVisibility, isPageVisible, type PageVisibilityMap } from '@/lib/pageVisibility';
import { NotificationBar } from './NotificationBar';
import { GuildDiagnosticsPanel } from './GuildDiagnosticsPanel';
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
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'moderation', label: 'Moderation', icon: ShieldCheck },
];
const noDirections = { up: false, down: false, left: false, right: false };

export function GuildNavigation({ selectedPage, role, onSelect, onExit }: {
  selectedPage: GuildPage;
  role: string;
  onSelect: (page: GuildPage) => void;
  onExit: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [pageVisibility, setPageVisibility] = useState<PageVisibilityMap>({});
  const [open, setOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [quickKeyboardOpen, setQuickKeyboardOpen] = useState(false);
  const [controllerPresent, setControllerPresent] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const quickButtonRef = useRef<HTMLButtonElement>(null);
  const quickSearchRef = useRef<HTMLInputElement>(null);
  const quickPanelRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const previousButtons = useRef<boolean[]>([]);
  const previousDirections = useRef(noDirections);
  const lastActionAt = useRef(0);
  const wasOpen = useRef(false);

  // On narrow phones, show the touch navigation controls by default so they
  // are discoverable without requiring a trip through the Quick Menu.
  useEffect(() => {
    if (window.matchMedia('(max-width: 560px)').matches) {
      setControlsOpen(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPageVisibility().then((value) => { if (!cancelled) setPageVisibility(value); }).catch(() => { if (!cancelled) setPageVisibility({}); });
    return () => { cancelled = true; };
  }, []);

  const allowed = sanctuaryItems.filter((item) => {
    if (!canAccessSanctuaryPage(item.id, role)) return false;
    if (item.id === 'wallet') return canAccessSanctuaryFeature('wallet', role) && isPageVisible(item.id, pageVisibility, role);
    if (item.id === 'shop') return canAccessSanctuaryFeature('tokenShop', role) && isPageVisible(item.id, pageVisibility, role);
    return isPageVisible(item.id, pageVisibility, role);
  });
  const label = [...guildItems, ...allowed].find((item) => item.id === selectedPage)?.label ?? 'Sanctuary';
  const searchableItems = [...guildItems, ...allowed];
  const quickResults = searchableItems.filter((item) => {
    const needle = quickQuery.trim().toLowerCase();
    return !needle || item.label.toLowerCase().includes(needle) || (item.description ?? '').toLowerCase().includes(needle);
  }).slice(0, 8);
  const choose = (page: GuildPage) => { onSelect(page); setOpen(false); setQuickOpen(false); setQuickKeyboardOpen(false); setQuickQuery(''); };
  const addQuickKey = (key: string) => {
    if (key === 'Backspace') setQuickQuery((value) => value.slice(0, -1));
    else if (key === 'Space') setQuickQuery((value) => value + ' ');
    else if (key === 'Clear') setQuickQuery('');
    else setQuickQuery((value) => value + key);
    quickSearchRef.current?.focus();
  };

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

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('guild-reduced-motion-v1');
      const enabled = stored === 'true';
      setReducedMotion(enabled);
      document.documentElement.dataset.guildReducedMotion = String(enabled);
    } catch { /* Accessibility defaults still follow the operating system. */ }
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const syncController = () => setControllerPresent(Boolean(getConnectedGamepad()));
    syncFullscreen();
    syncController();
    document.addEventListener('fullscreenchange', syncFullscreen);
    window.addEventListener('gamepadconnected', syncController);
    window.addEventListener('gamepaddisconnected', syncController);
    const poll = window.setInterval(syncController, 1000);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      window.removeEventListener('gamepadconnected', syncController);
      window.removeEventListener('gamepaddisconnected', syncController);
      window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const onQuickKeys = (event: KeyboardEvent) => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !typing) {
        event.preventDefault();
        setQuickOpen((value) => !value);
      } else if (event.key === 'Escape' && quickOpen) {
        event.preventDefault();
        setQuickOpen(false);
        setQuickQuery('');
        quickButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onQuickKeys);
    return () => window.removeEventListener('keydown', onQuickKeys);
  }, [quickOpen]);

  useEffect(() => {
    if (quickOpen) window.setTimeout(() => quickSearchRef.current?.focus(), 0);
    else setQuickKeyboardOpen(false);
  }, [quickOpen]);

  useEffect(() => {
    if (quickOpen && quickKeyboardOpen) window.setTimeout(() => quickPanelRef.current?.querySelector<HTMLButtonElement>('[data-quick-key]')?.focus(), 0);
  }, [quickOpen, quickKeyboardOpen]);

  const toggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    document.documentElement.dataset.guildReducedMotion = String(next);
    try { window.localStorage.setItem('guild-reduced-motion-v1', String(next)); } catch { /* Session toggle remains active. */ }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Browser permissions can require fullscreen to be initiated by a direct user action.
    }
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
        if (quickOpen) {
          if (start || back) {
            setQuickOpen(false);
            setQuickQuery('');
            setQuickKeyboardOpen(false);
            quickButtonRef.current?.focus();
            lastActionAt.current = now;
          } else if (confirm) {
            const active = document.activeElement;
            if (active instanceof HTMLButtonElement && quickPanelRef.current?.contains(active)) active.click();
            else if (active instanceof HTMLInputElement && quickPanelRef.current?.contains(active)) {
              const target = quickPanelRef.current.querySelector<HTMLButtonElement>('[data-quick-key]') ?? quickPanelRef.current.querySelector<HTMLButtonElement>('.quickResults button');
              target?.focus();
            }
            lastActionAt.current = now;
          } else if (direction) {
            const targets = Array.from(quickPanelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? []);
            if (targets.length) {
              const current = targets.indexOf(document.activeElement as HTMLElement);
              const delta = direction === 'up' || direction === 'left' ? -1 : 1;
              targets[(current < 0 ? 0 : current + delta + targets.length) % targets.length]?.focus();
            }
            lastActionAt.current = now;
          }
        } else if (start) { setQuickOpen(true); setOpen(false); lastActionAt.current = now; }
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
  }, [open, selectedPage, quickOpen]);

  const render = (item: Item) => {
    const Icon = item.icon;
    return <button type="button" key={item.id} className={styles.item} data-active={selectedPage === item.id} data-guild-nav-item="true" onClick={() => choose(item.id)}>
      <Icon size={19} /><span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span><ChevronRight size={16} />
    </button>;
  };

  return <>
    <header className={styles.header}>
    <button ref={menuButtonRef} type="button" className={styles.menu} aria-label={open ? 'Close Guild navigation' : 'Open Guild navigation'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? <X size={22} /> : <Menu size={22} />}<span>MENU</span>
    </button>
    <button type="button" className={styles.brand} onClick={() => choose('home')} aria-label="Guild Home">
      <span className={styles.mark}><Gamepad2 size={21} /></span><span><small>CONSOLE MODE</small><strong>THE GUILD</strong></span>
    </button>
    <div className={styles.current} aria-live="polite">{label}</div>
    <div className={styles.notificationSlot}><NotificationBar compact worldType="guild" onNavigate={(page) => onSelect(page)} /></div>
    <button ref={quickButtonRef} type="button" className={styles.quickButton} aria-label="Open Guild quick menu" aria-expanded={quickOpen} aria-keyshortcuts="Control+K Meta+K" onClick={() => setQuickOpen((value) => !value)}><SlidersHorizontal size={18} /><span>Quick menu</span><kbd>⌘/Ctrl K</kbd></button>
    <button type="button" className={styles.exit} onClick={onExit}><LogOut size={17} /><span>Sanctuary</span></button>
    </header>
    {mounted && quickOpen && createPortal(<>
      <button type="button" className={styles.quickScrim} aria-label="Close quick menu" onClick={() => { setQuickOpen(false); setQuickQuery(''); quickButtonRef.current?.focus(); }} />
      <section ref={quickPanelRef} className={styles.quickPanel} role="dialog" aria-modal="true" aria-labelledby="guild-quick-title" onKeyDown={(event) => { if (event.key !== 'Tab') return; const focusable = Array.from(quickPanelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? []); if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }}>
        <div className={styles.quickHeading}><div><small>THE GUILD · HUD</small><h2 id="guild-quick-title">Quick menu</h2></div><button type="button" aria-label="Close quick menu" onClick={() => { setQuickOpen(false); setQuickQuery(''); quickButtonRef.current?.focus(); }}><X size={18} /></button></div>
        <div className={styles.quickStatus}><span className={controllerPresent ? styles.statusOnline : styles.statusOffline}><i />{controllerPresent ? 'Controller detected' : 'Touch / keyboard ready'}</span><span>{isFullscreen ? 'Fullscreen on' : 'Windowed view'}</span></div>
        <label className={styles.quickSearch}><Search size={17} /><span className={styles.visuallyHidden}>Search Guild destinations</span><input ref={quickSearchRef} type="search" value={quickQuery} onChange={(event) => setQuickQuery(event.target.value)} placeholder="Search Guild destinations…" /></label>
        <button type="button" className={styles.quickKeyboardToggle} aria-pressed={quickKeyboardOpen} onClick={() => setQuickKeyboardOpen((value) => !value)}><Keyboard size={16} /><span>On-screen keyboard</span><span className={quickKeyboardOpen ? styles.toggleOn : styles.toggleOff}>{quickKeyboardOpen ? 'ON' : 'OFF'}</span></button>
        {quickKeyboardOpen && <div className={styles.quickKeyboard} role="group" aria-label="On-screen keyboard">
          {['1','2','3','4','5','6','7','8','9','0','Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M','Backspace','Space','Clear'].map((key) => <button type="button" key={key} data-quick-key={key === '1' ? 'first' : undefined} className={['Backspace','Space','Clear'].includes(key) ? styles.quickKeyboardWide : undefined} aria-label={key === 'Backspace' ? 'Delete last character' : key === 'Space' ? 'Insert space' : key === 'Clear' ? 'Clear search' : key} onClick={() => addQuickKey(key)}>{key === 'Backspace' ? '⌫' : key === 'Space' ? 'Space' : key}</button>)}
        </div>}
        <div className={styles.quickResults} role="group" aria-label="Guild destinations">
          {quickResults.length ? quickResults.map((item) => {
            const Icon = item.icon;
            return <button type="button" key={item.id} onClick={() => choose(item.id)}><Icon size={17} /><span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span><ChevronRight size={15} /></button>;
          }) : <p className={styles.quickEmpty}>No destinations match “{quickQuery}”. Try another search.</p>}
        </div>
        <div className={styles.quickSettings}>
          <button type="button" aria-pressed={controlsOpen} onClick={() => setControlsOpen((value) => !value)}><Gamepad2 size={17} /><span>Touch navigation controls</span><span className={controlsOpen ? styles.toggleOn : styles.toggleOff}>{controlsOpen ? 'ON' : 'OFF'}</span></button>
          <button type="button" onClick={() => void toggleFullscreen()}><Monitor size={17} /><span>{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>{isFullscreen ? <Check size={15} /> : <Maximize2 size={15} />}</button>
          <button type="button" aria-pressed={reducedMotion} onClick={toggleReducedMotion}><SlidersHorizontal size={17} /><span>Reduce Guild motion</span><span className={reducedMotion ? styles.toggleOn : styles.toggleOff}>{reducedMotion ? 'ON' : 'OFF'}</span></button>
          <button type="button" onClick={() => choose('home')}><Home size={17} /><span>Resume Guild Home</span><ChevronRight size={15} /></button>
          <button type="button" onClick={onExit}><LogOut size={17} /><span>Exit to Sanctuary</span><ChevronRight size={15} /></button>
        </div>
        <GuildDiagnosticsPanel />
        <p className={styles.quickFootnote}>Search is limited to available Guild and Sanctuary destinations. Settings apply to this browser; game audio and display behaviour can still depend on the game host.</p>
      </section>
    </>, document.body)}
    {mounted && createPortal(<>
    {open && <button type="button" className={styles.scrim} aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <nav className={styles.drawer} data-open={open} aria-label="Guild and Sanctuary pages" aria-hidden={!open} inert={!open} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }}>
      <div className={styles.drawerHead}><div><small>YOUR CONSOLE</small><h2>Navigation</h2></div><button type="button" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <p className={styles.group}>THE GUILD</p>{guildItems.map(render)}
      <p className={styles.group}>SANCTUARY PAGES</p>{allowed.map(render)}
      <button type="button" className={styles.return} onClick={onExit}><LogOut size={17} /> Exit Guild · Return to Sanctuary</button>
    </nav>
    </>, document.body)}
    {mounted && createPortal(<div className={styles.touchConsole}>
      <button type="button" className={styles.touchToggle} aria-pressed={controlsOpen} aria-expanded={controlsOpen} onClick={() => setControlsOpen((value) => !value)}>{controlsOpen ? <X size={17} /> : <Gamepad2 size={17} />}<span>{controlsOpen ? 'Hide controls' : 'Controls'}</span></button>
      {controlsOpen && <div className={styles.touchPad} aria-label="Guild navigation controls">
        <button type="button" className={styles.padUp} aria-label="Navigate up" onClick={() => moveFocus('up')}>↑</button>
        <button type="button" className={styles.padLeft} aria-label="Navigate previous" onClick={() => moveFocus('left')}>←</button>
        <button type="button" className={styles.padDown} aria-label="Navigate down" onClick={() => moveFocus('down')}>↓</button>
        <button type="button" className={styles.padRight} aria-label="Navigate next" onClick={() => moveFocus('right')}>→</button>
        <button type="button" className={styles.padA} onClick={activateFocused}><strong>A</strong><small>Select</small></button>
        <button type="button" className={styles.padB} onClick={goBack}><strong>B</strong><small>Back</small></button>
      </div>}
    </div>, document.body)}
  </>;
}
