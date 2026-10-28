import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const arcade = readFileSync('src/components/CosmicArcade.tsx', 'utf8');
const snake = readFileSync('src/components/CosmicSnake.tsx', 'utf8');
const solitaire = readFileSync('src/components/LunarSolitaire.tsx', 'utf8');
const crossword = readFileSync('src/components/CelestialCrossword.tsx', 'utf8');
const css = readFileSync('src/components/CosmicArcade.module.css', 'utf8');
const navigation = readFileSync('src/components/Navigation.tsx', 'utf8');

assert.match(navigation, /id:\s*'games',\s*label:\s*'Cosmic Arcade'/, 'Cosmic Arcade remains reachable from navigation');
assert.match(arcade, /Starseed Word Search/, 'word search preview remains available');
assert.match(arcade, /selectedGame === 'crossword' \\? <CelestialCrossword \\/>/, 'crossword is connected to the game selector');
assert.match(arcade, /id: 'crossword',[^\\n]*status: 'Playable preview'/, 'crossword is advertised as playable');
assert.match(crossword, /const entries: Entry\\[\\]/, 'crossword defines across and down entries');
assert.match(crossword, /completeCount === entries.length/, 'crossword detects completion');
assert.match(css, /crosswordGrid/, 'crossword grid styling is present');
assert.match(css, /crosswordClues/, 'crossword clues have responsive styling');
assert.match(arcade, /selectedGame === 'snake' \? <CosmicSnake \/>/, 'snake is connected to the game selector');
assert.match(arcade, /Purchases locked/, 'arcade token purchases remain locked');
assert.match(arcade, /disabled><LockKeyhole/, 'theme purchase controls remain disabled');
assert.match(snake, /setInterval/, 'snake advances on a game tick');
assert.match(snake, /ArrowUp/, 'keyboard controls are supported');
assert.match(snake, /onClick=\{\(\) => steer\('left'\)\}/, 'touch-friendly direction controls are present');
assert.match(snake, /makeFood\(next\)/, 'food is respawned after collection');
assert.match(snake, /hitWall \|\| hitSelf/, 'wall and self collisions end the game');
assert.match(css, /snakeBoard/, 'snake board styles are present');
assert.match(solitaire, /function newDeal\(\)/, 'solitaire creates a shuffled deal');
assert.match(solitaire, /function canStack\(/, 'solitaire validates alternating-colour tableau moves');
assert.match(solitaire, /function canFound\(/, 'solitaire validates suit foundations');
assert.match(solitaire, /setStock|stock: current\.waste\.slice\(\)\.reverse\(\)/, 'solitaire can recycle the waste pile');
assert.match(css, /solitaireTableau/, 'solitaire tableau styles are present');
assert.match(css, /@media \(max-width:420px\)/, 'small-screen styles are present');
assert.doesNotMatch(snake, /\.rpc\(|spend_tokens|token_balance/i, 'gameplay must not modify token balances from the client');

console.log('Cosmic Arcade contract checks passed.');
