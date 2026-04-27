import Fastify, { type FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { config } from './config.ts';
import { isUnfurlerBot, parseUA } from './ua.ts';
import { renderPreviewHtml } from './preview.ts';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');
const wellKnownDir = join(publicDir, '.well-known');

const aasaBody = readFileSync(
  join(wellKnownDir, 'apple-app-site-association'),
  'utf8',
);
const assetlinksBody = readFileSync(
  join(wellKnownDir, 'assetlinks.json'),
  'utf8',
);
const previewImage = readFileSync(join(publicDir, 'preview.png'));

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get('/.well-known/apple-app-site-association', async (_req, reply) => {
    return reply
      .header('content-type', 'application/json')
      .send(aasaBody);
  });

  app.get('/.well-known/assetlinks.json', async (_req, reply) => {
    return reply
      .header('content-type', 'application/json')
      .send(assetlinksBody);
  });

  app.get('/preview.png', async (_req, reply) => {
    return reply
      .header('content-type', 'image/png')
      .header('cache-control', 'public, max-age=86400')
      .send(previewImage);
  });

  app.get<{ Params: { authCode: string } }>(
    '/code=:authCode',
    async (req, reply) => {
      const ua = req.headers['user-agent'] ?? '';
      const platform = parseUA(ua);
      const target =
        platform === 'ios'
          ? config.iosStoreUrl
          : platform === 'android'
            ? config.androidStoreUrl
            : config.fallbackUrl;

      if (isUnfurlerBot(ua)) {
        const canonical = `${config.publicBaseUrl}/code=${req.params.authCode}`;
        req.log.info(
          { authCode: req.params.authCode, ua, kind: 'unfurl' },
          'preview',
        );
        return reply
          .header('content-type', 'text/html; charset=utf-8')
          .header('cache-control', 'public, max-age=300')
          .send(renderPreviewHtml(canonical, target));
      }

      req.log.info(
        { authCode: req.params.authCode, platform, target },
        'redirect',
      );
      return reply.redirect(target, 302);
    },
  );

  app.get('/', async () => ({
    service: 'simplycore-redirect-poc',
    status: 'ok',
  }));

  return app;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const app = buildApp();
  app
    .listen({ port: config.port, host: config.host })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
