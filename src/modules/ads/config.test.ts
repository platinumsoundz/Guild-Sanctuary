import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAdsProductionDeployment, isValidAdsenseClientId, isValidAdSlotId } from './config';

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

  it('accepts only numeric AdSense slot identifiers', () => {
    expect(isValidAdSlotId('1234567890')).toBe(true);
    expect(isValidAdSlotId('')).toBe(false);
    expect(isValidAdSlotId(undefined)).toBe(false);
    expect(isValidAdSlotId('123-456')).toBe(false);
    expect(isValidAdSlotId('abc')).toBe(false);
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
