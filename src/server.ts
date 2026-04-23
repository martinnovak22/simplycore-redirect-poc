import Fastify, { type FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { config } from './config.ts';
import { parseUA } from './ua.ts';

const here = dirname(fileURLToPath(import.meta.url));
const wellKnownDir = join(here, '..', 'public', '.well-known');

const aasaBody = readFileSync(
  join(wellKnownDir, 'apple-app-site-association'),
  'utf8',
);
const assetlinksBody = readFileSync(
  join(wellKnownDir, 'assetlinks.json'),
  'utf8',
);

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

  app.get<{ Params: { authCode: string } }>(
    '/code=:authCode',
    async (req, reply) => {
      const platform = parseUA(req.headers['user-agent'] ?? '');
      const target =
        platform === 'ios'
          ? config.iosStoreUrl
          : platform === 'android'
            ? config.androidStoreUrl
            : config.fallbackUrl;

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
