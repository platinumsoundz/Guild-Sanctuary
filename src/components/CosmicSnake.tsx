'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Sparkles } from 'lucide-react';
import styles from './CosmicArcade.module.css';

type Point = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';
const BOARD_SIZE = 12;
const initialSnake: Point[] = [{ x: 5, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 6 }];
const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const opposites: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function makeFood(snake: Point[]): Point {
  const free: Point[] = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
}

export function CosmicSnake() {
  const [snake, setSnake] = useState<Point[]>(initialSnake);
  const [food, setFood] = useState<Point>(() => makeFood(initialSnake));
  const [direction, setDirection] = useState<Direction>('right');
  const [playing, setPlaying] = useState(true);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const steer = useCallback((next: Direction) => {
    setDirection((current) => next === opposites[current] ? current : next);
  }, []);

  const reset = useCallback(() => {
    setSnake(initialSnake);
    setFood(makeFood(initialSnake));
    setDirection('right');
    setScore(0);
    setPlaying(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const keys: Record<string, Direction> = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
      };
      const next = keys[event.key];
      if (next) {
        event.preventDefault();
        steer(next);
      }
      if (!playing && (event.key === ' ' || event.key === 'Enter')) reset();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playing, reset, steer]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setSnake((current) => {
        const vector = vectors[direction];
        const head = { x: current[0].x + vector.x, y: current[0].y + vector.y };
        const eating = head.x === food.x && head.y === food.y;
        const body = eating ? current : current.slice(0, -1);
        const hitWall = head.x < 0 || head.y < 0 || head.x >= BOARD_SIZE || head.y >= BOARD_SIZE;
        const hitSelf = body.some((part) => part.x === head.x && part.y === head.y);
        if (hitWall || hitSelf) {
          setPlaying(false);
          setBest((value) => Math.max(value, score));
          return current;
        }
        const next = [head, ...body];
        if (eating) {
          setScore((value) => value + 10);
          setBest((value) => Math.max(value, score + 10));
          setFood(makeFood(next));
        }
        return next;
      });
    }, Math.max(95, 190 - Math.floor(score / 50) * 8));
    return () => window.clearInterval(timer);
  }, [direction, food, playing, score]);

  return (
    <div className={styles.playArea}>
      <div className={styles.playHeader}>
        <div><p className={styles.eyebrow}>ARCADE CLASSIC</p><h2>Cosmic Snake</h2><p>Collect stardust, grow your trail and avoid the edges. No tokens are needed to play.</p></div>
        <button className={styles.resetButton} type="button" onClick={reset}><RotateCcw size={15} /> Restart</button>
      </div>
      <div className={styles.snakeStats}>
        <div><span>STARDUST</span><strong>{score}</strong></div>
        <div><span>PERSONAL BEST</span><strong>{best}</strong></div>
        <div><span>PER STARDUST</span><strong>+10</strong></div>
      </div>
      <div className={styles.snakeBoardWrap}>
        <div className={styles.snakeBoard} role="img" aria-label={`Cosmic Snake board. Score ${score}. ${playing ? 'Game in progress' : 'Game over'}.`}>
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
            const point = { x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) };
            const snakeIndex = snake.findIndex((part) => part.x === point.x && part.y === point.y);
            const isFood = food.x === point.x && food.y === point.y;
            return <span key={index} className={`${styles.snakeCell} ${snakeIndex === 0 ? styles.snakeHead : ''} ${snakeIndex > 0 ? styles.snakeBody : ''} ${isFood ? styles.snakeFood : ''}`} aria-hidden="true">{isFood ? '✦' : snakeIndex === 0 ? '☄' : ''}</span>;
          })}
        </div>
      </div>
      {!playing && <div className={styles.snakeGameOver} role="status"><strong>Your cosmic journey paused</strong><span>Final score: {score} stardust</span><button type="button" className={styles.resetButton} onClick={reset}>Play again</button></div>}
      <div className={styles.snakeControls} aria-label="Snake direction controls">
        <button type="button" aria-label="Move up" onClick={() => steer('up')}><ArrowUp size={20} /></button>
        <div><button type="button" aria-label="Move left" onClick={() => steer('left')}><ArrowLeft size={20} /></button><button type="button" aria-label="Move down" onClick={() => steer('down')}><ArrowDown size={20} /></button><button type="button" aria-label="Move right" onClick={() => steer('right')}><ArrowRight size={20} /></button></div>
      </div>
      <p className={styles.helper}><Sparkles size={12} /> Use arrow keys or WASD on a keyboard, or the on-screen controls on mobile. Best score lasts for this visit only.</p>
    </div>
  );
}
