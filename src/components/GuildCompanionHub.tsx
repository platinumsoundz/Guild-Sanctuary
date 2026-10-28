'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Gamepad2, Image as ImageIcon, Library, Music2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import styles from './GuildCompanionHub.module.css';

type LocalGame = { id: string; title: string; platform: string; launchUrl: string };
type MediaFile = { id: string; file: File; url: string };

const LIBRARY_KEY = 'sanctuary-guild-local-library-v1';
const platforms = ['Browser', 'Steam', 'Xbox', 'RetroArch', 'Other'];

const services = [
  { name: 'RetroArch', kind: 'Emulator frontend', description: 'Use the official app for local emulation. The Guild does not download ROMs or launch desktop emulators from a browser.', url: 'https://www.retroarch.com/' },
  { name: 'RetroAchievements', kind: 'Retro game achievements', description: 'Explore supported games and set up achievements in a compatible RetroArch build. Account linking and verified sync are planned, not connected yet.', url: 'https://retroachievements.org/' },
  { name: 'Steam', kind: 'PC game library', description: 'Open your Steam library. Reading ownership, achievements and launching installed games requires a later authorised integration or companion.', url: 'https://store.steampowered.com/' },
  { name: 'Xbox', kind: 'Console & PC ecosystem', description: 'Open Xbox services. Account sign-in, achievements and installed-game discovery are not connected to Sanctuary yet.', url: 'https://www.xbox.com/' },
  { name: 'GOG', kind: 'PC game library', description: 'Keep GOG titles in your planned unified library. Automatic discovery and launching need the desktop companion.', url: 'https://www.gog.com/' },
  { name: 'itch.io', kind: 'Indie games', description: 'Browse indie games and add supported browser-playable titles to your personal library.', url: 'https://itch.io/' },
];

