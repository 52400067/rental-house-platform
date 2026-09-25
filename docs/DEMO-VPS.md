# TROSV on a VPS — quick demo guide

Goal: public demo with ~4 commands. Uses the same Docker stack as dev,
plus `docker-compose.demo.yml` which publishes public ports and bakes
public URLs into the frontend bundle.

> This is a DEMO setup: plain HTTP, public demo passwords, seeded data.
> Do not use real data. For a long-lived deployment, add TLS (Caddy or
> nginx + certbot) and change all credentials.

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
git checkout productionize/hardening
```

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

Generate `APP_KEY` (no PHP needed on the VPS — use any docker one-liner):

```bash
echo "APP_KEY=$(docker run --rm php:8.3-cli php -r 'echo "base64:".base64_encode(random_bytes(32));')" >> .env
```

## 2. Build and start (one command)

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

- `student1@example.com` — student view
- `landlord1@example.com` — landlord view

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

## Common gotchas

- **Chat doesn't go realtime / badge never increments** — the browser
  must reach `WS_HOST:8080`. Check `docker compose ps` shows reverb on
  `0.0.0.0:8080->8080` and that the firewall allows 8080.
- **API calls fail with CORS errors** — `FRONTEND_URL` in `.env` must
  be *exactly* the origin in the browser address bar (scheme + host,
  no trailing slash), then rebuild: `up -d --build backend frontend`.
- **Login redirects but every page is empty** — `APP_KEY` changed
  between boots (sessions/cookies invalidated). Keep `.env` stable.
- **Images vanish after `down`** — uploads live in the `trosv-storage`
  volume; `down -v` deletes it. Only `down` keeps them.
- **Frontend shows localhost URLs** — the frontend bundle bakes
  `VITE_*` at build time; after changing `.env`, you must rebuild the
  frontend image, not just restart it.
