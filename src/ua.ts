export type Platform = 'ios' | 'android' | 'other';

export function parseUA(ua: string): Platform {
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return 'ios';
  if (/android/.test(s)) return 'android';
  return 'other';
}

const BOT_PATTERN =
  /slackbot|whatsapp|facebookexternalhit|facebookcatalog|twitterbot|telegrambot|discordbot|linkedinbot|skypeuripreview|embedly|pinterest|redditbot|applebot|googlebot|bingbot|yandexbot|duckduckbot|vkshare|w3c_validator|outbrain|quora link preview|nuzzel|tumblr|bitlybot|mastodon|iframely|opengraph|\bbot\b|crawler|spider|preview|unfurl|metainspector|http-client|python-requests|node-fetch|axios|go-http-client|libwww-perl|okhttp|java\/[\d.]+|curl\/|wget\//;

export function isUnfurlerBot(ua: string): boolean {
  return BOT_PATTERN.test(ua.toLowerCase());
}
