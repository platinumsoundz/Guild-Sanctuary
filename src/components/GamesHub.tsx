'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Gamepad2, Maximize2, X } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { getSupabaseBrowserClient } from '@/services/supabase';
import styles from './GamesHub.module.css';

type GameId = 'online' | 'training3d';
type ApiGameId = 'sleeves-online' | 'training-3d';
type WalletSession = { token: string; gameId: ApiGameId; expiresAt: string };
type WalletStatus = 'idle' | 'loading' | 'ready' | 'guest' | 'error';

const games: {
  id: GameId;
  apiId: ApiGameId;
  title: string;
  description: string;
  genre: string;
  url: string;
  badge: string;
}[] = [
  {
    id: 'online',
    apiId: 'sleeves-online',
    title: 'The 5 Sleeves Online',
    description: 'A browser-based multiplayer action RPG. Explore the settlements and dangerous roads, fight Rust Wardens, develop your operative, and clear regional towers.',
    genre: 'Multiplayer action RPG',
    url: 'https://the-5-sleeves.onrender.com/',
    badge: 'Online world',
  },
  {
    id: 'training3d',
    apiId: 'training-3d',
    title: 'The 5 Sleeves — 3D Training Ground',
    description: 'A third-person training and wilderness prototype. Practice with Sensei, explore the outpost, and reach the First Tower.',
    genre: 'Third-person 3D prototype',
    url: 'https://raw.githack.com/platinumsoundz/The-5-Sleeves-3D/0fcbb06/index.html',
    badge: '3D prototype',
  },
];

