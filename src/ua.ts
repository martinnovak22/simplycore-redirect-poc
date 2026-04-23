export type Platform = 'ios' | 'android' | 'other';

export function parseUA(ua: string): Platform {
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return 'ios';
  if (/android/.test(s)) return 'android';
  return 'other';
}
