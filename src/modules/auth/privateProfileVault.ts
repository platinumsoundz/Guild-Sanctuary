import type { PrivateProfileVaultRow } from '@/services/supabase/database.types';
import { getSupabaseBrowserClient } from '@/services/supabase';

const iterations = 310_000;
const vaultKeys = new Map<string, { key: CryptoKey; salt: Uint8Array }>();

export type PrivateProfileData = {
  bio: string;
  location: string;
  age: string;
  starSign: string;
  belief: string;
  socialLinks: string;
};

const emptyPrivateProfile: PrivateProfileData = {
  bio: '',
  location: '',
  age: '',
  starSign: '',
  belief: '',
  socialLinks: '',
};

function toBase64(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptData(userId: string, key: CryptoKey, data: PrivateProfileData): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  );
  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(ciphertext), iv.length);
  return toBase64(packed);
}

function parsePrivateData(value: unknown): PrivateProfileData {
  if (typeof value !== 'object' || value === null) {
    throw new Error('The encrypted profile record has an invalid format.');
  }
  const record = value as Record<string, unknown>;
  const fields = Object.keys(emptyPrivateProfile) as (keyof PrivateProfileData)[];
  for (const field of fields) {
    if (typeof record[field] !== 'string' || record[field].length > 4000) {
      throw new Error('The encrypted profile record has invalid field data.');
    }
  }
  return Object.fromEntries(fields.map((field) => [field, record[field]])) as PrivateProfileData;
}

export async function unlockPrivateProfileVault(
  userId: string,
  passphrase: string,
): Promise<PrivateProfileData> {
  if (passphrase.length < 12 || passphrase.length > 256) {
    throw new Error('Use a private passphrase between 12 and 256 characters.');
  }
  const client = getSupabaseBrowserClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(`Authentication could not be verified: ${authError.message}`);
  if (!auth.user || auth.user.id !== userId) throw new Error('Sign in to unlock your private profile data.');

  const { data: row, error } = await client
    .from('private_profile_vault')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`The private profile vault could not be loaded: ${error.message}`);

  if (!row) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(passphrase, salt);
    vaultKeys.set(userId, { key, salt });
    return { ...emptyPrivateProfile };
  }

  const salt = fromBase64(row.salt);
  const key = await deriveKey(passphrase, salt);
  let decrypted: ArrayBuffer;
  try {
    const packed = fromBase64(row.ciphertext);
    if (packed.length <= 12) throw new Error('Ciphertext is incomplete.');
    decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: packed.slice(0, 12), additionalData: new TextEncoder().encode(userId) },
      key,
      packed.slice(12),
    );
  } catch {
    throw new Error('The passphrase is incorrect or the encrypted profile data is damaged.');
  }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  vaultKeys.set(userId, { key, salt });
  return parsePrivateData(parsed);
}

export async function savePrivateProfileVault(
  userId: string,
  data: PrivateProfileData,
): Promise<void> {
  const vault = vaultKeys.get(userId);
  if (!vault) throw new Error('Unlock the private profile vault before saving.');
  const normalized = parsePrivateData(data);
  const ciphertext = await encryptData(userId, vault.key, normalized);
  const row: PrivateProfileVaultRow = {
    user_id: userId,
    ciphertext,
    salt: toBase64(vault.salt),
    updated_at: new Date().toISOString(),
  };
  const { error } = await getSupabaseBrowserClient()
    .from('private_profile_vault')
    .upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(`Encrypted profile data could not be saved: ${error.message}`);
}

export function isPrivateProfileVaultUnlocked(userId: string): boolean {
  return vaultKeys.has(userId);
}

export function lockPrivateProfileVault(userId: string): void {
  vaultKeys.delete(userId);
}
