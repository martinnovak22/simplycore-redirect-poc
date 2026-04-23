export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',

  iosStoreUrl: 'https://apps.apple.com/app/id1605979547',
  androidStoreUrl:
    'https://play.google.com/store/apps/details?id=com.simplycore_mobile',
  fallbackUrl: 'https://www.simplycontrol.cz/simplyair',
} as const;
