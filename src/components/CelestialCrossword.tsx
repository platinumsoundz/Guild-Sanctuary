'use client';

import { useMemo, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import styles from './CosmicArcade.module.css';

type Direction = 'across' | 'down';
type Entry = { number: number; answer: string; clue: string; row: number; col: number; direction: Direction };

const entries: Entry[] = [
  { number: 1, answer: 'COSMIC', clue: 'Relating to the universe and its vastness', row: 0, col: 0, direction: 'down' },
  { number: 2, answer: 'EARTH', clue: 'Our home planet', row: 0, col: 3, direction: 'down' },
  { number: 3, answer: 'STAR', clue: 'A glowing celestial body', row: 2, col: 0, direction: 'across' },
  { number: 4, answer: 'ITCH', clue: 'A tickling skin sensation', row: 4, col: 0, direction: 'across' },
];
const ROWS = 6;
const COLS = 4;
type CellInfo = { key: string; row: number; col: number; numbers: number[] };

const cellMap = new Map<string, CellInfo>();
for (const entry of entries) {
  for (let i = 0; i < entry.answer.length; i += 1) {
    const row = entry.row + (entry.direction === 'down' ? i : 0);
    const col = entry.col + (entry.direction === 'across' ? i : 0);
    const key = `${row}-${col}`;
    const cell = cellMap.get(key) ?? { key, row, col, numbers: [] };
    if (i === 0) cell.numbers.push(entry.number);
    cellMap.set(key, cell);
  }
}

export function CelestialCrossword() {
  const [letters, setLetters] = useState<Record<string, string>>({});
  const [active, setActive] = useState<number>(3);
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState('Choose a clue, then fill its letters in the grid.');
  const cells = useMemo(() => Array.from(cellMap.values()), []);
  const activeEntry = entries.find((entry) => entry.number === active) ?? entries[2];
  const completeCount = entries.filter((entry) => [...entry.answer].every((letter, index) => {
    const row = entry.row + (entry.direction === 'down' ? index : 0);
    const col = entry.col + (entry.direction === 'across' ? index : 0);
    return letters[`${row}-${col}`] === letter;
  })).length;
  const solved = completeCount === entries.length;

  const setCell = (key: string, value: string) => {
    setLetters((current) => ({ ...current, [key]: value.slice(-1).toUpperCase().replace(/[^A-Z]/g, '') }));
    setChecked(false);
    setNotice('Letter entered. Crossings share the same square.');
  };

  const checkPuzzle = () => {
    setChecked(true);
    setNotice(solved ? 'Every clue is correct — celestial alignment achieved ✨' : `${completeCount} of ${entries.length} words are correct. Keep going.`);
  };

  const reset = () => {
    setLetters({});
    setChecked(false);
    setNotice('The crossword has been reset.');
  };

  return (
    <div className={styles.playArea}>
      <div className={styles.playHeader}>
        <div><p className={styles.eyebrow}>COSMIC WORDPLAY</p><h2>Celestial Crossword</h2><p>Fill the shared squares to solve this mini crossword. Select a clue to focus its letters.</p></div>
        <button className={styles.resetButton} type="button" onClick={reset}><RotateCcw size={15} /> Reset</button>
      </div>
      <div className={styles.crosswordLayout}>
        <div className={styles.crosswordGrid} role="group" aria-label="Celestial crossword letter grid">
          {Array.from({ length: ROWS * COLS }, (_, index) => {
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            const key = `${row}-${col}`;
            const cell = cellMap.get(key);
            if (!cell) return <span key={key} className={styles.crosswordBlock} aria-hidden="true" />;
            const onEntry = activeEntry.direction === 'across'
              ? row === activeEntry.row && col >= activeEntry.col && col < activeEntry.col + activeEntry.answer.length
              : col === activeEntry.col && row >= activeEntry.row && row < activeEntry.row + activeEntry.answer.length;
            const expected = entries.some((entry) => {
              const offset = entry.direction === 'across' ? col - entry.col : row - entry.row;
              const inEntry = entry.direction === 'across'
                ? row === entry.row && offset >= 0 && offset < entry.answer.length
                : col === entry.col && offset >= 0 && offset < entry.answer.length;
              return inEntry && letters[key] === entry.answer[offset];
            });
            return <label key={key} className={`${styles.crosswordCell} ${onEntry ? styles.crosswordActive : ''} ${checked && letters[key] ? (expected ? styles.crosswordCorrect : styles.crosswordIncorrect) : ''}`}>
              {cell.numbers.length > 0 && <span className={styles.crosswordNumber}>{cell.numbers[0]}</span>}
              <input aria-label={`Row ${row + 1}, column ${col + 1}`} inputMode="text" autoCapitalize="characters" maxLength={1} value={letters[key] ?? ''} onChange={(event) => setCell(key, event.target.value)} onFocus={() => {
                const entry = entries.find((item) => item.row === row && item.col === col);
                if (entry) setActive(entry.number);
              }} />
            </label>;
          })}
        </div>
        <div className={styles.crosswordClues}>
          <div><h3>Across</h3>{entries.filter((entry) => entry.direction === 'across').map((entry) => <button key={entry.number} type="button" className={active === entry.number ? styles.clueActive : styles.clueButton} onClick={() => setActive(entry.number)}><strong>{entry.number}.</strong> {entry.clue}</button>)}</div>
          <div><h3>Down</h3>{entries.filter((entry) => entry.direction === 'down').map((entry) => <button key={entry.number} type="button" className={active === entry.number ? styles.clueActive : styles.clueButton} onClick={() => setActive(entry.number)}><strong>{entry.number}.</strong> {entry.clue}</button>)}</div>
          <p className={styles.progressText}>{completeCount} of {entries.length} words solved</p>
          <button className={styles.resetButton} type="button" onClick={checkPuzzle}>Check answers</button>
        </div>
      </div>
      <p className={styles.notice} role="status">{solved ? '✨ Puzzle complete. Beautifully aligned.' : notice}</p>
      <p className={styles.helper}><Sparkles size={12} /> Mini crossword preview. This prototype keeps progress in memory for the current visit; saving and larger puzzle packs can come later.</p>
    </div>
  );
}
