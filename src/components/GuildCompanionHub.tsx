'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Gamepad2, Library, Music2, Plus, ShieldCheck, Terminal, Trash2, Upload, SkipBack, SkipForward, Play, Pause, FolderOpen } from 'lucide-react';
import styles from './GuildCompanionHub.module.css';
import { createClient } from '@/lib/supabase/client';

type LocalGame = { id: string; title: string; platform: string; launchUrl: string };
type MediaFile = { id: string; file: File; url: string };

const LIBRARY_KEY = 'sanctuary-guild-local-library-v1';
const DELETED_IDS_KEY = 'sanctuary-guild-library-deleted-v1';
const OWNER_KEY = 'sanctuary-guild-library-owner-v1';
const platforms = ['Browser', 'Steam', 'Xbox', 'RetroArch', 'Other'];
const MAX_MEDIA_FILES = 30;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const MAX_AUDIO_TOTAL_BYTES = 250 * 1024 * 1024;

function formatTime(seconds: number): string { return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00'; }

function safeWebUrl(value: string): string {
  if (!value.trim()) return '';
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
  } catch { return ''; }
}

const services = [
  { name: 'RetroArch', kind: 'Emulator frontend', description: 'Use the official app for local emulation. The Guild does not download ROMs or launch desktop emulators from a browser.', url: 'https://www.retroarch.com/' },
  { name: 'RetroAchievements', kind: 'Retro game achievements', description: 'Explore supported games and set up achievements in a compatible RetroArch build. Account linking and verified sync are planned, not connected yet.', url: 'https://retroachievements.org/' },
  { name: 'Steam', kind: 'PC game library', description: 'Open your Steam library. Reading ownership, achievements and launching installed games requires a later authorised integration or companion.', url: 'https://store.steampowered.com/' },
  { name: 'Xbox', kind: 'Console & PC ecosystem', description: 'Open Xbox services. Account sign-in, achievements and installed-game discovery are not connected to Sanctuary yet.', url: 'https://www.xbox.com/' },
  { name: 'GOG', kind: 'PC game library', description: 'Keep GOG titles in your planned unified library. Automatic discovery and launching need the desktop companion.', url: 'https://www.gog.com/' },
  { name: 'itch.io', kind: 'Indie games', description: 'Browse indie games and add supported browser-playable titles to your personal library.', url: 'https://itch.io/' },
];

export type GuildCompanionView = 'all' | 'library' | 'music' | 'tools';

