import type { AccountTheme } from '@/types/database';

/**
 * Permanent theme foundation.
 * Register selectable themes here; keep page/component/layout styling shared.
 * Palette values live in the single semantic-token section of globals.css.
 * A new theme should be a palette addition, not a parallel styling project.
 */
export type ThemePreference = AccountTheme;
export type ResolvedTheme = Exclude<AccountTheme, 'system'>;

export interface ThemeDefinition {
  id: ResolvedTheme;
  label: string;
  description: string;
  colorScheme: 'light' | 'dark';
  tailwindDark: boolean;
  requiresEntitlement?: boolean;
}

export const THEME_CATALOGUE: readonly ThemeDefinition[] = [
  { id: 'dark', label: 'Cosmic dark', description: 'The original deep-space default', colorScheme: 'dark', tailwindDark: true },
  { id: 'light', label: 'Cosmic light · daylight', description: 'The matching lavender daylight palette', colorScheme: 'light', tailwindDark: false },
  { id: 'dusk', label: 'Dusk · low-glare warm', description: 'A warm, low-glare evening palette', colorScheme: 'dark', tailwindDark: true },
  { id: 'stone', label: 'Stone · grey', description: 'A calm neutral palette', colorScheme: 'light', tailwindDark: false },
  { id: 'ocean', label: 'Ocean · blue', description: 'A cool blue palette', colorScheme: 'dark', tailwindDark: true },
  { id: 'nebula', label: 'Nebula · violet', description: 'A vivid violet deep-space palette', colorScheme: 'dark', tailwindDark: true, requiresEntitlement: true },
  { id: 'aurora', label: 'Aurora · northern lights', description: 'A luminous teal and emerald night palette', colorScheme: 'dark', tailwindDark: true, requiresEntitlement: true },
  { id: 'celestial', label: 'Celestial · rose gold', description: 'A warm rose-gold cosmic palette', colorScheme: 'dark', tailwindDark: true, requiresEntitlement: true },
  { id: 'eclipse', label: 'Eclipse · midnight', description: 'A dramatic midnight and solar-gold palette', colorScheme: 'dark', tailwindDark: true, requiresEntitlement: true },
  { id: 'ember', label: 'Ember', description: 'An additional ember palette', colorScheme: 'dark', tailwindDark: true },
  { id: 'forest', label: 'Forest', description: 'An additional forest palette', colorScheme: 'dark', tailwindDark: true },
  { id: 'rose', label: 'Rose', description: 'An additional rose palette', colorScheme: 'dark', tailwindDark: true },
  { id: 'violet', label: 'Violet', description: 'An additional violet palette', colorScheme: 'dark', tailwindDark: true },
  { id: 'midnight', label: 'Midnight', description: 'An additional midnight palette', colorScheme: 'dark', tailwindDark: true },
  { id: 'lavender', label: 'Lavender', description: 'A soft lavender daylight palette', colorScheme: 'light', tailwindDark: false },
  { id: 'mint', label: 'Mint', description: 'A fresh mint daylight palette', colorScheme: 'light', tailwindDark: false },
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
