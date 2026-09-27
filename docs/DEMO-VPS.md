# TROSV on a VPS - quick demo guide

Goal: public demo with ~4 commands. Uses the same Docker stack as dev,
plus `docker-compose.demo.yml` which publishes public ports and bakes
public URLs into the frontend bundle.

> This is a DEMO setup: public demo passwords, seeded data. Do not use
> real data. Option A below is plain HTTP; Option B adds automatic
> HTTPS via Caddy. Either way, change all credentials before any
> long-lived deployment.

## 0. Requirements

- Any VPS (Ubuntu 22.04/24.04, 2 GB RAM is enough).
- Docker + the compose plugin:

```bash
curl -fsSL https://get.docker.com | sh
```

- A domain or subdomain pointed at the VPS IP (e.g. `demo.example.com`),
  or just the raw IP if you accept a browser "not secure" warning.

## 1. Get the code + config

```bash
git clone <your-repo-url> trosv && cd trosv
git checkout stable
```

The GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) runs this
same sequence on every push to `stable` (only after CI is green on the same
commit): it resets the checkout to the pushed SHA and runs
`docker compose up -d --build`, then health-checks the API. Once the
`production` environment secrets are configured, manual deploys are only
needed for the very first boot (`.env` creation).

Create `.env` in the repo root (compose reads it automatically):

```dotenv
# Public URL of the site (HTTPS if you later add TLS)
FRONTEND_URL=http://demo.example.com
# WebSocket host the BROWSER connects to (same domain, port 8080)
WS_HOST=demo.example.com
# Generated below; or generate anywhere with: php artisan key:generate --show
APP_KEY=
REVERB_APP_ID=my-app-id
REVERB_APP_KEY=my-app-key
REVERB_APP_SECRET=my-app-secret
```

Generate `APP_KEY` (no PHP needed on the VPS - use any docker one-liner):

```bash
echo "APP_KEY=$(docker run --rm php:8.3-cli php -r 'echo "base64:".base64_encode(random_bytes(32));')" >> .env
```

## 2. Option A - build and start (one command, plain HTTP)

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build
```

First build takes a few minutes. The backend container then runs
`migrate --force && db:seed --force && storage:link` automatically, so
the demo data exists on first boot.

Watch first-boot until you see your seed output:

```bash
docker compose logs -f backend
# (Ctrl+C when it shows `php artisan serve` running)
```

## 3. Open the firewall ports

On the VPS provider dashboard (or ufw): allow **80** (web) and **8080**
(WebSocket). Port 8000 is the API the browser calls directly, so allow
it too:

```bash
sudo ufw allow 80,8000,8080/tcp
```

## 4. Verify

| URL | What |
|---|---|
| `http://demo.example.com` | The site (nginx serving the built bundle) |
| `http://demo.example.com:8000/api/health` | API health, should return JSON |
| `ws://demo.example.com:8080` | Realtime (used by chat automatically) |

Log in with the seeded demo accounts (password: `password`):

- `student1@example.com` - student view
- `landlord1@example.com` - landlord view

Open two different browsers (or one normal + one incognito), login as
each, start a chat from a room page, and check the message + unread
badge arrive in realtime.

## Cheatsheet

```bash
# See all statuses
docker compose ps

# Tail logs
docker compose logs -f backend frontend reverb

# Wipe the DB and reseed (demo data again from scratch)
docker compose exec backend php artisan migrate:fresh --seed --force

# Update to the latest commit and restart
git pull
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build

# Full stop and cleanup (removes the database volume too)
docker compose -f docker-compose.yml -f docker-compose.demo.yml down -v
```

## Option B - automatic HTTPS with Caddy (recommended for a real demo)

Same stack, one domain, one port. The browser only talks to
`https://$DOMAIN` - Caddy terminates TLS, serves the SPA, proxies `/api`
to the backend and `/app/*` to Reverb (`wss://`, no mixed content, no
custom ports). Certificates are issued and renewed automatically; you
only need a DNS A record and ports **80 + 443** open.

Create `.env` with **HTTPS** values:

```dotenv
DOMAIN=demo.example.com
FRONTEND_URL=https://demo.example.com
WS_HOST=demo.example.com
APP_KEY=base64:...
REVERB_APP_ID=my-app-id
REVERB_APP_KEY=my-app-key
REVERB_APP_SECRET=my-app-secret
```

