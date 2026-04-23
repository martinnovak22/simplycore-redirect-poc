import { describe, expect, it } from 'vitest';
import { parseUA } from '../src/ua.ts';

describe('parseUA', () => {
  const cases: Array<[label: string, ua: string, expected: 'ios' | 'android' | 'other']> = [
    ['iPhone Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15', 'ios'],
    ['iPad Safari', 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15', 'ios'],
    ['iPod touch', 'Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15', 'ios'],
    ['Android Chrome (Pixel)', 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/124.0.0.0', 'android'],
    ['Android Samsung', 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/124.0.0.0', 'android'],
    ['Facebook in-app on iOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) FBAN/FBIOS', 'ios'],
    ['Desktop Chrome', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0', 'other'],
    ['Desktop Safari on Mac', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15', 'other'],
    ['Empty UA', '', 'other'],
  ];

  it.each(cases)('%s → %s', (_label, ua, expected) => {
    expect(parseUA(ua)).toBe(expected);
  });
});
