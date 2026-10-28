'use client';

import { useMemo, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import styles from './ArcadeClassics.module.css';

type GameId = '2048' | 'mines' | 'lights' | 'memory' | 'hangman' | 'wordle' | 'tictactoe' | 'connect4' | 'rpsls' | 'hanoi' | 'flood' | 'life' | 'whack' | 'trivia' | 'fifteen' | 'simon' | 'pong' | 'breakout' | 'tetris';
const options: { id: GameId; title: string; group: string }[] = [
  { id: '2048', title: '2048', group: 'Puzzle' }, { id: 'mines', title: 'Minesweeper', group: 'Puzzle' },
  { id: 'lights', title: 'Lights Out', group: 'Puzzle' }, { id: 'memory', title: 'Memory Match', group: 'Puzzle' },
  { id: 'wordle', title: 'Word Guess', group: 'Words' }, { id: 'hangman', title: 'Hangman', group: 'Words' },
  { id: 'tictactoe', title: 'Tic-Tac-Toe', group: 'Board' }, { id: 'connect4', title: 'Connect Four', group: 'Board' },
  { id: 'rpsls', title: 'Rock Paper Scissors Lizard Spock', group: 'Quick play' }, { id: 'hanoi', title: 'Tower of Hanoi', group: 'Logic' },
  { id: 'flood', title: 'Flood Fill', group: 'Logic' }, { id: 'life', title: 'Game of Life', group: 'Simulation' },
  { id: 'whack', title: 'Whack-a-Star', group: 'Arcade' }, { id: 'trivia', title: 'Cosmic Trivia', group: 'Words' },
  { id: 'fifteen', title: '15 Puzzle', group: 'Puzzle' }, { id: 'simon', title: 'Simon Memory', group: 'Memory' },
];
const wordBank = ['NEBULA', 'GALAXY', 'PLANET', 'COSMIC', 'ORBIT'];
const trivia = [
  { q: 'Which planet is known for its prominent ring system?', a: ['Mars', 'Saturn', 'Venus'], correct: 1 },
  { q: 'What is the star at the centre of our solar system?', a: ['Sirius', 'Polaris', 'The Sun'], correct: 2 },
  { q: 'How many sides does a hexagon have?', a: ['Six', 'Seven', 'Eight'], correct: 0 },
];
const makeLights = () => Array.from({ length: 25 }, () => Math.random() > 0.5);
const makeMemory = () => ['☾','☾','✦','✦','☀','☀','♆','♆','✧','✧','☄','☄','♄','♄','♃','♃'].sort(() => Math.random() - 0.5);
const make2048 = () => { const grid = Array.from({ length: 4 }, () => Array(4).fill(0)); addTile(grid); addTile(grid); return grid; };
function addTile(grid: number[][]) { const empty: [number,number][] = []; grid.forEach((row,r)=>row.forEach((v,c)=>{if(!v)empty.push([r,c]);})); if(empty.length){const [r,c]=empty[Math.floor(Math.random()*empty.length)];grid[r][c]=Math.random()<0.9?2:4;} }
const makeMines = () => Array.from({ length: 64 }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, 10);
const makeFifteen = () => { const a = Array.from({length:16},(_,i)=>(i+1)%16); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const makeConnect = () => Array.from({length:6},()=>Array(7).fill(''));
const makeLife = () => Array.from({length:10},()=>Array.from({length:10},()=>Math.random()>.78));
const directions = [[-1,0],[1,0],[0,-1],[0,1]];
function slide2048(grid: number[][], direction: string) {
  const next = grid.map(row=>row.slice());
  for(let line=0;line<4;line++){
    const coords = Array.from({length:4},(_,i)=> direction==='left'?[line,i]:direction==='right'?[line,3-i]:direction==='up'?[i,line]:[3-i,line]);
    const values=coords.map(([r,c])=>next[r][c]).filter(Boolean); const merged:number[]=[];
    for(let i=0;i<values.length;i++){if(values[i]===values[i+1]){merged.push(values[i]*2);i++;}else merged.push(values[i]);}
    coords.forEach(([r,c],i)=>{next[r][c]=merged[i]||0;});
  }
  if(JSON.stringify(next)!==JSON.stringify(grid)) addTile(next);
  return next;
}

export function ArcadeClassics() {
  const [game,setGame]=useState<GameId>('2048');
  const [grid2048,setGrid2048]=useState(make2048);
  const [mineCells,setMineCells]=useState<number[]>(makeMines);
  const [revealed,setRevealed]=useState<number[]>([]);
  const [flags,setFlags]=useState<number[]>([]);
  const [lights,setLights]=useState<boolean[]>(makeLights);
  const [memory,setMemory]=useState(makeMemory);
  const [flipped,setFlipped]=useState<number[]>([]);
  const [matched,setMatched]=useState<number[]>([]);
  const [word,setWord]=useState(wordBank[Math.floor(Math.random()*wordBank.length)]);
  const [guess,setGuess]=useState('');
  const [guesses,setGuesses]=useState<string[]>([]);
  const [hangLetters,setHangLetters]=useState<string[]>([]);
  const [board,setBoard]=useState<string[]>(Array(9).fill(''));
  const [connect,setConnect]=useState<string[][]>(makeConnect);
  const [turn,setTurn]=useState('🔴');
  const [rps,setRps]=useState('');
  const [hanoi,setHanoi]=useState<number[][]>([[4,3,2,1],[],[]]);
  const [hanoiFrom,setHanoiFrom]=useState<number|null>(null);
  const [flood,setFlood]=useState(Array.from({length:64},()=>Math.floor(Math.random()*5)));
  const [floodMoves,setFloodMoves]=useState(0);
  const [life,setLife]=useState(makeLife);
  const [mole,setMole]=useState(Math.floor(Math.random()*16));
  const [hits,setHits]=useState(0);
  const [question,setQuestion]=useState(0);
  const [score,setScore]=useState(0);
  const [fifteen,setFifteen]=useState(makeFifteen);
  const [simon,setSimon]=useState<number[]>([]);
  const [simonInput,setSimonInput]=useState<number[]>([]);
  const [message,setMessage]=useState('');
  const wonTic=useMemo(()=>['012','345','678','036','147','258','048','246'].some(line=>[...line].every(i=>board[Number(i)]==='X')), [board]);
  const wonConnect=useMemo(()=>connect.some((row,r)=>row.some((v,c)=>!!v&&[[0,1],[1,0],[1,1],[1,-1]].some(([dr,dc])=>[0,1,2,3].every(k=>{const rr=r+dr*k,cc=c+dc*k;return rr>=0&&rr<6&&cc>=0&&cc<7&&connect[rr][cc]===v;})))),[connect]);
  const reset = () => {
    setGrid2048(make2048());setMineCells(makeMines());setRevealed([]);setFlags([]);setLights(makeLights());setMemory(makeMemory());setFlipped([]);setMatched([]);
    setWord(wordBank[Math.floor(Math.random()*wordBank.length)]);setGuess('');setGuesses([]);setHangLetters([]);setBoard(Array(9).fill(''));setConnect(makeConnect());setTurn('🔴');setRps('');
    setHanoi([[4,3,2,1],[],[]]);setHanoiFrom(null);setFlood(Array.from({length:64},()=>Math.floor(Math.random()*5)));setFloodMoves(0);setLife(makeLife());setMole(Math.floor(Math.random()*16));setHits(0);setQuestion(0);setScore(0);setFifteen(makeFifteen());setSimon([]);setSimonInput([]);setMessage('');setPong({ballX:4,ballY:3,dx:1,dy:1,paddle:3,score:0,over:false});setBricks(Array.from({length:24},()=>true));setBrickBall({x:3,y:5,dx:1,dy:-1,paddle:3,lives:3});setBlocks(Array.from({length:10},()=>Array(6).fill(0)));setActiveShape([[1,1,1],[0,1,0]]);setBlockX(1);
  };
  const tapLight = (i:number) => setLights(current=>current.map((v,j)=> directions.reduce((on,[dr,dc])=>{const r=Math.floor(i/5),c=i%5,rr=Math.floor(j/5),cc=j%5;return on || (j===i)||(rr===r+dr&&cc===c+dc);},false)?!v:v));
  const submitWord = () => {const value=guess.toUpperCase().replace(/[^A-Z]/g,'').slice(0,6);if(value.length!==word.length)return;setGuesses(v=>[...v,value]);setGuess('');if(value===word)setMessage('Correct! You found the hidden word.');else if(guesses.length>=5)setMessage(`The word was ${word}.`);};
  const moveFifteen = (i:number) => {const empty=fifteen.indexOf(0);if(Math.abs(Math.floor(i/4)-Math.floor(empty/4))+Math.abs(i%4-empty%4)!==1)return;setFifteen(a=>{const b=a.slice();[b[i],b[empty]]=[b[empty],b[i]];return b;});};
  return <section className={styles.wrap} aria-labelledby="classics-title">
    <div className={styles.heading}><div><p className={styles.eyebrow}><Sparkles size={13}/> ARCADE CLASSICS</p><h2 id="classics-title">Pick your next little challenge</h2><p>Nineteen compact games with local, session-only progress. Token-powered extras are planned but remain locked.</p></div><button className={styles.reset} onClick={reset} type="button"><RotateCcw size={14}/> Reset game</button></div>
    <label className={styles.selectorLabel} htmlFor="classic-game-select">Choose a game</label>
    <select id="classic-game-select" className={styles.selector} value={game} onChange={e=>{setGame(e.target.value as GameId);setMessage('');}}>{options.map(o=><option key={o.id} value={o.id}>{o.group} — {o.title}</option>)}</select>
    <div className={styles.play}>
    {game==='2048' && <><h3>2048</h3><p>Slide tiles in a direction to combine matching numbers.</p><div className={styles.grid4}>{grid2048.flat().map((v,i)=><button key={i} className={styles.tile} type="button" onClick={()=>setGrid2048(g=>slide2048(g,['up','right','down','left'][i%4]))} aria-label={`Slide tiles ${['up','right','down','left'][i%4]}`}>{v||''}</button>)}</div><div className={styles.controls}>{['up','left','down','right'].map(d=><button key={d} type="button" onClick={()=>setGrid2048(g=>slide2048(g,d))}>{d}</button>)}</div></>}
    {game==='mines' && <><h3>Minesweeper</h3><p>Reveal cells, flag suspected mines, and avoid the hidden stars.</p><div className={styles.grid8}>{Array.from({length:64},(_,i)=><button key={i} type="button" className={styles.cell} aria-label={flags.includes(i)?'Flagged cell':revealed.includes(i)?(mineCells.includes(i)?'Mine':'Safe cell'):'Hidden cell'} onContextMenu={e=>{e.preventDefault();setFlags(a=>a.includes(i)?a.filter(n=>n!==i):[...a,i]);}} onClick={()=>{if(flags.includes(i))return;if(mineCells.includes(i)){setRevealed(Array.from({length:64},(_,n)=>n));setMessage('A star mine! Reset to try again.');}else{setRevealed(a=>[...a,i]);setMessage('Safe cell revealed. Right-click to flag a suspected mine.');}}}>{revealed.includes(i)?mineCells.includes(i)?'✹':mineCells.filter(m=>Math.abs(Math.floor(m/8)-Math.floor(i/8))<=1&&Math.abs(m%8-i%8)<=1).length||'·':flags.includes(i)?'⚑':''}</button>)}</div></>}
    {game==='lights' && <><h3>Lights Out</h3><p>Switch every light off. Each tap toggles the selected light and its neighbours.</p><div className={styles.grid5}>{lights.map((on,i)=><button key={i} type="button" className={on?styles.lightOn:styles.lightOff} onClick={()=>tapLight(i)} aria-label={`Light ${i+1} ${on?'on':'off'}`}>{on?'✦':''}</button>)}</div><p>{lights.filter(Boolean).length} lights remain on.</p></>}
    {game==='memory' && <><h3>Memory Match</h3><p>Find all eight matching pairs.</p><div className={styles.grid4}>{memory.map((v,i)=><button key={i} type="button" className={styles.tile} onClick={()=>{if(flipped.includes(i)||matched.includes(i))return;const next=[...flipped,i];setFlipped(next);if(next.length===2){if(memory[next[0]]===memory[next[1]])setMatched(a=>[...a,...next]);setTimeout(()=>setFlipped([]),650);}}}>{flipped.includes(i)||matched.includes(i)?v:'✧'}</button>)}</div><p>{matched.length/2} / 8 pairs matched</p></>}
    {game==='wordle' && <><h3>Cosmic Word Guess</h3><p>Guess the hidden word in six attempts. The answer uses {word.length} letters.</p><form className={styles.inlineForm} onSubmit={e=>{e.preventDefault();submitWord();}}><input value={guess} onChange={e=>setGuess(e.target.value.toUpperCase().slice(0,word.length))} maxLength={word.length} aria-label="Word guess" /><button type="submit">Guess</button></form>{guesses.map((g,i)=><div className={styles.wordRow} key={i}>{[...g].map((ch,j)=><span key={j} className={ch===word[j]?styles.correct:word.includes(ch)?styles.present:styles.absent}>{ch}</span>)}</div>)}</>}
    {game==='hangman' && <><h3>Hangman</h3><p>Reveal the cosmic word before six missed letters.</p><div className={styles.letterButtons}>{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch=><button key={ch} disabled={hangLetters.includes(ch)||word.includes(ch)&&[...word].every(l=>hangLetters.includes(l))} type="button" onClick={()=>{setHangLetters(a=>[...a,ch]);if(!word.includes(ch)&&hangLetters.filter(x=>!word.includes(x)).length>=5)setMessage(`Out of guesses — the word was ${word}.`);}}>{ch}</button>)}</div><p className={styles.wordMask}>{[...word].map(ch=>hangLetters.includes(ch)?ch:'_').join(' ')}</p><p>{hangLetters.filter(ch=>!word.includes(ch)).length} missed letters</p></>}
    {game==='tictactoe' && <><h3>Tic-Tac-Toe</h3><p>Two-player local game. X goes first.</p><div className={styles.grid3}>{board.map((v,i)=><button key={i} type="button" className={styles.tile} onClick={()=>{if(v||wonTic||board.every(Boolean))return;setBoard(a=>a.map((x,j)=>j===i?'X':x));setTimeout(()=>setBoard(a=>{const wins=['012','345','678','036','147','258','048','246'];if(wins.some(line=>[...line].every(k=>a[Number(k)]==='X'))||a.every(Boolean))return a;const empty=a.map((x,j)=>x? -1:j).filter(j=>j>=0);return a.map((x,j)=>j===empty[Math.floor(Math.random()*empty.length)]?'O':x);}),0);}}>{v}</button>)}</div></>}
    {game==='connect4' && <><h3>Connect Four</h3><p>Drop a red or yellow disc into a column. Two players share this board.</p><div className={styles.connect}>{connect.map((row,r)=><div key={r}>{row.map((v,c)=><button key={c} type="button" className={v=== '🔴'?styles.redDisc:v==='🟡'?styles.yellowDisc:styles.disc} onClick={()=>{if(v||wonConnect)return;let target=-1;for(let rr=5;rr>=0;rr--){if(!connect[rr][c]){target=rr;break;}}if(target<0)return;setConnect(a=>a.map((line,ri)=>line.map((cell,ci)=>ri===target&&ci===c?turn:cell)));setTurn(t=>t==='🔴'?'🟡':'🔴');}} aria-label={`Drop disc in column ${c+1}`}>{v?'●':''}</button>)}</div>)}</div><p>Next: {turn}</p></>}
    {game==='rpsls' && <><h3>Rock, Paper, Scissors, Lizard, Spock</h3><p>Choose your move against the computer.</p><div className={styles.controls}>{['Rock','Paper','Scissors','Lizard','Spock'].map(m=><button key={m} type="button" onClick={()=>{const bot=['Rock','Paper','Scissors','Lizard','Spock'][Math.floor(Math.random()*5)];setRps(`${m} vs ${bot}: ${m===bot?'tie':({Rock:['Scissors','Lizard'],Paper:['Rock','Spock'],Scissors:['Paper','Lizard'],Lizard:['Spock','Paper'],Spock:['Scissors','Rock']} as Record<string,string[]>)[m].includes(bot)?'you win':'computer wins'}`);}}>{m}</button>)}</div><p role="status">{rps}</p></>}
    {game==='hanoi' && <><h3>Tower of Hanoi</h3><p>Move all four discs to another peg. Never place a larger disc on a smaller one.</p><div className={styles.hanoi}>{hanoi.map((peg,i)=><button key={i} type="button" onClick={()=>{if(hanoiFrom===null){if(peg.length)setHanoiFrom(i);}else if(hanoiFrom===i)setHanoiFrom(null);else{const sourcePeg=hanoi[hanoiFrom];const disk=sourcePeg[sourcePeg.length-1];if(disk!==undefined&&(!peg.length||peg[peg.length-1]>disk)){setHanoi(a=>a.map((p,j)=>j===hanoiFrom?p.slice(0,-1):j===i?[...p,disk]:p));setHanoiFrom(null);}else setMessage('A larger disc cannot sit on a smaller disc.');}}} aria-label={`Peg ${i+1}: ${peg.length} discs`}><span>Peg {i+1}</span>{peg.slice().reverse().map((d,j)=><i key={j} style={{width:`${25+d*15}%`}}>{d}</i>)}</button>)}</div></>}
    {game==='flood' && <><h3>Flood Fill</h3><p>Change the top-left colour to absorb the connected region. Choose a colour below.</p><div className={styles.grid8}>{flood.map((v,i)=><span key={i} className={styles.colorCell} data-color={v} />)}</div><div className={styles.controls}>{[0,1,2,3,4].map(v=><button key={v} type="button" onClick={()=>{const old=flood[0];if(old===v)return;const next=flood.slice();const stack=[0];const seen=new Set<number>();while(stack.length){const i=stack.pop()!;if(seen.has(i)||next[i]!==old)continue;seen.add(i);next[i]=v;const r=Math.floor(i/8),c=i%8;if(r)stack.push(i-8);if(r<7)stack.push(i+8);if(c)stack.push(i-1);if(c<7)stack.push(i+1);}setFlood(next);setFloodMoves(n=>n+1);}} style={{borderBottom:`4px solid var(--flood-${v})`}}>Colour {v+1}</button>)}</div><p>Moves: {floodMoves}</p></>}
    {game==='life' && <><h3>Conway’s Game of Life</h3><p>Toggle cells, then step the simulation forward.</p><div className={styles.grid10}>{life.flat().map((v,i)=><button key={i} type="button" className={v?styles.lifeOn:styles.lifeOff} onClick={()=>setLife(a=>a.map((row,r)=>row.map((cell,c)=>r*10+c===i?!cell:cell)))} aria-label={`Cell ${i+1} ${v?'alive':'dead'}`}>{v?'•':''}</button>)}</div><button type="button" onClick={()=>setLife(a=>a.map((row,r)=>row.map((v,c)=>{let n=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(rr>=0&&rr<10&&cc>=0&&cc<10&&a[rr][cc])n++;}return v?n===2||n===3:n===3;}))}>Step simulation</button></>}
    {game==='whack' && <><h3>Whack-a-Star</h3><p>Click the star before it jumps to another spot. Score: {hits}</p><div className={styles.grid4}>{Array.from({length:16},(_,i)=><button key={i} type="button" className={styles.tile} onClick={()=>{if(i===mole){setHits(h=>h+1);setMole((i+1+Math.floor(Math.random()*15))%16);}else setMessage('The star was somewhere else!');}}>{i===mole?'✦':'·'}</button>)}</div></>}
    {game==='trivia' && <><h3>Cosmic Trivia</h3><p>{trivia[question%trivia.length].q}</p><div className={styles.controls}>{trivia[question%trivia.length].a.map((a,i)=><button key={a} type="button" onClick={()=>{if(i===trivia[question%trivia.length].correct)setScore(s=>s+1);setQuestion(q=>q+1);}}>{a}</button>)}</div><p>Score: {score}</p></>}
    {game==='fifteen' && <><h3>15 Puzzle</h3><p>Slide a tile into the empty space to order 1 to 15.</p><div className={styles.grid4}>{fifteen.map((v,i)=><button key={i} type="button" className={styles.tile} disabled={!v} onClick={()=>moveFifteen(i)}>{v||''}</button>)}</div></>}
    {game==='simon' && <><h3>Simon Memory</h3><p>Repeat the growing sequence. Start a round, then enter the sequence from left to right.</p><div className={styles.controls}><button type="button" onClick={()=>{setSimon(a=>[...a,Math.floor(Math.random()*4)]);setSimonInput([]);}}>Add sequence step</button>{['●','◆','▲','■'].map((v,i)=><button key={v} type="button" onClick={()=>{const next=[...simonInput,i];setSimonInput(next);if(simon[next.length-1]!==i)setMessage('Not quite — add a new sequence step to retry.');else if(next.length===simon.length&&simon.length)setMessage('Perfect sequence! Add another step to level up.');}}>{v}</button>)}</div><p>Level: {simon.length} · Input: {simonInput.length}</p></>}
    {game==='pong' && <><h3>Cosmic Pong</h3><p>Move the paddle, then advance the ball. Keep it in play and score at the star gate.</p><div className={styles.pongBoard}>{Array.from({length:7},(_,y)=><div key={y} className={styles.pongRow}>{Array.from({length:9},(_,x)=><span key={x} className={pong.ballX===x&&pong.ballY===y?styles.pongBall:pong.paddle<=x&&x<pong.paddle+3&&y===6?styles.pongPaddle:''}>{pong.ballX===x&&pong.ballY===y?'✦':pong.paddle<=x&&x<pong.paddle+3&&y===6?'━':''}</span>)}</div>)}</div><div className={styles.controls}><button type="button" disabled={pong.paddle===0||pong.over} onClick={()=>setPong(p=>({...p,paddle:Math.max(0,p.paddle-1)}))}>← Paddle</button><button type="button" disabled={pong.over} onClick={()=>setPong(p=>{let x=p.ballX+p.dx,y=p.ballY+p.dy,dx=p.dx,dy=p.dy,score=p.score;if(x<0||x>8){dx=-dx;x=p.ballX+dx;}if(y<0){dy=1;y=1;}if(y===5&&x>=p.paddle&&x<p.paddle+3)dy=-1;if(y>6)return {...p,over:true};if(y===0)score++;return {...p,ballX:x,ballY:y,dx,dy,score};})}>Advance ball</button><button type="button" disabled={pong.paddle>=6||pong.over} onClick={()=>setPong(p=>({...p,paddle:Math.min(6,p.paddle+1)}))}>Paddle →</button><button type="button" onClick={()=>setPong({ballX:4,ballY:3,dx:1,dy:1,paddle:3,score:0,over:false})}>Restart</button></div><p>Score: {pong.score}{pong.over?' · Round over — restart to play again.':''}</p></>}
    {game==='breakout' && <><h3>Brick Breaker</h3><p>Move the paddle under the bouncing star. Each hit removes a brick.</p><div className={styles.breakoutBoard}><div className={styles.brickGrid}>{bricks.map((alive,i)=><span key={i} className={alive?styles.brick:styles.brickGone}>{alive?'✦':''}</span>)}</div><div className={styles.breakoutField}>{Array.from({length:7},(_,y)=><div key={y}>{Array.from({length:7},(_,x)=><span key={x} className={brickBall.x===x&&brickBall.y===y?styles.pongBall:brickBall.paddle<=x&&x<brickBall.paddle+2&&y===6?styles.pongPaddle:''}>{brickBall.x===x&&brickBall.y===y?'●':brickBall.paddle<=x&&x<brickBall.paddle+2&&y===6?'━':''}</span>)}</div>)}</div></div><div className={styles.controls}><button type="button" onClick={()=>setBrickBall(p=>({...p,paddle:Math.max(0,p.paddle-1)}))}>← Paddle</button><button type="button" disabled={brickBall.lives<=0||bricks.every(v=>!v)} onClick={()=>setBrickBall(p=>{let x=p.x+p.dx,y=p.y+p.dy,dx=p.dx,dy=p.dy;if(x<0||x>6){dx=-dx;x=p.x+dx;}if(y<0){dy=1;y=1;}if(y===5&&x>=p.paddle&&x<p.paddle+2)dy=-1;if(y<=1){const idx=(Math.max(0,Math.min(2,y))*8)+Math.max(0,Math.min(7,x));setBricks(b=>b.map((v,i)=>i===idx?false:v));}if(y>6)return {...p,lives:p.lives-1,x:3,y:5,dy:-1};return {...p,x,y,dx,dy};})}>Advance ball</button><button type="button" onClick={()=>setBrickBall(p=>({...p,paddle:Math.min(5,p.paddle+1)}))}>Paddle →</button><button type="button" onClick={()=>{setBricks(Array.from({length:24},()=>true));setBrickBall({x:3,y:5,dx:1,dy:-1,paddle:3,lives:3});}}>Restart</button></div><p>Bricks remaining: {bricks.filter(Boolean).length} · Lives: {brickBall.lives}</p></>}
    {game==='tetris' && <><h3>Starfall Blocks</h3><p>Move the shape and drop it into the grid. Rotate it before placing.</p><div className={styles.tetrisGrid}>{blocks.map((row,r)=><div key={r}>{row.map((v,c)=><span key={c} className={v?styles.blockFilled:activeShape.some((line,sr)=>line.some((cell,sc)=>cell&&r===sr&&c===blockX+sc))?styles.blockActive:styles.blockCell}/>)}</div>)}</div><div className={styles.controls}><button type="button" onClick={()=>setBlockX(x=>Math.max(0,x-1))}>← Move</button><button type="button" onClick={()=>setActiveShape(s=>s[0].map((_,i)=>s.map(row=>row[i]).reverse()))}>Rotate</button><button type="button" onClick={()=>{setBlocks(b=>{const next=b.map(row=>row.slice());activeShape.forEach((row,r)=>row.forEach((v,c)=>{if(v&&r<10&&blockX+c<6)next[r][blockX+c]=1;}));return next;});setActiveShape([[1,1,1],[0,1,0]]);setBlockX(1);}}>Drop shape</button><button type="button" onClick={()=>{setBlocks(Array.from({length:10},()=>Array(6).fill(0)));setActiveShape([[1,1,1],[0,1,0]]);setBlockX(1);}}>Restart</button></div></>}
    <section className={styles.tokenGate} aria-labelledby="token-gate-title"><div><p className={styles.eyebrow}>SANCTUARY TOKENS</p><h3 id="token-gate-title">Optional game extras</h3><p>Planned uses include cosmetic themes, optional hints and extra challenge modes. Token spending stays locked until secure server-side wallet checks, explicit confirmation and anti-replay protections are implemented.</p></div><button type="button" disabled aria-disabled="true" title="Token spending is not enabled yet"><Sparkles size={14}/> Token extras · coming soon</button><small>No tokens are charged and no wallet balance is changed in this preview.</small></section>
    {message&&<p className={styles.message} role="status">{message}</p>}
    </div>
    <p className={styles.footnote}>These are lightweight browser prototypes. Progress stays in this visit only; online multiplayer and token spending remain disabled until server-authoritative wallet checks are ready.</p>
  </section>;
}
