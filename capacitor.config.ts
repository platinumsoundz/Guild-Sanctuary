import type { CapacitorConfig } from '@capacitor/cli';

const isReleaseBuild = process.env.CAPACITOR_RELEASE_BUILD === 'true';
const configuredServerUrl = process.env.CAPACITOR_SERVER_URL;

if (isReleaseBuild && !configuredServerUrl) {
  throw new Error('Set CAPACITOR_SERVER_URL to the deployed HTTPS application before creating a release build.');
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
