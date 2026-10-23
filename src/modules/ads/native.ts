/*
 * Native-only AdMob entry point.
 *
 * Import from `@/modules/ads/native` inside Capacitor-only code. Never import
 * this module from a shared component or barrel, because it statically imports
 * the Android AdMob plugin and would add it to the web bundle.
 */
export { AdPlacement } from './AdPlacement';
