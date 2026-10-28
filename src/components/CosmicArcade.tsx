'use client';

import { useMemo, useState } from 'react';
import { CosmicSnake } from './CosmicSnake';
import { BookOpen, CreditCard, Gem, LockKeyhole, MoonStar, Puzzle, RotateCcw, Sparkles, Star } from 'lucide-react';
import styles from './CosmicArcade.module.css';

type ArcadeGame = 'wordsearch' | 'crossword' | 'solitaire' | 'mahjong' | 'snake';

const games: { id: ArcadeGame; title: string; subtitle: string; icon: typeof Star; status: string }[] = [
  { id: 'wordsearch', title: 'Starseed Word Search', subtitle: 'Find the cosmic words hidden in the grid.', icon: Puzzle, status: 'Playable preview' },
  { id: 'crossword', title: 'Celestial Crossword', subtitle: 'Reflect on stars, planets and spiritual traditions.', icon: BookOpen, status: 'Coming soon' },
  { id: 'solitaire', title: 'Lunar Solitaire', subtitle: 'A calm, moonlit take on a classic card game.', icon: MoonStar, status: 'Coming soon' },
  { id: 'mahjong', title: 'Zodiac Mahjong', subtitle: 'Match celestial tiles and zodiac symbols.', icon: Gem, status: 'Coming soon' },
  { id: 'snake', title: 'Cosmic Snake', subtitle: 'Collect stardust and see how long you survive.', icon: Sparkles, status: 'Playable preview' },
];

const wordGrid = [
  ['M','O','O','N','A','S','T','R'],
  ['S','T','A','R','S','O','L','A'],
  ['C','O','S','M','I','C','U','Y'],
  ['P','L','A','N','E','T','N','S'],
  ['A','U','R','A','V','I','B','E'],
  ['G','A','L','A','X','Y','R','E'],
  ['S','O','L','S','T','I','C','E'],
  ['Z','O','D','I','A','C','E','N'],
];
const words = ['MOON', 'STAR', 'COSMIC', 'PLANET', 'AURA', 'GALAXY', 'ZODIAC'];
const themes = [
  { id: 'nebula', name: 'Nebula Dreams', desc: 'Violet and indigo stardust' },
  { id: 'lunar', name: 'Lunar Silver', desc: 'Soft silver moonlight' },
  { id: 'zodiac', name: 'Zodiac Wheel', desc: 'Twelve signs in a cosmic ring' },
];

