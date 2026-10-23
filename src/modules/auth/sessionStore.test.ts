import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteLocalAccount,
  getLocalPublicProfileById,
  persistActiveSession,
  registerLocalAccount,
  searchLocalPublicProfiles,
  updateLocalProfile,
} from './sessionStore';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('local session store', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers a valid account and persists it', () => {
    const session = registerLocalAccount({
      email: '  Rowan@Example.com ',
      username: 'rowan_1',
      displayName: 'Rowan',
    });

    expect(session.user.email).toBe('rowan@example.com');
    expect(session.profile.username).toBe('rowan_1');
    expect(session.profile.role).toBe('member');
    expect(storage.getItem('guild-sanctuary:accounts:v1')).toContain('rowan@example.com');
  });

  it('rejects invalid usernames and duplicate email addresses', () => {
    expect(() => registerLocalAccount({ email: 'a@example.com', username: 'no spaces', displayName: 'A' }))
      .toThrow(/3 to 24 letters/);

    registerLocalAccount({ email: 'a@example.com', username: 'alpha', displayName: 'Alpha' });
    expect(() => registerLocalAccount({ email: 'A@example.com', username: 'beta', displayName: 'Beta' }))
      .toThrow(/already registered/);
  });

  it('validates profile updates', () => {
    const session = registerLocalAccount({ email: 'a@example.com', username: 'alpha', displayName: 'Alpha' });
    persistActiveSession(session);

    expect(() => updateLocalProfile(session.user.id, { themeColor: 'green' })).toThrow(/theme color/);
    expect(() => updateLocalProfile(session.user.id, { age: 8 })).toThrow(/Age must be/);

    const updated = updateLocalProfile(session.user.id, {
      bio: 'A quiet corner of the web.',
      themeColor: '#123abc',
    });
    expect(updated.profile.bio).toBe('A quiet corner of the web.');
    expect(updated.profile.themeColor).toBe('#123abc');
  });

  it('only discovers verified, public profiles and respects privacy', () => {
    const publicAccount = registerLocalAccount({ email: 'public@example.com', username: 'public_one', displayName: 'Public One' });
    const privateAccount = registerLocalAccount({ email: 'private@example.com', username: 'private_one', displayName: 'Private One' });

    expect(getLocalPublicProfileById(publicAccount.user.id)).toBeNull();

    // Verification happens through the mocked email code.
    persistActiveSession(publicAccount);
    const verified = { ...publicAccount, user: { ...publicAccount.user, emailVerified: true } };
    storage.setItem('guild-sanctuary:accounts:v1', JSON.stringify([verified, privateAccount]));

    expect(getLocalPublicProfileById(publicAccount.user.id)?.username).toBe('public_one');
    expect(searchLocalPublicProfiles('public')).toHaveLength(1);

    const hidden = updateLocalProfile(publicAccount.user.id, { visibility: 'private' });
    expect(hidden.profile.visibility).toBe('private');
    expect(getLocalPublicProfileById(publicAccount.user.id)).toBeNull();
  });

  it('requires the exact confirmation phrase before deleting an account', () => {
    const session = registerLocalAccount({ email: 'delete@example.com', username: 'delete_me', displayName: 'Delete Me' });
    persistActiveSession(session);

    expect(() => deleteLocalAccount(session.user.id, 'delete@example.com', 'delete', ''))
      .toThrow(/did not match/);

    deleteLocalAccount(session.user.id, 'delete@example.com', 'DELETE', '');
    expect(storage.getItem('guild-sanctuary:active-session:v1')).toBeNull();
  });
});
