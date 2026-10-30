import type { AccountTheme } from '@/types/database';

export type ThemePreference = AccountTheme;
export type ResolvedTheme = Exclude<AccountTheme, 'system'>;

export interface ThemeDefinition {
  id: ResolvedTheme;
  label: string;
  description: string;
  colorScheme: 'light' | 'dark';
  tailwindDark: boolean;
}

export const THEME_CATALOGUE: readonly ThemeDefinition[] = [
  { id: 'dark', label: 'Cosmic dark', description: 'The original deep-space default', colorScheme: 'dark', tailwindDark: true },
  { id: 'light', label: 'Cosmic light · daylight', description: 'The matching lavender daylight palette', colorScheme: 'light', tailwindDark: false },
  { id: 'dusk', label: 'Dusk · low-glare warm', description: 'A warm, low-glare evening palette', colorScheme: 'dark', tailwindDark: true },
  { id: 'stone', label: 'Stone · grey', description: 'A calm neutral palette', colorScheme: 'light', tailwindDark: false },
  { id: 'ocean', label: 'Ocean · blue', description: 'A cool blue palette', colorScheme: 'dark', tailwindDark: true },
] as const;

export const THEME_PREFERENCE_OPTIONS = [
  { id: 'system', label: 'Use device setting' },
  ...THEME_CATALOGUE.map(({ id, label }) => ({ id, label })),
] as const;

export const THEME_IDS = THEME_CATALOGUE.map(({ id }) => id) as readonly ResolvedTheme[];
export const THEME_PREFERENCES = ['system', ...THEME_IDS] as const satisfies readonly ThemePreference[];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference, prefersLight: boolean): ResolvedTheme {
  return preference === 'system' ? (prefersLight ? 'light' : 'dark') : preference;
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const definition = THEME_CATALOGUE.find((item) => item.id === theme) ?? THEME_CATALOGUE[0];
  const root = document.documentElement;
  root.dataset.theme = definition.id;
  root.style.colorScheme = definition.colorScheme;
  root.classList.toggle('dark', definition.tailwindDark);
}