export function GuildCompanionHub({ view = 'all', hidden = false }: { view?: GuildCompanionView; hidden?: boolean }) {
  const [games, setGames] = useState<LocalGame[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [cloudLabBusy, setCloudLabBusy] = useState(false);
  const [cloudLabMessage, setCloudLabMessage] = useState('Runtime is not provisioned. You can check whether server-side workspace metadata is available.');
  const [syncMessage, setSyncMessage] = useState('Sign in and sync to merge this device library with your account library.');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Browser');
  const [launchUrl, setLaunchUrl] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryPlatformFilter, setLibraryPlatformFilter] = useState('All');
  const [audioFiles, setAudioFiles] = useState<MediaFile[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaMessage, setMediaMessage] = useState('');
  const audioInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLAudioElement>(null);
  const libraryImportInput = useRef<HTMLInputElement>(null);
  const audioFilesRef = useRef<MediaFile[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LIBRARY_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setGames(parsed.filter((item): item is LocalGame =>
          item && typeof item.id === 'string' && typeof item.title === 'string' &&
          typeof item.platform === 'string' && typeof item.launchUrl === 'string' &&
          ['Browser', 'Steam', 'Xbox', 'RetroArch', 'Other'].includes(item.platform)).map((item: LocalGame) => ({ ...item, launchUrl: safeWebUrl(item.launchUrl) })));
      }
    } catch { setStorageWarning(true); }
    finally { setLibraryLoaded(true); }
  }, []);

  useEffect(() => {
    if (!libraryLoaded) return;
    try {
      window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(games));
      setStorageWarning(false);
    } catch { setStorageWarning(true); }
  }, [games, libraryLoaded]);

  useEffect(() => { audioFilesRef.current = audioFiles; }, [audioFiles]);
  useEffect(() => { folderInput.current?.setAttribute('webkitdirectory', ''); folderInput.current?.setAttribute('directory', ''); }, []);
  useEffect(() => () => audioFilesRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);
  useEffect(() => {
    const publish = () => window.dispatchEvent(new CustomEvent('guild-music-state', { detail: {
      title: audioFiles[currentTrack]?.file.name ?? '', hasTracks: audioFiles.length > 0,
      isPlaying, currentTime, duration, index: currentTrack, count: audioFiles.length
    }}));
    publish();
  }, [audioFiles, currentTrack, isPlaying, currentTime, duration]);
  useEffect(() => {
    const onAction = (event: Event) => {
      const action = (event as CustomEvent<string>).detail;
      if (action === 'play-pause') {
        const player = playerRef.current;
        if (!player || !audioFiles.length) return;
        if (player.paused) void player.play().then(() => setIsPlaying(true)).catch(() => setMediaMessage('Playback was blocked. Press Play in the music player to start audio.'));
        else { player.pause(); setIsPlaying(false); }
      } else if (action === 'next') changeTrack(1);
      else if (action === 'previous') changeTrack(-1);
      else if (action === 'open') window.dispatchEvent(new CustomEvent('guild-music-panel-open'));
    };
    window.addEventListener('guild-music-action', onAction);
    return () => window.removeEventListener('guild-music-action', onAction);
  }, [audioFiles, currentTrack]);
  useEffect(() => {
    if (playerRef.current && audioFiles[currentTrack]) {
      playerRef.current.load();
      if (isPlaying) void playerRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, audioFiles]);
  const changeTrack = (delta: number) => {
    if (!audioFiles.length) return;
    setCurrentTrack((index) => (index + delta + audioFiles.length) % audioFiles.length);
    setCurrentTime(0);
  };
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const existing = audioFilesRef.current;
    const remaining = Math.max(0, MAX_MEDIA_FILES - existing.length);
    let totalBytes = existing.reduce((total, item) => total + item.file.size, 0);
    const eligible = Array.from(files).filter((file) => file.type.startsWith('audio/') && file.size > 0 && file.size <= MAX_AUDIO_BYTES);
    const selected: File[] = [];
    for (const file of eligible) {
      if (selected.length >= remaining || totalBytes + file.size > MAX_AUDIO_TOTAL_BYTES) continue;
      selected.push(file); totalBytes += file.size;
    }
    const additions = selected.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    setAudioFiles((current) => [...current, ...additions]);
    if (!existing.length && additions.length) setCurrentTrack(0);
    const skipped = files.length - selected.length;
    setMediaMessage(selected.length ? `${selected.length} track(s) added to your queue. ${skipped ? `${skipped} skipped due to file type or size limits. ` : ''}Audio stays on this device and is not uploaded.` : 'No audio added. Select audio files up to 100 MB each (250 MB total), with a 30-track limit.');
  };

  const exportLibrary = () => {
    try {
      const blob = new Blob([JSON.stringify({ format: 'sanctuary-guild-library', version: 1, exportedAt: new Date().toISOString(), games }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sanctuary-guild-library.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMediaMessage('Library backup exported to your device. It contains game titles, platform labels and web links only.');
    } catch {
      setMediaMessage('Could not export the library in this browser.');
    }
  };

  const importLibrary = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setMediaMessage('Library backup is too large. Choose a JSON file smaller than 1 MB.');
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || !('format' in parsed) || parsed.format !== 'sanctuary-guild-library' || !('version' in parsed) || parsed.version !== 1 || !('games' in parsed) || !Array.isArray(parsed.games)) {
        throw new Error('format');
      }
      const allowedPlatforms = ['Browser', 'Steam', 'Xbox', 'RetroArch', 'Other'];
      const valid = parsed.games.filter((item): item is LocalGame =>
        Boolean(item) && typeof item === 'object' &&
        typeof item.id === 'string' && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 80 &&
        typeof item.platform === 'string' && allowedPlatforms.includes(item.platform) &&
        typeof item.launchUrl === 'string' && (!item.launchUrl || Boolean(safeWebUrl(item.launchUrl)))
      ).slice(0, 500).map((item) => ({ ...item, id: crypto.randomUUID(), title: item.title.trim(), launchUrl: safeWebUrl(item.launchUrl) }));
      if (valid.length === 0 && parsed.games.length > 0) {
        setMediaMessage('No valid game entries were found in that backup.');
        return;
      }
      setGames((current) => {
        const merged = [...current];
        for (const item of valid) {
          if (!merged.some((existing) => existing.title.toLowerCase() === item.title.toLowerCase() && existing.platform === item.platform)) merged.push(item);
        }
        return merged.slice(0, 500);
      });
      setMediaMessage(`Imported ${valid.length} validated entries. Existing titles on the same platform were kept without duplicates.`);
    } catch {
      setMediaMessage('That file is not a supported Sanctuary Guild library backup.');
    } finally {
      if (libraryImportInput.current) libraryImportInput.current.value = '';
    }
  };

  const syncLibrary = async () => {
    if (syncBusy || !libraryLoaded) return;
    setSyncBusy(true);
    setSyncMessage('Checking your Sanctuary account…');
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setSyncMessage('Sign in to Sanctuary before syncing. Your existing device-local library has not been changed.');
        return;
      }

      try {
        const previousOwner = window.localStorage.getItem(OWNER_KEY);
        if (previousOwner && previousOwner !== authData.user.id) {
          setSyncMessage('This browser cache belongs to a different Sanctuary account. Export its library before switching accounts; syncing was stopped to prevent mixing private libraries.');
          return;
        }
      } catch {
        setStorageWarning(true);
        setSyncMessage('Could not verify which account owns this browser cache. Sync was stopped to protect account privacy.');
        return;
      }

      const { data: remoteRows, error: readError } = await supabase
        .from('guild_library_entries')
        .select('id, title, platform, launch_url, updated_at')
        .order('updated_at', { ascending: false });
      if (readError) {
        setSyncMessage(readError.code === '42P01' || readError.code === 'PGRST205'
          ? 'Server library is not available yet. The database migration must be applied before syncing; your local library is unchanged.'
          : `Could not read your server library (${readError.message}). Your local library is unchanged.`);
        return;
      }

      let pendingDeletes: string[] = [];
      try {
        const savedDeletes = window.localStorage.getItem(DELETED_IDS_KEY);
        const parsedDeletes: unknown = savedDeletes ? JSON.parse(savedDeletes) : [];
        if (Array.isArray(parsedDeletes)) pendingDeletes = parsedDeletes.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 500);
      } catch {
        setStorageWarning(true);
        setSyncMessage('Could not read the pending deletion queue. Nothing was deleted from the server; check browser storage before syncing again.');
        return;
      }
      if (pendingDeletes.length) {
        const { error: deleteError } = await supabase.from('guild_library_entries').delete().in('id', pendingDeletes);
        if (deleteError) {
          setSyncMessage(`Could not finish syncing a library removal (${deleteError.message}). Pending removals are kept for your next attempt.`);
          return;
        }
      }

      const removedIds = new Set(pendingDeletes);
      const remote = ((remoteRows || []) as Array<{ id: string; title: string; platform: string; launch_url: string; updated_at: string }>).filter((item) => !removedIds.has(item.id));
      const remoteKeys = new Set(remote.map((item) => `${item.platform.toLowerCase()}::${item.title.trim().toLowerCase()}`));
      let added = 0;
      for (const item of games) {
        const key = `${item.platform.toLowerCase()}::${item.title.trim().toLowerCase()}`;
        if (remoteKeys.has(key)) continue;
        const { error: insertError } = await supabase.from('guild_library_entries').insert({
          user_id: authData.user.id,
          title: item.title.trim(),
          platform: item.platform,
          launch_url: safeWebUrl(item.launchUrl),
        });
        if (insertError) {
          if (insertError.code === '23505') continue;
          setSyncMessage(`Sync stopped while saving your library (${insertError.message}). Your server copy may contain some entries; try syncing again to finish.`);
          return;
        }
        remoteKeys.add(key);
        added += 1;
      }

      const { data: finalRows, error: finalError } = await supabase
        .from('guild_library_entries')
        .select('id, title, platform, launch_url, updated_at')
        .order('updated_at', { ascending: false });
      if (finalError) {
        setSyncMessage(`Your entries may have been saved, but the final server refresh failed (${finalError.message}). Try syncing again.`);
        return;
      }
      const synced = ((finalRows || []) as Array<{ id: string; title: string; platform: string; launch_url: string }>)
        .map((item) => ({ id: item.id, title: item.title, platform: item.platform, launchUrl: safeWebUrl(item.launch_url) }));
      try {
        window.localStorage.setItem(OWNER_KEY, authData.user.id);
        window.localStorage.removeItem(DELETED_IDS_KEY);
        setStorageWarning(false);
      } catch {
        setStorageWarning(true);
        setSyncMessage('The server responded, but this browser could not safely save its account binding. Your visible library was left unchanged; export a backup and check browser storage before switching accounts.');
        return;
      }
      setGames(synced);
      setSyncMessage(`Synced ${synced.length} game entries to your Sanctuary account. Added ${added} new entr${added === 1 ? 'y' : 'ies'} from this device; queued removals were applied.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown connection error';
      setSyncMessage(`Server sync could not start: ${detail}. Your local library remains available.`);
    } finally {
      setSyncBusy(false);
    }
  };

  const visibleGames = games.filter((game) => {
    const matchesSearch = game.title.toLocaleLowerCase().includes(librarySearch.trim().toLocaleLowerCase());
    const matchesPlatform = libraryPlatformFilter === 'All' || game.platform === libraryPlatformFilter;
    return matchesSearch && matchesPlatform;
  });

  const checkCloudLabStatus = async () => {
    if (cloudLabBusy) return;
    setCloudLabBusy(true);
    setCloudLabMessage('Checking your authenticated Cloud Lab status…');
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setCloudLabMessage('Sign in to Sanctuary to check workspace status. No workspace was started.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('guild-cloud-lab-control', { body: { action: 'status' } });
      if (error) {
        setCloudLabMessage('Cloud Lab status is unavailable. Confirm the Edge Function is deployed, APP_BASE_URL is configured, and the database migration is installed. No compute was started.');
        return;
      }
      if (!data || data.configured !== false || data.runtimeAvailable !== false) {
        setCloudLabMessage('The status response was not recognised. No workspace action was requested.');
        return;
      }
      const workspace = data.workspace as { state?: string; disk_quota_mb?: number; cpu_limit_millicores?: number; memory_limit_mb?: number; runtime_limit_minutes?: number } | null;
      if (workspace) {
        setCloudLabMessage(`Workspace metadata: ${workspace.state ?? 'unknown'} · ${workspace.disk_quota_mb ?? '—'} MB disk · ${workspace.cpu_limit_millicores ?? '—'} millicores · ${workspace.memory_limit_mb ?? '—'} MB memory · ${workspace.runtime_limit_minutes ?? '—'} min runtime cap. A terminal runtime is not connected.`);
      } else {
        setCloudLabMessage(typeof data.message === 'string' ? data.message : 'No workspace metadata found. Cloud Lab does not start compute in this build.');
      }
    } catch {
      setCloudLabMessage('Could not contact Cloud Lab. Check your connection and server configuration; no compute was started.');
    } finally {
      setCloudLabBusy(false);
    }
  };

  const removeGame = (game: LocalGame) => {
    try {
      const saved = window.localStorage.getItem(DELETED_IDS_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
      if (!ids.includes(game.id)) window.localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...ids, game.id].slice(-500)));
    } catch {
      setStorageWarning(true);
      setMediaMessage('This browser could not queue the removal for server sync. The entry will be removed from this view, but may return when you sync.');
    }
    setGames((current) => current.filter((item) => item.id !== game.id));
  };

  const addGame = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    if (games.length >= 500) {
      setMediaMessage('Your library has reached the 500-game limit. Export a backup and remove entries before adding more.');
      return;
    }
    let cleanUrl = '';
    if (launchUrl.trim()) {
      try {
        const parsed = new URL(launchUrl.trim());
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          setMediaMessage('For safety, this web library only accepts http(s) links. Native app launching needs the optional companion.');
          return;
        }
        cleanUrl = parsed.toString();
      } catch {
        setMediaMessage('Enter a complete https:// or http:// link, or leave the link blank for a saved library entry.');
        return;
      }
    }
    if (games.some((item) => item.title.toLowerCase() === cleanTitle.toLowerCase() && item.platform === platform)) {
      setMediaMessage('That title is already in your library for this platform.');
      return;
    }
    setGames((current) => [...current, { id: crypto.randomUUID(), title: cleanTitle, platform, launchUrl: cleanUrl }]);
    setTitle('');
    setLaunchUrl('');
  };

  return (
    <section className={hidden ? styles.hiddenHub : styles.hub} aria-label="Guild companion features" aria-hidden={hidden}>
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>THE GUILD · PERSONAL SPACE</p><h2>{view === 'library' ? 'Game library' : view === 'music' ? 'Music player' : view === 'tools' ? 'Guild tools' : 'Library & lounges'}</h2><p>{view === 'music' ? 'Your personal music queue, with folder selection and full playback controls.' : view === 'library' ? 'Keep a personal catalogue alongside the featured Guild games. Account sync still depends on the staged database migration.' : 'Your game catalogue and personal media are separated into their own Guild pages. Personal media stays on your device by default.'}</p></div>
        <span className={styles.privacy}><ShieldCheck size={15} />{view === 'music' ? ' Device-local media' : view === 'tools' ? ' Status & integrations' : ' Local cache + account sync'}</span>
      </div>

      {(view === 'all' || view === 'library') && (
      <section className={styles.panel} aria-labelledby="guild-library-title">
        <div className={styles.panelHeading}><span className={styles.icon}><Library size={19} /></span><div><h3 id="guild-library-title">Unified game library</h3><p>Add titles locally, then use Sign in & sync to merge them with your account library. No installed-game scan has been performed.</p></div></div>
        <div className={styles.libraryTools}>
          <button type="button" className={styles.primary} onClick={() => void syncLibrary()} disabled={syncBusy || !libraryLoaded}><ShieldCheck size={14} /> {syncBusy ? 'Syncing…' : !libraryLoaded ? 'Loading library…' : 'Sign in & sync'}</button>
          <button type="button" className={styles.secondary} onClick={exportLibrary} disabled={!libraryLoaded || syncBusy}><Download size={14} /> Export backup</button>
          <input ref={libraryImportInput} className={styles.hiddenInput} type="file" accept="application/json,.json" onChange={(event) => void importLibrary(event.target.files?.[0])} />
          <button type="button" className={styles.secondary} onClick={() => libraryImportInput.current?.click()} disabled={!libraryLoaded || syncBusy}><Upload size={14} /> Import backup</button>
        </div>
        <form className={styles.gameForm} onSubmit={(event) => { event.preventDefault(); if (libraryLoaded && !syncBusy) addGame(); }}>
          <label>Game name<input disabled={!libraryLoaded || syncBusy} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Celestial Racer" maxLength={80} required /></label>
          <label>Platform<select disabled={!libraryLoaded || syncBusy} value={platform} onChange={(event) => setPlatform(event.target.value)}>{platforms.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className={styles.urlField}>Optional web game / store link<input disabled={!libraryLoaded || syncBusy} value={launchUrl} onChange={(event) => setLaunchUrl(event.target.value)} placeholder="https://…" inputMode="url" /></label>
          <button type="submit" className={styles.primary} disabled={!libraryLoaded || syncBusy}><Plus size={15} /> Add to library</button>
        </form>
        <p className={styles.status} role="status" aria-live="polite">{syncMessage}</p>
        {games.length > 0 && <div className={styles.libraryFilters}>
          <label>Search library<input type="search" value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Find a game…" aria-label="Search game library" /></label>
          <label>Platform<select value={libraryPlatformFilter} onChange={(event) => setLibraryPlatformFilter(event.target.value)} aria-label="Filter games by platform"><option>All</option>{platforms.map((item) => <option key={item}>{item}</option>)}</select></label>
          <span aria-live="polite">{visibleGames.length} of {games.length} games</span>
        </div>}
        {games.length ? visibleGames.length ? <ul className={styles.gameList}>{visibleGames.map((game) => <li key={game.id}><span className={styles.gameGlyph}><Gamepad2 size={18} /></span><div className={styles.gameInfo}><strong>{game.title}</strong><small>{game.platform}{game.launchUrl ? ' · link available' : ' · saved entry only'}</small></div>{game.launchUrl && <a className={styles.openLink} href={safeWebUrl(game.launchUrl)} target="_blank" rel="noopener noreferrer">Open <ExternalLink size={13} /></a>}<button type="button" className={styles.iconButton} aria-label={`Remove ${game.title}`} onClick={() => removeGame(game)} disabled={!libraryLoaded || syncBusy}><Trash2 size={15} /></button></li>)}</ul> : <p className={styles.empty}>No games match these filters. Clear the search or choose another platform.</p> : <p className={styles.empty}>Your library is waiting. Add browser games or record titles you play on PC and console.</p>}
        <div className={styles.notice}><strong>Next integration:</strong> an optional signed Sanctuary Companion can request permission to scan supported game locations and launch compatible installed titles. A website alone cannot enumerate your device or execute arbitrary local apps.</div>      </section>)}
      <div className={view === 'all' ? styles.mediaGrid : styles.singleMedia}>
        {(view === 'all' || view === 'music') && (
        <section className={styles.panel} aria-labelledby="guild-music-title">
          <div className={styles.panelHeading}><span className={styles.icon}><Music2 size={19} /></span><div><h3 id="guild-music-title">Music lounge</h3><p>Select audio from your device to play in the Guild.</p></div></div>
          <input ref={audioInput} className={styles.hiddenInput} type="file" accept="audio/*" multiple onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
          <input ref={folderInput} className={styles.hiddenInput} type="file" accept="audio/*" multiple onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
          <div className={styles.libraryTools}>
            <button type="button" className={styles.primary} onClick={() => folderInput.current?.click()}><FolderOpen size={15} /> Choose music folder</button>
            <button type="button" className={styles.secondary} onClick={() => audioInput.current?.click()}><Plus size={15} /> Add individual tracks</button>
          </div>
          <p className={styles.footnote}>Choose a folder to add its supported audio files in one go. Your browser asks you to select the folder; it does not grant silent access to the rest of your device. Folder selection support varies by browser, with individual-file selection as a fallback. The queue lasts for this browser session.</p>
          {audioFiles.length > 0 ? <div className={styles.player}>
            <audio ref={playerRef} src={audioFiles[currentTrack]?.url} preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onEnded={() => changeTrack(1)} />
            <div className={styles.nowPlaying}><span className={styles.icon}><Music2 size={20} /></span><div><small>NOW PLAYING · {currentTrack + 1} OF {audioFiles.length}</small><strong title={audioFiles[currentTrack]?.file.name}>{audioFiles[currentTrack]?.file.name}</strong></div></div>
            <input className={styles.seek} aria-label="Seek track" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => { if (playerRef.current) playerRef.current.currentTime = Number(event.target.value); }} />
            <div className={styles.timeRow}><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            <div className={styles.playerControls}>
              <button type="button" className={styles.secondary} aria-label="Previous track" onClick={() => changeTrack(-1)}><SkipBack size={18} /></button>
              <button type="button" className={styles.primary} aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => window.dispatchEvent(new CustomEvent('guild-music-action',{detail:'play-pause'}))}>{isPlaying ? <Pause size={19} /> : <Play size={19} />}</button>
              <button type="button" className={styles.secondary} aria-label="Next track" onClick={() => changeTrack(1)}><SkipForward size={18} /></button>
            </div>
            <div className={styles.queueList}>{audioFiles.map((item,index) => <button type="button" key={item.id} data-active={index===currentTrack} onClick={() => {setCurrentTrack(index);setIsPlaying(true);}}><span>{index+1}</span><strong>{item.file.name}</strong>{index===currentTrack && <span>Playing</span>}</button>)}</div>
            <button type="button" className={styles.textButton} onClick={() => { playerRef.current?.pause(); audioFiles.forEach((item) => URL.revokeObjectURL(item.url)); setAudioFiles([]); setCurrentTrack(0); setIsPlaying(false); }}>Clear music queue</button>
          </div> : <div className={styles.empty}>No music selected. Choose a folder or add tracks to build your queue.</div>}        </section>)}

      </div>
      {(view === 'all' || view === 'library') && storageWarning && <p className={styles.status} role="status">This browser could not read or save the device-local cache. Sign in and sync to keep a server copy; changes may not persist on this device.</p>}
      {(view === 'all' || view === 'music') && mediaMessage && <p className={styles.status} role="status">{mediaMessage}</p>}

      {(view === 'all' || view === 'tools') && (
      <section className={styles.panel} aria-labelledby="guild-cloud-lab-title">
        <div className={styles.panelHeading}><span className={styles.icon}><Terminal size={19} /></span><div><h3 id="guild-cloud-lab-title">Cloud Lab · persistent Linux <span className={styles.statusPill}>In development</span></h3><p>Paused here until a safe runtime can be provided; this is deliberately not a simulated terminal.</p></div></div>
        <div className={styles.notice}><strong>Pinned for later development.</strong> The Sanctuary website and Supabase can handle the account, permissions and control-plane groundwork, but a real persistent Linux terminal also needs an isolated compute runtime and durable storage. Those are not included in the current app/database alone. No provider has been selected and no paid service is being started. For now, Cloud Lab stays labelled in development while Guild improvements continue.</div>
        <div className={styles.libraryTools}>
          <button type="button" className={styles.secondary} onClick={() => void checkCloudLabStatus()} disabled={cloudLabBusy}>
            <ShieldCheck size={14} /> {cloudLabBusy ? 'Checking status…' : 'Check workspace status'}
          </button>
        </div>
        <p className={styles.status} role="status" aria-live="polite">{cloudLabMessage}</p>
        <div className={styles.serviceChips}><span>Per-user isolation</span><span>Persistent home directory</span><span>Resource quotas</span><span>Secure terminal gateway</span><span>Stop / reset controls</span><span>Cost and abuse limits</span></div>      </section>)}
      {(view === 'all' || view === 'tools') && (
      <section className={styles.panel} aria-labelledby="guild-connect-title">
        <div className={styles.panelHeading}><span className={styles.icon}><Gamepad2 size={19} /></span><div><h3 id="guild-connect-title">Gaming worlds & achievements</h3><p>Official destinations now; authenticated account connections are future work.</p></div></div>
        <div className={styles.services}>{services.map((service) => <article className={styles.service} key={service.name}><div className={styles.serviceTop}><strong>{service.name}</strong><span>{service.kind}</span></div><p>{service.description}</p><a href={service.url} target="_blank" rel="noopener noreferrer">Open official site <ExternalLink size={13} /></a></article>)}</div>
        <div className={styles.notice}><strong>RetroArch & RetroAchievements:</strong> use a compatible RetroArch installation and your own legally obtained game files. The Guild will not provide ROM downloads. Future integration can import supported achievement data with your consent; achievement verification must come from the platform, not a self-reported score.</div>      </section>)}
      {(view === 'all' || view === 'tools') && <p className={styles.footnote}>Storage plan: server-backed account data and sync, local caching for resilience, and device-local media by default. Selected media stays in this browser session and is not uploaded. Your game list is cached in this browser and can be synced to your account when the library migration is installed. Cloud media backup, account linking to gaming platforms, automatic scanning and native launch are not enabled yet.</p>}
    </section>
  );
}
