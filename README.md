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
- `GET /code=:authCode` → 302 redirect based on User-Agent
  - iOS (iPhone/iPad/iPod) → `https://apps.apple.com/app/id1605979547`
  - Android → `https://play.google.com/store/apps/details?id=com.simplycore_mobile`
  - otherwise → `https://www.simplycontrol.cz/simplyair`
- `GET /` → `{ service, status: "ok" }` health check

On a device with the app installed, the OS never lets the request reach
`/code=...` — Universal / App Links open the app directly. The redirect is
only for other contexts (desktop, devices without the app, in-app browsers
without universal link support).

## Requirements

- Node 20+
- `cloudflared` (local dev only)

## Local dev

```bash
npm install
npm run dev       # watch mode on :3000
npm test          # vitest
npm run typecheck # tsc --noEmit
```

Sanity check:

```bash
curl -i http://localhost:3000/.well-known/apple-app-site-association
curl -i http://localhost:3000/.well-known/assetlinks.json

curl -I -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari" \
  "http://localhost:3000/code=test123"
# → Location: https://apps.apple.com/app/id1605979547

curl -I -A "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome" \
  "http://localhost:3000/code=test123"
# → Location: https://play.google.com/store/...
```

### Cloudflare tunnel (dev only)

Universal / App Links require a publicly reachable HTTPS endpoint with a valid
CA cert — localhost and self-signed certs will not work. For dev we use an
ephemeral Cloudflare Tunnel:

```bash
# in a new terminal; keep the service running
npm run tunnel
# → prints https://<random>.trycloudflare.com
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

`.deeplink-domain` is gitignored. The script is idempotent — subsequent runs
overwrite the previous hostname rather than the placeholder.

Cloudflare quick tunnels get a fresh hostname on every start, so this workflow
repeats every time the tunnel is restarted.

### Generating a test QR code

From the OS perspective, Universal / App Links behave the same as scanning a
QR code with the camera.

```bash
brew install qrencode
qrencode -o /tmp/qr.png -s 10 \
  "https://<host>/code=<authCode>"
open /tmp/qr.png
```

Scan with the camera of a second device, or send the link via Slack / iMessage
/ email and tap it.

### Validation

**iOS:**
1. Settings → Developer → enable "Associated Domains Development" (without it
   Apple's CDN caches the AASA for hours).
2. [Apple AASA validator](https://search.developer.apple.com/appsearch-validation-tool/) →
   enter the hostname → must pass green.

**Android:**
```bash
adb shell pm get-app-links com.simplycore_mobile
```
The host should be `verified`. If it shows `legacy_failure`, check the SHA256
in `assetlinks.json` against the build's signing certificate.

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

Values are hardcoded in [src/config.ts](src/config.ts).

| Value | Source |
|---|---|
| iOS Bundle ID | `com.simplycore.air` (mobile `app.json`) |
| iOS Team ID | `S3P45SYX2M` (mobile `app.json`) |
| iOS App Store ID | `1605979547` (App Store Connect) |
| Android Package | `com.simplycore_mobile` (mobile `app.json`) |
| Android SHA256 | debug keystore `android/app/debug.keystore` |

## Structure

```
simplycore-redirect-poc/
├── src/
│   ├── config.ts   # URL constants
│   ├── ua.ts       # User-Agent → platform
│   └── server.ts   # Fastify app + endpoints
├── public/.well-known/
│   ├── apple-app-site-association   # no .json (iOS requirement)
│   └── assetlinks.json
├── test/
│   ├── ua.test.ts
│   └── server.test.ts
├── package.json
├── tsconfig.json
└── README.md
```
