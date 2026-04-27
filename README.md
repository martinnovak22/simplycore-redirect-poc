# simplycore-redirect-poc

Dynalinks replacement for SimplyCORE Mobile.

The service hosts `apple-app-site-association` and `assetlinks.json` for
Universal Links / App Links, and returns a UA-based 302 redirect to the App
Store / Play Store for devices where the app is not installed.

**URL format (identical to Dynalinks):**

```
https://<host>/code=<authCode>
```

## What the service does

- `GET /.well-known/apple-app-site-association` → JSON for iOS Universal Links
- `GET /.well-known/assetlinks.json` → JSON for Android App Links
- `GET /code=:authCode` → response depends on User-Agent
  - **Unfurler bot** (Slack, WhatsApp, iMessage, Twitter, Facebook…) → `200` HTML with Open Graph / Twitter Card tags so the link unfurls into a branded preview. See [Link previews](#link-previews).
  - **iOS** (iPhone/iPad/iPod) → 302 to `https://apps.apple.com/app/id1605979547`
  - **Android** → 302 to `https://play.google.com/store/apps/details?id=com.simplycore_mobile`
  - **otherwise** → 302 to `https://www.simplycontrol.cz/simplyair`
- `GET /preview.png` → 1200×630 image used as `og:image` for the bot branch
- `GET /` → `{ service, status: "ok" }` health check

On a device with the app installed, the OS never lets the request reach
`/code=...` — Universal / App Links open the app directly. The redirect is
only for other contexts (desktop, devices without the app, in-app browsers
without universal link support).

## Testing scenarios

Cheat-sheet for the four common things you'll want to verify. Each scenario
links to the section with full setup details.

### 1. Smoke test (no tunnel) — see [Local dev](#local-dev)

```bash
npm install
npm run dev   # terminal 1, leave running

# in another terminal
curl -i http://localhost:3000/.well-known/apple-app-site-association
curl -I -A "Mozilla/5.0 (iPhone) Safari"  http://localhost:3000/code=test
curl -I -A "Mozilla/5.0 (Android) Chrome" http://localhost:3000/code=test
curl -s -A "Slackbot 1.0"                 http://localhost:3000/code=test | head -10
```

iPhone → `apps.apple.com`, Android → `play.google.com`, Slackbot → HTML with `og:title`.

### 2. Unit + integration tests

```bash
npm test          # 29 tests
npm run typecheck
```

### 3. Mobile Universal / App Links — see [Tunnels → Cloudflare](#cloudflare-tunnel) + [Mobile validation](#mobile-validation)

```bash
npm run dev       # terminal 1
npm run tunnel    # terminal 2 → copy https://<host>.trycloudflare.com
```

Wire the hostname into `simplycore-mobile` (`echo "<host>.trycloudflare.com" > .deeplink-domain`,
run `set-deeplink-domain.mjs`, `expo prebuild --clean`, `expo run:ios | run:android`),
then validate:

- **iOS:** Settings → Developer → "Associated Domains Development", then check the [Apple AASA validator](https://search.developer.apple.com/appsearch-validation-tool/).
- **Android:** `adb shell pm get-app-links com.simplycore_mobile` should report `verified`.
- **End-to-end:** generate a QR with `qrencode`, scan with the device camera. App opens directly when installed; otherwise redirects to the store.

### 4. Link previews (Slack / WhatsApp / iMessage / Meta) — see [Tunnels → ngrok](#ngrok) + [Link previews](#link-previews)

```bash
ngrok http 3000   # terminal 2 → copy https://<host>.ngrok-free.dev

# Ctrl-C terminal 1 and restart with:
PUBLIC_BASE_URL=https://<host>.ngrok-free.dev npm run dev

# verify the response shape
curl -s -A "Slackbot 1.0" https://<host>.ngrok-free.dev/code=check \
  | grep -E "og:url|og:image|og:title"
```

Then send fresh codes (`slack1`, `wa1`, `im1`, `fb1` — never reuse a code on the
same platform) to Slack DM, WhatsApp DM, iMessage on a real iPhone, and the
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).
Watch hits live at <http://127.0.0.1:4040>.

Meta surfaces (FB / Messenger / Instagram) generally won't preview on
`*.ngrok-free.dev` — see [Caveats](#caveats-when-testing-on-ngrok-free).

## Requirements

- Node 20+
- A tunnel for local dev — `cloudflared` (no signup) for mobile testing, `ngrok` (free signup) for link-preview testing. See [Tunnels](#tunnels-dev-only).

## Local dev

```bash
npm install
npm run dev       # watch mode on :3000
npm test          # vitest (29 tests)
npm run typecheck # tsc --noEmit
```

For ad-hoc `curl` checks, see [Testing scenarios](#testing-scenarios).

## Tunnels (dev only)

Universal / App Links require a publicly reachable HTTPS endpoint with a valid
CA cert — localhost and self-signed certs won't work. Two tunnels are
documented because each handles one thing the other doesn't:

| Use case | Tunnel | Why |
|---|---|---|
| Mobile (Universal / App Links) | `cloudflared` | No signup, fast |
| Link previews (Slack / WhatsApp / iMessage / Meta) | `ngrok` | Cloudflare quick-tunnels block known unfurler User-Agents at the edge with `403`, breaking previews |

Both produce ephemeral hostnames — the URL changes on every restart.

### Cloudflare tunnel

```bash
npm run tunnel    # prints https://<random>.trycloudflare.com
```

Propagate the hostname (without `https://`) into the mobile app:

```bash
# in the mobile repo (simplycore-mobile)
echo "<hostname>.trycloudflare.com" > .deeplink-domain
node scripts/set-deeplink-domain.mjs
# rewrites deeplinkDomain in src/env.json + app.json

npx expo prebuild --clean
npx expo run:ios     # or run:android
```

`.deeplink-domain` is gitignored. The script is idempotent — re-running it
overwrites the previous hostname.

### ngrok

```bash
brew install ngrok
ngrok config add-authtoken <token-from-dashboard.ngrok.com>   # one-time
ngrok http 3000   # prints https://<random>.ngrok-free.dev
```

Restart the dev server with `PUBLIC_BASE_URL` set so `og:url` and `og:image`
resolve to absolute URLs (see [Testing scenarios → Link previews](#4-link-previews-slack--whatsapp--imessage--meta--see-tunnels--ngrok--link-previews)).

ngrok's request inspector at <http://127.0.0.1:4040> shows every unfurler hit
with its UA — useful for diagnosing why a particular platform isn't previewing.

## Mobile validation

Once a build is installed via `expo run:ios` / `run:android` on a device using
the tunneled hostname, verify Universal / App Links wired up correctly.

**iOS:**
1. Settings → Developer → enable *Associated Domains Development* (without it
   Apple's CDN caches the AASA for hours).
2. Run the [Apple AASA validator](https://search.developer.apple.com/appsearch-validation-tool/)
   against your hostname — must pass green.

**Android:**
```bash
adb shell pm get-app-links com.simplycore_mobile
```
The host should report `verified`. `legacy_failure` means the SHA256 in
`assetlinks.json` doesn't match the build's signing certificate.

**End-to-end (either platform):** generate a QR code that encodes the link and
scan it with the device camera — same OS path as a tapped Universal / App Link.

```bash
brew install qrencode
qrencode -o /tmp/qr.png -s 10 "https://<host>/code=<authCode>"
open /tmp/qr.png
```

When the app is installed, the OS opens it directly. Without the app, the
service falls through to the store redirect.

## Link previews

When a `/code=...` URL is shared in a chat / email / social, the receiving
platform fetches it with its own bot User-Agent looking for Open Graph meta
tags. A bare 302 wouldn't unfurl into anything branded, so the route
content-negotiates on UA:

- **Bot UA matched by [`isUnfurlerBot()`](src/ua.ts)** — returns 200 HTML with
  full OG + Twitter Card markup (Czech copy, `og:locale=cs_CZ`, 1200×630
  `og:image` from `/preview.png`, `apple-itunes-app` for iMessage Smart Banner).
  Body has a `location.replace()` JS fallback in case a human ever lands here.
- **Anything else** — the existing 302 to App Store / Play Store / fallback,
  no added latency.

Static metadata lives in [`src/config.ts`](src/config.ts) under `preview`.
Title / description / image are edited there.

### Regenerating the preview image

`public/preview.png` is a 1200×630 card built from the SimplyControl logo with
macOS `sips`:

```bash
curl -sLo /tmp/logo.png https://simplycontrol.cz/wp-content/uploads/2022/07/cropped-SimplyControl_logo_stredni.png
sips --resampleWidth 1000 /tmp/logo.png --out /tmp/logo-big.png
sips -p 630 1200 --padColor FFFFFF /tmp/logo-big.png --out public/preview.png
```

Commit the regenerated PNG.

### Caveats when testing on ngrok-free

The HTML response has been validated end-to-end (curl + ngrok request
inspector), so the issues below are tunnel- or platform-side and resolve on a
production hostname without code changes:

- **Meta (Facebook / Messenger / Instagram)** generally won't preview
  `*.ngrok-free.dev` URLs — Meta either blacklists the domain or ngrok's free
  warning interstitial reaches the scraper.
- **Slack** sometimes suppresses `og:image` on unknown / fresh domains.
- **WhatsApp** caches per URL. A code first tested before `PUBLIC_BASE_URL` was
  set will keep showing that stale (`localhost`) preview indefinitely — always
  test new platforms with a fresh code.

## Production deployment

TBD — not addressed yet. What will be needed:

- A real domain and HTTPS cert (A/CNAME + TLS).
- A hosting service (Node runtime).
- SHA256 fingerprints in `assetlinks.json` for **every** build that should
  verify App Links (dev / EAS cloud / Play Store release). Currently only the
  dev keystore is in the repo.
- A strategy for the old Dynalinks QR codes already in circulation (migration
  is out of scope for this PoC).

## Configuration

Values are hardcoded in [src/config.ts](src/config.ts), with one env override.

| Value | Source |
|---|---|
| iOS Bundle ID | `com.simplycore.air` (mobile `app.json`) |
| iOS Team ID | `S3P45SYX2M` (mobile `app.json`) |
| iOS App Store ID | `1605979547` (App Store Connect) |
| Android Package | `com.simplycore_mobile` (mobile `app.json`) |
| Android SHA256 | debug keystore `android/app/debug.keystore` |
| `PUBLIC_BASE_URL` (env) | absolute base for `og:url` / `og:image`; defaults to `http://localhost:3000`. Must be set to the public hostname when serving real unfurlers. |

## Structure

```
simplycore-redirect-poc/
├── src/
│   ├── config.ts    # URL constants + preview metadata
│   ├── ua.ts        # User-Agent → platform + unfurler-bot detection
│   ├── preview.ts   # OG/Twitter HTML template
│   └── server.ts    # Fastify app + endpoints
├── public/
│   ├── .well-known/
│   │   ├── apple-app-site-association   # no .json (iOS requirement)
│   │   └── assetlinks.json
│   └── preview.png  # 1200×630 og:image card
├── test/
│   ├── ua.test.ts
│   └── server.test.ts
├── package.json
├── tsconfig.json
└── README.md
```
