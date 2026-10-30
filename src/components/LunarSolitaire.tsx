'use client';

import { useCallback, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import styles from './CosmicArcade.module.css';
import { ArcadeFullscreenToggle } from './ArcadeFullscreenToggle';

type Suit = '♠' | '♥' | '♦' | '♣';
type Card = { id: string; rank: number; suit: Suit; faceUp: boolean };
type Source = { pile: 'waste' } | { pile: 'tableau'; column: number; index: number };
type Deal = { stock: Card[]; waste: Card[]; tableau: Card[][]; foundations: Record<Suit, Card[]> };

const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const redSuits: Suit[] = ['♥', '♦'];
const ranks = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const foundationSuits: Suit[] = ['♠', '♥', '♦', '♣'];

function shuffledDeck(): Card[] {
  const deck = suits.flatMap((suit) => Array.from({ length: 13 }, (_, index) => ({
    id: `${suit}-${index + 1}`, suit, rank: index + 1, faceUp: false,
  })));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

function newDeal(): Deal {
  const deck = shuffledDeck();
  const tableau = Array.from({ length: 7 }, (_, column) => {
    const pile = deck.splice(0, column + 1);
    pile[pile.length - 1].faceUp = true;
    return pile;
  });
  return {
    stock: deck,
    waste: [],
    tableau,
    foundations: { '♠': [], '♥': [], '♦': [], '♣': [] },
  };
}

function canStack(card: Card, target: Card | undefined): boolean {
  return target ? card.rank === target.rank - 1 && redSuits.includes(card.suit) !== redSuits.includes(target.suit) : card.rank === 13;
}

function canFound(card: Card, pile: Card[]): boolean {
  const top = pile[pile.length - 1];
  return top ? card.suit === top.suit && card.rank === top.rank + 1 : card.rank === 1;
}

function faceLabel(card: Card): string {
  return `${ranks[card.rank]}${card.suit}`;
}

export function LunarSolitaire() {
  const [deal, setDeal] = useState<Deal>(() => newDeal());
  const [selected, setSelected] = useState<Source | null>(null);
  const [notice, setNotice] = useState('Draw a card from the moonlit stock to begin.');

  const reset = useCallback(() => {
    setDeal(newDeal());
    setSelected(null);
    setNotice('A fresh deck has been dealt. Good luck among the stars.');
  }, []);

  const drawStock = () => {
    setSelected(null);
    if (deal.stock.length) {
      const card = deal.stock[deal.stock.length - 1];
      setDeal((current) => ({
        ...current,
        stock: current.stock.slice(0, -1),
        waste: [...current.waste, { ...card, faceUp: true }],
      }));
      setNotice('One card drawn from the stock.');
    } else if (deal.waste.length) {
      setDeal((current) => ({
        ...current,
        stock: current.waste.slice().reverse().map((card) => ({ ...card, faceUp: false })),
        waste: [],
      }));
      setNotice('The waste pile has been recycled into the stock.');
    }
  };

  const chooseWaste = () => {
    if (!deal.waste.length) return;
    setSelected((current) => current?.pile === 'waste' ? null : { pile: 'waste' });
    setNotice('Waste card selected. Choose a tableau column or matching foundation.');
  };

  const chooseTableau = (column: number, index: number) => {
    const pile = deal.tableau[column];
    const card = pile[index];
    if (!card) {
      if (selected) moveToTableau(column);
      return;
    }
    if (!card.faceUp) {
      if (index === pile.length - 1) {
        setDeal((current) => {
          const tableau = current.tableau.map((stack) => stack.slice());
          tableau[column][index] = { ...tableau[column][index], faceUp: true };
          return { ...current, tableau };
        });
        setNotice('A hidden card is revealed.');
      }
      return;
    }
    if (selected?.pile === 'tableau' && selected.column === column && selected.index === index) {
      setSelected(null);
      return;
    }
    if (selected) {
      if (selected.pile === 'waste') {
        moveWasteToTableau(column);
      } else if (selected.column !== column) {
        moveTableauStack(column);
      } else {
        setSelected({ pile: 'tableau', column, index });
      }
      return;
    }
    setSelected({ pile: 'tableau', column, index });
    setNotice(`Selected ${faceLabel(card)} and the cards below it.`);
  };

  const moveWasteToTableau = (targetColumn: number) => {
    const card = deal.waste[deal.waste.length - 1];
    if (!card || !canStack(card, deal.tableau[targetColumn].slice(-1)[0])) {
      setNotice('That move is not allowed. Tableau cards descend and alternate colours.');
      return;
    }
    setDeal((current) => ({
      ...current,
      waste: current.waste.slice(0, -1),
      tableau: current.tableau.map((pile, index) => index === targetColumn ? [...pile, card] : pile),
    }));
    setSelected(null);
    setNotice(`${faceLabel(card)} moved to tableau.`);
  };

  const moveTableauStack = (targetColumn: number) => {
    if (selected?.pile !== 'tableau') return;
    const sourceColumn = selected.column;
    const sourceIndex = selected.index;
    const sourcePile = deal.tableau[sourceColumn];
    const moving = sourcePile.slice(sourceIndex);
    const card = moving[0];
    if (!card || !canStack(card, deal.tableau[targetColumn].slice(-1)[0])) {
      setNotice('That move is not allowed. Tableau cards descend and alternate colours.');
      return;
    }
    setDeal((current) => {
      const tableau = current.tableau.map((pile) => pile.slice());
      tableau[targetColumn] = [...tableau[targetColumn], ...moving];
      tableau[sourceColumn] = tableau[sourceColumn].slice(0, sourceIndex);
      const newTop = tableau[sourceColumn].slice(-1)[0];
      if (newTop && !newTop.faceUp) tableau[sourceColumn][tableau[sourceColumn].length - 1] = { ...newTop, faceUp: true };
      return { ...current, tableau };
    });
    setSelected(null);
    setNotice('Card sequence moved to a new column.');
  };

  const moveToTableau = (targetColumn: number) => {
    if (selected?.pile === 'waste') moveWasteToTableau(targetColumn);
    else if (selected?.pile === 'tableau' && selected.column !== targetColumn) moveTableauStack(targetColumn);
  };

  const moveToFoundation = (suit: Suit) => {
    let card: Card | undefined;
    if (selected?.pile === 'waste') card = deal.waste[deal.waste.length - 1];
    else if (selected?.pile === 'tableau') {
      const pile = deal.tableau[selected.column];
      if (selected.index === pile.length - 1) card = pile[pile.length - 1];
    }
    if (!card || card.suit !== suit || !canFound(card, deal.foundations[suit])) {
      setNotice('Only the next card of the same suit can be placed on a foundation.');
      return;
    }
    setDeal((current) => {
      const foundations = { ...current.foundations, [suit]: [...current.foundations[suit], card!] };
      if (selected?.pile === 'waste') return { ...current, waste: current.waste.slice(0, -1), foundations };
      if (selected?.pile === 'tableau') {
        const tableau = current.tableau.map((pile) => pile.slice());
        tableau[selected.column] = tableau[selected.column].slice(0, -1);
        const top = tableau[selected.column].slice(-1)[0];
        if (top && !top.faceUp) tableau[selected.column][tableau[selected.column].length - 1] = { ...top, faceUp: true };
        return { ...current, tableau, foundations };
      }
      return current;
    });
    setSelected(null);
    setNotice(`${faceLabel(card)} placed in its foundation.`);
  };

  const cardButton = (card: Card | undefined, label: string, onClick: () => void, isSelected = false, key?: string) => (
    <button key={key} type="button" className={`${styles.solitaireCard} ${card?.faceUp ? styles.solitaireFace : styles.solitaireBack} ${card && redSuits.includes(card.suit) ? styles.solitaireRed : ''} ${isSelected ? styles.solitaireSelected : ''}`} onClick={onClick} aria-label={label}>
      {card?.faceUp ? faceLabel(card) : card ? '✦' : '✧'}
    </button>
  );

  const won = foundationSuits.every((suit) => deal.foundations[suit].length === 13);

  return (
    <div className={styles.playArea} data-arcade-fullscreen>
      <div className={styles.playHeader}>
        <div><p className={styles.eyebrow}>MOONLIT CLASSIC</p><h2>Lunar Solitaire</h2><p>Build four suit foundations from Ace to King. Tableau stacks descend in alternating colours.</p></div>
        <div className={styles.gameHeaderActions}><ArcadeFullscreenToggle /><button className={styles.resetButton} type="button" onClick={reset}><RotateCcw size={15} /> New game</button></div>
      </div>
      <div className={styles.solitaireTop}>
        <div className={styles.solitairePile}>
          <span>STOCK · {deal.stock.length}</span>
          {cardButton(deal.stock.length ? deal.stock[deal.stock.length - 1] : undefined, deal.stock.length ? `Draw from stock, ${deal.stock.length} cards left` : 'Recycle waste into stock', drawStock)}
        </div>
        <div className={styles.solitairePile}>
          <span>WASTE</span>
          {cardButton(deal.waste[deal.waste.length - 1], deal.waste.length ? `Select waste card ${faceLabel(deal.waste[deal.waste.length - 1])}` : 'Empty waste pile', chooseWaste, selected?.pile === 'waste')}
        </div>
        <div className={styles.solitaireFoundations}>
          {foundationSuits.map((suit) => {
            const pile = deal.foundations[suit];
            return <div className={styles.solitairePile} key={suit}><span>FOUNDATION</span>{cardButton(pile[pile.length - 1], `${suit} foundation, ${pile.length} of 13 cards. Select to place the next matching card`, () => moveToFoundation(suit))}</div>;
          })}
        </div>
      </div>
      <div className={styles.solitaireTableau} aria-label="Solitaire tableau columns">
        {deal.tableau.map((pile, column) => <div className={styles.solitaireColumn} key={column} aria-label={`Tableau column ${column + 1}`}>
          {pile.map((card, index) => cardButton(card, card.faceUp ? `${faceLabel(card)}, column ${column + 1}, position ${index + 1}` : `Face-down card, column ${column + 1}, position ${index + 1}`, () => chooseTableau(column, index), selected?.pile === 'tableau' && selected.column === column && index >= selected.index, `tableau-${column}-${index}`))}
          <button type="button" className={styles.solitaireEmpty} aria-label={`Move selected cards to empty column ${column + 1}`} onClick={() => moveToTableau(column)}>+</button>
        </div>)}
      </div>
      <p className={styles.notice} role="status">{won ? '✨ You completed the foundations — a perfect cosmic alignment!' : notice}</p>
      <p className={styles.helper}><Sparkles size={12} /> Select a face-up card, then a destination. Tap the stock to draw; tap it when empty to recycle the waste. This version draws one card at a time.</p>
    </div>
  );
}