export function CosmicArcade() {
  const [selectedGame, setSelectedGame] = useState<ArcadeGame>('wordsearch');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const progress = useMemo(() => Math.round((foundWords.length / words.length) * 100), [foundWords.length]);

  const toggleCell = (key: string) => {
    setNotice('');
    setSelectedCells((previous) => {
      const next = previous.includes(key) ? previous.filter((cell) => cell !== key) : [...previous, key];
      const guess = next.map((cell) => cell.split('-')).sort((a, b) => Number(a[0]) - Number(b[0])).map(([row, col]) => wordGrid[Number(row)][Number(col)]).join('');
      const reverse = guess.split('').reverse().join('');
      const match = words.find((word) => word === guess || word === reverse);
      if (match && !foundWords.includes(match)) {
        setFoundWords((current) => [...current, match]);
        setNotice(`You found ${match}! Cosmic alignment +1 ✨`);
        return [];
      }
      if (next.length >= 8) return [];
      return next;
    });
  };

  const resetWordSearch = () => {
    setSelectedCells([]);
    setFoundWords([]);
    setNotice('The star map has been reset.');
  };

  return (
    <section className={styles.arcade} aria-labelledby="arcade-title">
      <header className={styles.hero}>
        <p className={styles.eyebrow}><Sparkles size={14} /> THE SANCTUARY ARCADE</p>
        <h1 id="arcade-title">Play among the stars</h1>
        <p>Mindful little games inspired by the cosmos, symbolism, spiritual traditions and the zodiac. Play for fun, earn in-game progress, and personalise your experience.</p>
        <div className={styles.heroNote}><MoonStar size={18} /><span>Games are for reflection and entertainment, not predictions or professional advice.</span></div>
      </header>

      <div className={styles.gameTabs} role="tablist" aria-label="Arcade games">
        {games.map((game) => {
          const Icon = game.icon;
          return <button key={game.id} type="button" role="tab" aria-selected={selectedGame === game.id} className={selectedGame === game.id ? styles.activeTab : styles.tab} onClick={() => { setSelectedGame(game.id); setNotice(''); }}>
            <Icon size={18} /><span>{game.title}</span><small>{game.status}</small>
          </button>;
        })}
      </div>

      {selectedGame === 'snake' ? <CosmicSnake /> : selectedGame === 'wordsearch' ? (
        <div className={styles.playArea}>
          <div className={styles.playHeader}>
            <div><p className={styles.eyebrow}>MINDFUL PUZZLE</p><h2>Starseed Word Search</h2><p>Tap letters to find words running left-to-right. Words you find will be marked below.</p></div>
            <button className={styles.resetButton} type="button" onClick={resetWordSearch}><RotateCcw size={15} /> Reset</button>
          </div>
          <div className={styles.puzzleLayout}>
            <div className={styles.letterGrid} aria-label="Word search letter grid">
              {wordGrid.map((row, r) => row.map((letter, c) => {
                const key = `${r}-${c}`;
                const isFound = foundWords.some((word) => wordGrid[r].slice(c, c + word.length).join('') === word);
                return <button key={key} type="button" aria-label={`Row ${r + 1}, column ${c + 1}, ${letter}`} className={`${styles.letter} ${selectedCells.includes(key) ? styles.selectedLetter : ''} ${isFound ? styles.foundLetter : ''}`} onClick={() => toggleCell(key)}>{letter}</button>;
              }))}
            </div>
            <aside className={styles.wordList}>
              <h3>Words of the cosmos</h3>
              <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
              <p className={styles.progressText}>{foundWords.length} of {words.length} discovered</p>
              {words.map((word) => <p key={word} className={foundWords.includes(word) ? styles.wordFound : styles.word}>{foundWords.includes(word) ? '✦ ' : '◇ '}{word}</p>)}
              {notice && <p className={styles.notice} role="status">{notice}</p>}
            </aside>
          </div>
          <p className={styles.helper}>Preview rules: select letters in order, left-to-right. This first build is a small playable prototype; additional directions and generated puzzles are planned.</p>
        </div>
      ) : (
        <div className={styles.comingSoon}>
          <div className={styles.comingIcon}><MoonStar size={34} /></div>
          <p className={styles.eyebrow}>ON THE COSMIC ROADMAP</p>
          <h2>{games.find((game) => game.id === selectedGame)?.title}</h2>
          <p>{games.find((game) => game.id === selectedGame)?.subtitle}</p>
          <span className={styles.statusPill}>Coming soon</span>
          <p className={styles.helper}>The game will be marked playable only after its rules, mobile controls, accessibility and token interactions are implemented and tested.</p>
        </div>
      )}

      <section className={styles.economy} aria-labelledby="arcade-economy-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>COSMIC COLLECTION</p><h2 id="arcade-economy-title">Themes, boosts and second chances</h2></div><span className={styles.lockLabel}><LockKeyhole size={14} /> Purchases locked</span></div>
        <p className={styles.economyIntro}>Sanctuary Tokens could unlock visual themes, card backs, tile sets, hints, extra lives and revives. These are planned ideas, not purchasable items yet.</p>
        <div className={styles.themeGrid}>
          {themes.map((theme) => <article className={styles.themeCard} key={theme.id}><div className={`${styles.themeArt} ${styles[theme.id]}`}><Star size={28} /><span>✦ · ✧ · ✦</span></div><h3>{theme.name}</h3><p>{theme.desc}</p><button type="button" disabled><LockKeyhole size={14} /> Coming soon</button></article>)}
        </div>
        <div className={styles.reviveNote}><CreditCard size={20} /><div><strong>Example: revive in Cosmic Snake — 50 tokens</strong><p>We’ll only enable spending once a server-side transaction can verify the wallet balance, charge exactly once, and record a ledger entry. No tokens will be deducted by the browser.</p></div></div>
      </section>
    </section>
  );
}
