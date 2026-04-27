import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.ts';

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('AASA', () => {
  it('serves valid JSON at the exact unsuffixed path', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/.well-known/apple-app-site-association',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const body = JSON.parse(res.body);
    expect(body.applinks.details[0].appIDs).toContain(
      'S3P45SYX2M.com.simplycore.air',
    );
    expect(body.applinks.details[0].components[0]['/']).toBe('/code=*');
  });
});

describe('assetlinks', () => {
  it('serves valid JSON with the expected package name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/.well-known/assetlinks.json',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const body = JSON.parse(res.body);
    expect(body[0].target.package_name).toBe('com.simplycore_mobile');
    expect(body[0].target.sha256_cert_fingerprints[0]).toMatch(
      /^[A-F0-9]{2}(:[A-F0-9]{2}){31}$/,
    );
  });
});

describe('redirect /code=:authCode', () => {
  const cases: Array<[ua: string, expectedHostFragment: string]> = [
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
      'apps.apple.com',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/124.0.0.0',
      'play.google.com',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0',
      'simplycontrol.cz',
    ],
  ];

  it.each(cases)('UA "%s" → redirect contains %s', async (ua, host) => {
    const res = await app.inject({
      method: 'GET',
      url: '/code=feeab8a51df53b21dbad6a2230ac5bd0',
      headers: { 'user-agent': ua },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain(host);
  });

  it('still redirects with missing UA', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/code=abc',
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('simplycontrol.cz');
  });
});

describe('preview for unfurler bots', () => {
  it('Slackbot gets HTML with OG tags, not a redirect', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/code=feeab8a51df53b21dbad6a2230ac5bd0',
      headers: { 'user-agent': 'Slackbot-LinkExpanding 1.0' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('property="og:title"');
    expect(res.body).toContain('SimplyControl');
    expect(res.body).toContain('property="og:image"');
    expect(res.body).toContain('twitter:card');
  });

  it('WhatsApp preview HTML includes a JS fallback redirect', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/code=abc',
      headers: { 'user-agent': 'WhatsApp/2.23.24.76 A' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('location.replace');
    expect(res.body).toContain('simplycontrol.cz');
  });
});

describe('root', () => {
  it('GET / returns health payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      service: 'simplycore-redirect-poc',
      status: 'ok',
    });
  });
});
