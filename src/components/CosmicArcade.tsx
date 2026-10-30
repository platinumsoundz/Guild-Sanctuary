'use client';

import { useMemo, useState } from 'react';
import { CosmicSnake } from './CosmicSnake';
import { LunarSolitaire } from './LunarSolitaire';
import { CelestialCrossword } from './CelestialCrossword';
import { ArcadeClassics } from './ArcadeClassics';
import { BookOpen, CreditCard, Gem, LockKeyhole, MoonStar, Puzzle, RotateCcw, Sparkles, Star } from 'lucide-react';
import styles from './CosmicArcade.module.css';

type ArcadeGame = 'wordsearch' | 'crossword' | 'solitaire' | 'mahjong' | 'snake' | 'classics';
type Cell = { row: number; col: number };

const games: { id: ArcadeGame; title: string; subtitle: string; icon: typeof Star; status: string }[] = [
  { id: 'wordsearch', title: 'Starseed Word Search', subtitle: 'Find the cosmic words hidden in the grid.', icon: Puzzle, status: 'Playable preview' },
  { id: 'crossword', title: 'Celestial Crossword', subtitle: 'Reflect on stars, planets and spiritual traditions.', icon: BookOpen, status: 'Playable preview' },
  { id: 'solitaire', title: 'Lunar Solitaire', subtitle: 'A calm, moonlit take on a classic card game.', icon: MoonStar, status: 'Playable preview' },
  { id: 'mahjong', title: 'Zodiac Mahjong', subtitle: 'Match celestial tiles and zodiac symbols.', icon: Gem, status: 'Coming soon' },
  { id: 'snake', title: 'Cosmic Snake', subtitle: 'Collect stardust and see how long you survive.', icon: Sparkles, status: 'Playable preview' },
  { id: 'classics', title: 'Arcade Classics', subtitle: 'A collection of quick puzzles, memory games and arcade challenges.', icon: Star, status: '24 playable games' },
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

const cellKey = ({ row, col }: Cell) => `${row}-${col}`;

function getStraightPath(start: Cell, end: Cell): Cell[] | null {
  const rowDelta = end.row - start.row;
  const colDelta = end.col - start.col;
  if (rowDelta === 0 && colDelta === 0) return [start];
  if (rowDelta !== 0 && colDelta !== 0 && Math.abs(rowDelta) !== Math.abs(colDelta)) return null;
  const rowStep = Math.sign(rowDelta);
  const colStep = Math.sign(colDelta);
  const distance = Math.max(Math.abs(rowDelta), Math.abs(colDelta));
  return Array.from({ length: distance + 1 }, (_, index) => ({
    row: start.row + rowStep * index,
    col: start.col + colStep * index,
  }));
}

export function CosmicArcade() {
  const [selectedGame, setSelectedGame] = useState<ArcadeGame>('wordsearch');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [foundCells, setFoundCells] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const progress = useMemo(() => Math.round((foundWords.length / words.length) * 100), [foundWords.length]);

  const chooseCell = (row: number, col: number) => {
    const cell = { row, col };
    const key = cellKey(cell);
    setNotice('');

    if (foundCells.includes(key)) {
      setSelectedCells([]);
      setNotice('That star path has already been discovered. Choose another word.');
      return;
    }

    if (selectedCells.length !== 1) {
      setSelectedCells([key]);
      setNotice(`Start selected at row ${row + 1}, column ${col + 1}. Now choose the final letter.`);
      return;
    }

    const [startRow, startCol] = selectedCells[0].split('-').map(Number);
    const path = getStraightPath({ row: startRow, col: startCol }, cell);
    if (!path || path.length < 2) {
      setSelectedCells([key]);
      setNotice('Choose a straight horizontal, vertical or diagonal line. Start reset to this letter.');
      return;
    }

    const pathKeys = path.map(cellKey);
    const guess = path.map(({ row: r, col: c }) => wordGrid[r][c]).join('');
    const reverse = guess.split('').reverse().join('');
    const match = words.find((word) => word === guess || word === reverse);

    if (match && !foundWords.includes(match)) {
      setFoundWords((current) => [...current, match]);
      setFoundCells((current) => [...new Set([...current, ...pathKeys])]);
      setSelectedCells([]);
      setNotice(foundWords.length + 1 === words.length
        ? `You found ${match}! Every cosmic word is aligned — puzzle complete ✨`
        : `You found ${match}! Cosmic alignment +1 ✨`);
      return;
    }

    setSelectedCells([]);
    setNotice(match ? `${match} was already discovered. Find another word.` : 'Not a word this time. Choose a new starting letter and try again.');
  };

  const resetWordSearch = () => {
    setSelectedCells([]);
    setFoundCells([]);
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

      <section className={styles.availability} aria-label="Arcade availability">
        <div><strong>28</strong><span>Playable games</span><small>4 standalone previews + 24 Arcade Classics</small></div>
        <div><strong>1</strong><span>Coming soon</span><small>Zodiac Mahjong</small></div>
        <div><strong>24</strong><span>Arcade Classics</span><small>Full mini-game collection</small></div>
      </section>

      <div className={styles.gameTabs} role="tablist" aria-label="Arcade games">
        {games.map((game) => {
          const Icon = game.icon;
          return <button key={game.id} type="button" role="tab" aria-selected={selectedGame === game.id} className={selectedGame === game.id ? styles.activeTab : styles.tab} onClick={() => { setSelectedGame(game.id); setNotice(''); }}>
            <Icon size={18} /><span>{game.title}</span><small>{game.status}</small>
          </button>;
        })}
      </div>

      {selectedGame === 'classics' ? <ArcadeClassics /> : selectedGame === 'crossword' ? <CelestialCrossword /> : selectedGame === 'snake' ? <CosmicSnake /> : selectedGame === 'solitaire' ? <LunarSolitaire /> : selectedGame === 'wordsearch' ? (
        <div className={styles.playArea}>
          <div className={styles.playHeader}>
            <div><p className={styles.eyebrow}>MINDFUL PUZZLE</p><h2>Starseed Word Search</h2><p>Choose a word's first letter, then its last letter in a straight line. Horizontal, vertical and diagonal words all count.</p></div>
            <button className={styles.resetButton} type="button" onClick={resetWordSearch}><RotateCcw size={15} /> Reset</button>
          </div>
          <div className={styles.puzzleLayout}>
            <div className={styles.letterGrid} aria-label="Word search letter grid">
              {wordGrid.map((row, r) => row.map((letter, c) => {
                const key = `${r}-${c}`;
                const isSelected = selectedCells.includes(key);
                const isFound = foundCells.includes(key);
                return <button key={key} type="button" aria-label={`Row ${r + 1}, column ${c + 1}, ${letter}${isFound ? ', part of a found word' : ''}`} aria-pressed={isSelected} className={`${styles.letter} ${isSelected ? styles.selectedLetter : ''} ${isFound ? styles.foundLetter : ''}`} onClick={() => chooseCell(r, c)}>{letter}</button>;
              }))}
            </div>
            <aside className={styles.wordList}>
              <h3>Words of the cosmos</h3>
              <div className={styles.progressTrack} role="progressbar" aria-label="Word search progress" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={foundWords.length}><span style={{ width: `${progress}%` }} /></div>
              <p className={styles.progressText}>{foundWords.length} of {words.length} discovered</p>
              {words.map((word) => <p key={word} className={foundWords.includes(word) ? styles.wordFound : styles.word}>{foundWords.includes(word) ? '✦ ' : '◇ '}{word}</p>)}
              {notice && <p className={styles.notice} role="status">{notice}</p>}
              {foundWords.length === words.length && <p className={styles.notice}>Puzzle complete. Take a breath, then play again whenever you like.</p>}
            </aside>
          </div>
          <p className={styles.helper}>Accessible two-tap selection: choose the first letter and then the last letter. Reset anytime to replay; progress is kept for this visit only.</p>
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
