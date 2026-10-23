import { describe, expect, it } from 'vitest';
import { isValidAdsenseClientId } from './config';

describe('AdSense configuration', () => {
  it('accepts only ca-pub publisher identifiers', () => {
    expect(isValidAdsenseClientId('ca-pub-8267279636493149')).toBe(true);
    expect(isValidAdsenseClientId('pub-8267279636493149')).toBe(false);
    expect(isValidAdsenseClientId('ca-pub-')).toBe(false);
    expect(isValidAdsenseClientId('ca-pub-abc')).toBe(false);
    expect(isValidAdsenseClientId('')).toBe(false);
  });
});
