export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',

  iosStoreUrl: 'https://apps.apple.com/app/id1605979547',
  androidStoreUrl:
    'https://play.google.com/store/apps/details?id=com.simplycore_mobile',
  fallbackUrl: 'https://www.simplycontrol.cz/simplyair',

  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',

  preview: {
    title: 'SimplyControl',
    description: 'Sdílejte přístup ke svému objektu se SimplyControl.',
    locale: 'cs_CZ',
    imagePath: '/preview.png',
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: 'SimplyControl',
    siteName: 'SimplyControl',
    appleAppId: '1605979547',
  },
} as const;