One command (the extra `-f` and `--profile tls` are the only difference
from Option A):

```bash
docker compose -f docker-compose.yml -f docker-compose.tls.yml \
  --profile tls up -d --build
sudo ufw allow 80,443/tcp
```

URLs on this mode: `https://demo.example.com` (site),
`https://demo.example.com/api/health` (API). Chat uses
`wss://demo.example.com/app/<key>` automatically - no port 8080.

The Caddyfile is mounted, not baked, so a domain change is just:

```bash
# edit .env, then
docker compose -f docker-compose.yml -f docker-compose.tls.yml \
  --profile tls up -d --build frontend backend
docker compose --profile tls restart caddy
```

## Phase 4 security hardening - what to expect

The backend now ships with production guards (see `SECURITY.md`). None of
them require extra setup - the demo compose file already sets the right
values - but they change what you see when something is wrong:

- **Fail-fast on unsafe config.** With `APP_ENV=production`, the backend
  refuses to serve if `APP_DEBUG=true` or `APP_KEY` is empty: every request
  gets a generic 500 (`{"message":"Lỗi máy chủ."}`) and the precise reason
  goes to the log as `Refusing to serve: ...`. Check
  `docker compose logs backend`. Both values are already correct in
  `docker-compose.demo.yml` (`APP_DEBUG: "false"`, required `APP_KEY`), so
  if the container boots, the config is safe.
- **CSP is enforcing.** JSON and file responses carry
  `default-src 'none'; frame-ancestors 'none'`; the backend's one HTML page
  (the welcome view) has a tuned policy allowing its bunny.net fonts and
  laravel.com images. If you ever add external scripts/styles/images to
  `resources/views/welcome.blade.php`, extend that policy in
  `app/Http/Middleware/SecurityHeaders.php` or the browser will block them
  (visible in the browser console as CSP violations). The SPA itself is
  served by nginx and is not affected.
- **Login tokens expire after 30 days.** Demo users get logged out after
  that and simply log in again. Tune with `SANCTUM_TOKEN_TTL_MINUTES`
  (minutes) if needed.
- **Reverse-proxy trust is opt-in.** Option B (TLS profile) already sets
  `TRUSTED_PROXIES: "*"` on the backend automatically - rate limiting and
  logs then show the real client IP. On Option A (or any setup where the
  browser reaches the backend directly) leave it unset: honoring
  `X-Forwarded-For` from direct clients would let anyone rotate IPs past
  the rate limiter.

Quick sanity check after boot:

```bash
curl -sI http://localhost:8000/api/health | grep -iE 'content-security|x-content-type|x-frame'
# expect: CSP "default-src 'none'; frame-ancestors 'none'", nosniff, DENY
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/api/cities
# expect: 200 (if this is 500 for EVERY endpoint, see the log line above)
```

## Common gotchas

- **Chat doesn't go realtime / badge never increments** - the browser
  must reach the WebSocket. Plain HTTP mode: reverb published on
  `0.0.0.0:8080->8080` (check `docker compose ps`) and the firewall
  allows 8080. HTTPS mode: `wss://$DOMAIN/app/*` through Caddy - check
  the caddy container is up and ports 80/443 are open.
- **API calls fail with CORS errors** - `FRONTEND_URL` in `.env` must
  be *exactly* the origin in the browser address bar (scheme + host,
  no trailing slash), then rebuild: `up -d --build backend frontend`.
- **Caddy can't get a certificate** - the DNS A record must point at
  this VPS *before* first start, and port 80 must be reachable from the
  internet (Let's Encrypt HTTP-01 challenge). `docker compose logs caddy`
  shows the ACME error if it keeps failing.
- **Login redirects but every page is empty** - `APP_KEY` changed
  between boots (sessions/cookies invalidated). Keep `.env` stable.
- **Images vanish after `down`** - uploads live in the `trosv-storage`
  volume; `down -v` deletes it. Only `down` keeps them.
- **Frontend shows localhost URLs** - the frontend bundle bakes
  `VITE_*` at build time; after changing `.env`, you must rebuild the
  frontend image, not just restart it.
- **Every API request returns 500 `Lỗi máy chủ.`** - the Phase 4 fail-fast
  is refusing to serve an unsafe production config (`APP_DEBUG=true` or
  empty `APP_KEY`). `docker compose logs backend` shows the exact line
  `Refusing to serve: ...`; fix `.env` and recreate the backend container.
