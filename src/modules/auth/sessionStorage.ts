import type { AuthSession } from './sessionSchema';
import { normalizeSession } from './sessionSchema';

const activeSessionKey = 'guild-sanctuary:active-session:v1';
const accountsKey = 'guild-sanctuary:accounts:v1';

export function getStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Local accounts are only available in the browser.');
  }

  try {
    return window.localStorage;
  } catch {
    throw new Error('Browser storage is unavailable. Check your browser privacy settings.');
  }
}

export function parseSessions(rawValue: string | null): AuthSession[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.map(normalizeSession).filter((session): session is AuthSession => session !== null)
      : [];
  } catch {
    return [];
  }
}

export function saveAccount(updatedSession: AuthSession): void {
  const storage = getStorage();
  const accounts = parseSessions(storage.getItem(accountsKey));
  const updatedAccounts = accounts.map((account) => (
    account.user.id === updatedSession.user.id ? updatedSession : account
  ));

  try {
    storage.setItem(accountsKey, JSON.stringify(updatedAccounts));
  } catch {
    throw new Error('Your account could not be updated in this browser.');
  }
}

export function restoreSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return normalizeSession(JSON.parse(window.localStorage.getItem(activeSessionKey) ?? 'null'));
  } catch {
    return null;
  }
}

export function persistActiveSession(session: AuthSession): void {
  try {
    getStorage().setItem(activeSessionKey, JSON.stringify(session));
  } catch {
    throw new Error('Your session could not be saved in this browser.');
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(activeSessionKey);
  } catch {
    // The in-memory session can still be cleared when browser storage is unavailable.
  }
}

export { accountsKey, activeSessionKey };
