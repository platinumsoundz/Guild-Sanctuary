import type { CapacitorConfig } from '@capacitor/cli';

const isReleaseBuild = process.env.CAPACITOR_RELEASE_BUILD === 'true';
const configuredServerUrl = process.env.CAPACITOR_SERVER_URL;
const configuredAdMobAppId = process.env.ADMOB_ANDROID_APP_ID;
const configuredBannerAdUnitId = process.env.NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID;
const configuredInterstitialAdUnitId = process.env.NEXT_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID;

if (isReleaseBuild && !configuredServerUrl) {
  throw new Error('Set CAPACITOR_SERVER_URL to the deployed HTTPS application before creating a release build.');
}
if (isReleaseBuild && !configuredAdMobAppId) {
  throw new Error('Set ADMOB_ANDROID_APP_ID before creating a release build.');
}
if (isReleaseBuild && (!configuredBannerAdUnitId || !configuredInterstitialAdUnitId)) {
  throw new Error('Set both production AdMob ad unit IDs before creating a release build.');
}
if (isReleaseBuild && process.env.NEXT_PUBLIC_ADMOB_TEST_MODE === 'true') {
  throw new Error('Disable AdMob test mode before creating a release build.');
}
if (configuredServerUrl && new URL(configuredServerUrl).protocol !== 'https:') {
  throw new Error('CAPACITOR_SERVER_URL must use HTTPS.');
}

const config: CapacitorConfig = {
  appId: 'com.guildsanctuary.app',
  appName: 'Guild & Sanctuary',
  webDir: 'capacitor-web',
  server: {
    ...(configuredServerUrl ? { url: configuredServerUrl } : {}),
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