export function GuildCompanionHub() {
  const [games, setGames] = useState<LocalGame[]>([]);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Browser');
  const [launchUrl, setLaunchUrl] = useState('');
  const [audioFiles, setAudioFiles] = useState<MediaFile[]>([]);
  const [photos, setPhotos] = useState<MediaFile[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [mediaMessage, setMediaMessage] = useState('');
  const audioInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const audioFilesRef = useRef<MediaFile[]>([]);
  const photosRef = useRef<MediaFile[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LIBRARY_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setGames(parsed.filter((item): item is LocalGame =>
          item && typeof item.id === 'string' && typeof item.title === 'string' &&
          typeof item.platform === 'string' && typeof item.launchUrl === 'string'));
      }
    } catch { /* A local library is optional and can be rebuilt. */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(games)); } catch { /* Private browsing may disable storage. */ }
  }, [games]);

  useEffect(() => { audioFilesRef.current = audioFiles; }, [audioFiles]);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => {
    audioFilesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    photosRef.current.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  useEffect(() => {
    if (!slideshow || photos.length < 2) return;
    const timer = window.setInterval(() => setPhotoIndex((index) => (index + 1) % photos.length), 5000);
    return () => window.clearInterval(timer);
  }, [photos.length, slideshow]);

  const addFiles = (files: FileList | null, type: 'audio' | 'photo') => {
    if (!files) return;
    const selected = Array.from(files).filter((file) => type === 'audio' ? file.type.startsWith('audio/') : file.type.startsWith('image/'));
    const additions = selected.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    if (type === 'audio') setAudioFiles((current) => [...current, ...additions]);
    else {
      setPhotos((current) => [...current, ...additions]);
      setPhotoIndex(0);
      setSlideshow(false);
    }
    setMediaMessage(selected.length ? `${selected.length} ${type === 'audio' ? 'audio file(s)' : 'photo(s)'} selected. Files stay in this browser session; they are not uploaded.` : 'Choose supported audio or image files.');
  };

  const addGame = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
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
    setGames((current) => [...current, { id: crypto.randomUUID(), title: cleanTitle, platform, launchUrl: cleanUrl }]);
    setTitle('');
    setLaunchUrl('');
  };

  return (
    <section className={styles.hub} aria-label="Guild companion features">
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>YOUR PERSONAL ORBIT</p><h2>Library & lounges</h2><p>Build your local library, enjoy your own media, and prepare your connected gaming worlds.</p></div>
        <span className={styles.privacy}><ShieldCheck size={15} /> Local-first</span>
      </div>

      <section className={styles.panel} aria-labelledby="guild-library-title">
        <div className={styles.panelHeading}><span className={styles.icon}><Library size={19} /></span><div><h3 id="guild-library-title">Unified game library</h3><p>Saved on this device. No installed-game scan has been performed.</p></div></div>
        <form className={styles.gameForm} onSubmit={(event) => { event.preventDefault(); addGame(); }}>
          <label>Game name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Celestial Racer" maxLength={80} required /></label>
          <label>Platform<select value={platform} onChange={(event) => setPlatform(event.target.value)}>{platforms.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className={styles.urlField}>Optional web game / store link<input value={launchUrl} onChange={(event) => setLaunchUrl(event.target.value)} placeholder="https://…" inputMode="url" /></label>
          <button type="submit" className={styles.primary}><Plus size={15} /> Add to library</button>
        </form>
        {games.length ? <ul className={styles.gameList}>{games.map((game) => <li key={game.id}><span className={styles.gameGlyph}><Gamepad2 size={18} /></span><div className={styles.gameInfo}><strong>{game.title}</strong><small>{game.platform}{game.launchUrl ? ' · link available' : ' · saved entry only'}</small></div>{game.launchUrl && <a className={styles.openLink} href={game.launchUrl} target="_blank" rel="noreferrer">Open <ExternalLink size={13} /></a>}<button type="button" className={styles.iconButton} aria-label={`Remove ${game.title}`} onClick={() => setGames((current) => current.filter((item) => item.id !== game.id))}><Trash2 size={15} /></button></li>)}</ul> : <p className={styles.empty}>Your library is waiting. Add browser games or record titles you play on PC and console.</p>}
        <div className={styles.notice}><strong>Next integration:</strong> an optional signed Sanctuary Companion can request permission to scan supported game locations and launch compatible installed titles. A website alone cannot enumerate your device or execute arbitrary local apps.</div>
      </section>

      <div className={styles.mediaGrid}>
        <section className={styles.panel} aria-labelledby="guild-music-title">
          <div className={styles.panelHeading}><span className={styles.icon}><Music2 size={19} /></span><div><h3 id="guild-music-title">Music lounge</h3><p>Select audio from your device to play in the Guild.</p></div></div>
          <input ref={audioInput} className={styles.hiddenInput} type="file" accept="audio/*" multiple onChange={(event) => addFiles(event.target.files, 'audio')} />
          <button type="button" className={styles.secondary} onClick={() => audioInput.current?.click()}><Plus size={15} /> Choose music files</button>
          {audioFiles.length > 0 ? <div className={styles.audioList}>{audioFiles.map((item) => <div className={styles.audioItem} key={item.id}><strong title={item.file.name}>{item.file.name}</strong><audio controls preload="metadata" src={item.url}>Your browser does not support audio playback.</audio><button type="button" className={styles.textButton} onClick={() => { URL.revokeObjectURL(item.url); setAudioFiles((current) => current.filter((file) => file.id !== item.id)); }}>Remove</button></div>)}</div> : <div className={styles.empty}>No audio selected. Playback is local to this page; streaming-service account linking is a separate future integration.</div>}
        </section>

        <section className={styles.panel} aria-labelledby="guild-gallery-title">
          <div className={styles.panelHeading}><span className={styles.icon}><ImageIcon size={19} /></span><div><h3 id="guild-gallery-title">Memory gallery</h3><p>Choose photos for a private, in-browser slideshow.</p></div></div>
          <input ref={photoInput} className={styles.hiddenInput} type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files, 'photo')} />
          <button type="button" className={styles.secondary} onClick={() => photoInput.current?.click()}><Plus size={15} /> Choose photos</button>
          {photos.length > 0 ? <div className={styles.gallery}>
            <img src={photos[photoIndex]?.url} alt={photos[photoIndex]?.file.name || 'Selected personal photo'} />
            <div className={styles.galleryControls}><button type="button" className={styles.secondary} onClick={() => { setSlideshow(false); setPhotoIndex((index) => (index - 1 + photos.length) % photos.length); }}>Previous</button><span>{photoIndex + 1} / {photos.length}</span><button type="button" className={styles.secondary} onClick={() => { setSlideshow(false); setPhotoIndex((index) => (index + 1) % photos.length); }}>Next</button></div>
            <button type="button" className={styles.primary} onClick={() => setSlideshow((value) => !value)}>{slideshow ? 'Pause slideshow' : 'Start 5-second slideshow'}</button>
            <button type="button" className={styles.textButton} onClick={() => { photos.forEach((item) => URL.revokeObjectURL(item.url)); setPhotos([]); setPhotoIndex(0); setSlideshow(false); }}>Clear selected photos</button>
          </div> : <div className={styles.empty}>No photos selected. Your images are previewed locally and are not uploaded to Sanctuary.</div>}
        </section>
      </div>
      {mediaMessage && <p className={styles.status} role="status">{mediaMessage}</p>}

      <section className={styles.panel} aria-labelledby="guild-connect-title">
        <div className={styles.panelHeading}><span className={styles.icon}><Gamepad2 size={19} /></span><div><h3 id="guild-connect-title">Gaming worlds & achievements</h3><p>Official destinations now; authenticated account connections are future work.</p></div></div>
        <div className={styles.services}>{services.map((service) => <article className={styles.service} key={service.name}><div className={styles.serviceTop}><strong>{service.name}</strong><span>{service.kind}</span></div><p>{service.description}</p><a href={service.url} target="_blank" rel="noreferrer">Open official site <ExternalLink size={13} /></a></article>)}</div>
        <div className={styles.notice}><strong>RetroArch & RetroAchievements:</strong> use a compatible RetroArch installation and your own legally obtained game files. The Guild will not provide ROM downloads. Future integration can import supported achievement data with your consent; achievement verification must come from the platform, not a self-reported score.</div>
      </section>
      <p className={styles.footnote}>Privacy: selected media stays in this browser session and is not uploaded. Your game list is stored in this browser only. Cross-device sync, cloud storage, account linking, automatic scanning and native launch are not enabled yet.</p>
    </section>
  );
}