export function GamesHub() {
  const { currentUser, isGuest } = useAppContext();
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [walletSession, setWalletSession] = useState<WalletSession | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('idle');
  const [walletMessage, setWalletMessage] = useState('Connect a signed-in Sanctuary account to read your wallet.');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const selectedGame = games.find((game) => game.id === activeGame);

  useEffect(() => {
    let cancelled = false;
    setWalletSession(null);
    setWalletBalance(null);

    if (!selectedGame) {
      setWalletStatus('idle');
      setWalletMessage('Connect a signed-in Sanctuary account to read your wallet.');
      return () => { cancelled = true; };
    }

    if (!currentUser || isGuest) {
      setWalletStatus('guest');
      setWalletMessage('Sign in with a connected Sanctuary account to share your wallet with this game.');
      return () => { cancelled = true; };
    }

    const connectWallet = async () => {
      setWalletStatus('loading');
      setWalletMessage('Connecting your Sanctuary wallet…');
      try {
        const client = getSupabaseBrowserClient();
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError || authData.user?.id !== currentUser.user.id) {
          throw new Error('A verified Sanctuary sign-in is required for the shared wallet.');
        }

        const { data, error } = await client.functions.invoke('game-wallet', {
          body: { action: 'issue-session', gameId: selectedGame.apiId },
        });
        if (error) throw error;
        if (!data?.sessionToken || typeof data.balanceTokens !== 'number' || !data?.expiresAt) {
          throw new Error('The game wallet bridge returned an invalid session.');
        }
        if (cancelled) {
          void client.functions.invoke('game-wallet', {
            body: { action: 'revoke-session', gameId: selectedGame.apiId, sessionToken: data.sessionToken },
          });
          return;
        }

        setWalletSession({ token: data.sessionToken, gameId: selectedGame.apiId, expiresAt: data.expiresAt });
        setWalletBalance(data.balanceTokens);
        setWalletStatus('ready');
        setWalletMessage('Wallet connected for this game session. Token spending is still locked while the game purchase bridge is tested.');
      } catch {
        if (!cancelled) {
          setWalletStatus('error');
          setWalletMessage('The shared wallet could not connect. You can still launch the game without wallet access.');
        }
      }
    };

    void connectWallet();
    return () => { cancelled = true; };
  }, [activeGame, currentUser, isGuest, selectedGame]);

  useEffect(() => {
    if (!walletSession) return;
    const session = walletSession;
    return () => {
      try {
        void getSupabaseBrowserClient().functions.invoke('game-wallet', {
          body: { action: 'revoke-session', gameId: session.gameId, sessionToken: session.token },
        }).catch(() => undefined);
      } catch {
        // Session expiry is the fallback if the browser has already torn down the client.
      }
    };
  }, [walletSession]);

  useEffect(() => {
    if (!selectedGame || !walletSession || walletBalance === null) return;
    const targetOrigin = new URL(selectedGame.url).origin;
    iframeRef.current?.contentWindow?.postMessage({
      type: 'sanctuary:wallet:ready',
      gameId: walletSession.gameId,
      balanceTokens: walletBalance,
      expiresAt: walletSession.expiresAt,
    }, targetOrigin);
  }, [selectedGame, walletSession, walletBalance]);

  useEffect(() => {
    if (!selectedGame || !walletSession) return;
    const targetOrigin = new URL(selectedGame.url).origin;

    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== targetOrigin) return;
      if (!event.data || event.data.type !== 'sanctuary:wallet:balance:request') return;

      try {
        const client = getSupabaseBrowserClient();
        const { data, error } = await client.functions.invoke('game-wallet', {
          body: { action: 'balance', gameId: walletSession.gameId, sessionToken: walletSession.token },
        });
        if (error) throw error;
        if (typeof data?.balanceTokens !== 'number') throw new Error('Invalid wallet response.');

        setWalletBalance(data.balanceTokens);
        iframeRef.current?.contentWindow?.postMessage({
          type: 'sanctuary:wallet:balance',
          gameId: walletSession.gameId,
          balanceTokens: data.balanceTokens,
          expiresAt: data.expiresAt,
        }, targetOrigin);
      } catch {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'sanctuary:wallet:error',
          gameId: walletSession.gameId,
          message: 'The shared wallet is temporarily unavailable.',
        }, targetOrigin);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedGame, walletSession]);

  const walletLabel = walletStatus === 'ready' && walletBalance !== null
    ? `${walletBalance.toLocaleString('en-GB')} tokens`
    : walletStatus === 'loading'
      ? 'Connecting wallet…'
      : walletStatus === 'guest'
        ? 'Sign in for wallet'
        : walletStatus === 'error'
          ? 'Wallet unavailable'
          : 'Wallet not linked';

  return (
    <main className={styles.hub}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>THE SANCTUARY ARCADE</p>
        <h1>Games</h1>
        <p>Play The 5 Sleeves games from one place. Each game still runs on its existing host while we build the shared Sanctuary account and wallet connection.</p>
      </header>

      {selectedGame ? (
        <section className={styles.player} aria-label={selectedGame.title}>
          <div className={styles.playerHeader}>
            <div>
              <span className={styles.gameBadge}>{selectedGame.badge}</span>
              <h2>{selectedGame.title}</h2>
              <span className={styles.walletBadge} title={walletMessage}>Sanctuary wallet: {walletLabel}</span>
            </div>
            <div className={styles.playerActions}>
              <a href={selectedGame.url} target="_blank" rel="noreferrer" className={styles.iconButton} aria-label="Open game in a new tab">
                <ExternalLink size={17} aria-hidden="true" />
              </a>
              <button type="button" className={styles.iconButton} onClick={() => setActiveGame(null)} aria-label="Close game">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={styles.frameWrap}>
            <iframe
              ref={iframeRef}
              className={styles.frame}
              src={selectedGame.url}
              title={selectedGame.title}
              loading="lazy"
              onLoad={() => {
                if (!walletSession || walletBalance === null) return;
                iframeRef.current?.contentWindow?.postMessage({
                  type: 'sanctuary:wallet:ready',
                  gameId: walletSession.gameId,
                  balanceTokens: walletBalance,
                  expiresAt: walletSession.expiresAt,
                }, new URL(selectedGame.url).origin);
              }}
              allow="fullscreen; gamepad; pointer-lock"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-fullscreen"
            />
          </div>
          <p className={styles.hint}>If the host blocks embedding or a game control behaves differently inside the app, use the open-in-new-tab button.</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label="Available games">
          {games.map((game) => (
            <article className={styles.card} key={game.id}>
              <div className={styles.art} aria-hidden="true">
                <Gamepad2 size={44} strokeWidth={1.2} />
              </div>
              <div className={styles.cardBody}>
                <span className={styles.gameBadge}>{game.badge}</span>
                <h2>{game.title}</h2>
                <p className={styles.genre}>{game.genre}</p>
                <p className={styles.description}>{game.description}</p>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.playButton} onClick={() => setActiveGame(game.id)}>
                    <Gamepad2 size={17} aria-hidden="true" /> Play in Sanctuary
                  </button>
                  <a href={game.url} target="_blank" rel="noreferrer" className={styles.externalLink}>
                    Open separately <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <aside className={styles.walletNotice}>
        <Maximize2 size={18} aria-hidden="true" />
        <div>
          <strong>Sanctuary Tokens in games</strong>
          <p>The app can now prepare a short-lived, game-scoped wallet session and safely answer balance requests from the embedded game. The game clients still need their message listener and purchase-receipt handling before a balance appears inside gameplay or can be spent. No token spending is enabled.</p>
        </div>
      </aside>
    </main>
  );
}
