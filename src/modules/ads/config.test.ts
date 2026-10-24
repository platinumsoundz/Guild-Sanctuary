import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAdsProductionDeployment, isValidAdsenseClientId } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('AdSense configuration', () => {
  it('accepts only ca-pub publisher identifiers', () => {
    expect(isValidAdsenseClientId('ca-pub-8267279636493149')).toBe(true);
    expect(isValidAdsenseClientId('pub-8267279636493149')).toBe(false);
    expect(isValidAdsenseClientId('ca-pub-')).toBe(false);
    expect(isValidAdsenseClientId('ca-pub-abc')).toBe(false);
    expect(isValidAdsenseClientId('')).toBe(false);
  });

  it('fails closed unless the deployment is explicitly production', () => {
    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_ENV', '');
    vi.stubEnv('VERCEL_ENV', '');
    expect(isAdsProductionDeployment()).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_ENV', 'preview');
    expect(isAdsProductionDeployment()).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_ENV', 'production');
    expect(isAdsProductionDeployment()).toBe(true);

    vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_ENV', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isAdsProductionDeployment()).toBe(true);
  });
});
