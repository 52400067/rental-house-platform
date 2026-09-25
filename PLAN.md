# TROSV Productionization Plan

Branch: `productionize/hardening` · Created: 2026-09-26 · Status: living document

Goal: turn TROSV into a clean, debloated, secure, tested, production-grade full-stack
project **without changing the API contracts in `docs/`** and without changing intended
user-facing behavior.

---

## DO NOT TOUCH (contracts)

- `docs/API_CONTRACT.md` — routes, request/response shapes, status codes
- `docs/AI_CONTRACT.md` — AI proxy endpoint shapes
- `docs/ERD.md` — DB columns/tables referenced by the contracts
- ai-service/ stays a placeholder (no build-out). docker-compose must start cleanly without it.
- Bearer-token-in-localStorage auth transport stays (contract-level decision; revisit later)

## Baseline (measured 2026-09-26, branch `main` @ 5b4696a)

| Metric | Value |
|---|---|
| Backend routes (GET/POST/PUT/DELETE rows) | 43 |
| Frontend bundle (Vite 6.4.3) | index 114.4 KB JS (+29.1 gzip), vendor 391.1 KB JS (+125.6), leaflet 154.4 KB JS (+45.2), CSS: vendor 312.9 KB / index 32.8 KB; fonts+icons woff/woff2 ≈ 383 KB |
| Frontend deps | 11 runtime + 3 dev (npm audit: 0 vulns) |
| Backend deps | 5 prod + 7 dev direct (369 locked); composer audit: 3 advisories on laravel/framework (CRLF email rule ×2, signed-URL path confusion) — fix = bump to next 11.x |
| Frontend `src/` LOC | 8,344 |
| Backend `app/`+routes+database LOC | ~4,844 |
| Top files | theme.css 1,873 · ConversationDetail.jsx 738 · RoomDetail.jsx 578 · ListingForm.jsx 574 · Rooms.jsx 483 · AiController.php 444 · ListingController.php 314 · ConversationController.php 257 · LandlordListingController.php 236 |
| Tests | 14 PHPUnit files (runtime-blocked: no `rental_test` DB), Playwright scripts (not CI-grade) |
| CI / linting FE | none / none |

### Environment drift found during verification (vs. recon)

- Local CLI PHP is **8.5.10** (composer platform pin 8.3.14; Dockerfile 8.3 — fine for runtime, but local artisan runs on 8.5)
- **Postgres not running** in this environment and cannot be started (no passwordless sudo, docker socket denied) → `php artisan test` and EXPLAIN-based index work are **blocked on the user** (needs `rental_test` DB; see Phase 1)
- `frontend/node_modules` contains 31 root-owned leftovers (`node_modules/.vite/deps_temp_*`) that broke `npm ci`/`vite` locally; baseline build was produced from a shadow copy in /tmp. **User should run: `sudo rm -rf frontend/node_modules`** then `npm ci` (fresh install works)
- Untracked junk: root `.browser-check/` (screenshots), `skills-lock.json`, `.agents/`, `.claude/`, `.freebuff/`, `PROMPTS.md` (gitignored except .browser-check)
- docker socket: permission denied for this agent (user can run docker)

## Phase 0 — DONE (this commit)

- Recon re-verified; PLAN.md; branch created.

## Phase 1 — Safety net (next)

1. Unblock PHPUnit: document user steps to create `rental_test`; keep phpunit.xml forcing pgsql+`rental_test` (suite uses JSON operators → SQLite not safe).
2. `composer test` / `npm run test` scripts.
3. Characterization tests: ConversationController, LandlordListingController, AiController, auth flow.
4. Playwright `playwright.config.js` + `test:e2e:ci` (keep .browser-check scripts).
5. Internal `GET /api/health` (app + DB ping; **not** added to API contract).
6. Structured logging channel (JSON in production) + request-id middleware.

## Phase 2 — Debloat + optimize

Backend: drop `symfony/filesystem` (after zero-usage confirm); move `intervention/image` → require-dev (seeder-only); add missing indexes (messages(conversation_id, created_at/seen_at), listings(ward_id, price, status), favorites pivot, reviews(listing_id)); JSONB conversion migration for `messages.reactions`/`deleted_for_user_ids` (contract-checked; GIN if hot); kill N+1s (Conversation, Listing controllers); `Listing::nearby()` scope (behavior-identical Haversine); extract Services (AiService first); Form Requests for all write endpoints; Policies (Listing/Conversation/Message/Review) — also Phase 3/4 critical; events → `ShouldBroadcast` once queue driver decision lands; `.env.production.example` with Redis block (drivers stay `database` locally); pagination audit vs contract.
Frontend: ESLint (react/hooks/jsx-a11y) + Prettier + .editorconfig + .nvmrc (pin LTS); split ConversationDetail/RoomDetail/ListingForm/Rooms into hooks + domain components; shared `AiBubble` (kills AiChatWidget ↔ ConversationDetail duplication); `src/config/env.js` (single VITE_API_URL/REVERB source); router-aware 401 handling; theme.css → tokens/base/layout/components/pages (same import entry); leaflet usage check + code-split; bootstrap-icons footprint check; vite manualChunks re-check; proper frontend Dockerfile (multi-stage node→nginx, SPA fallback, security headers, cache headers) + nginx.conf; docker-compose: gate ai-service behind `profiles: [ai]`, add frontend + queue + scheduler services.

## Phase 3 — Bug + correctness audit

Form Request coverage of every write endpoint (types/lengths/enums/MIME/size); ownership checks everywhere (IDOR sweep — Conversation participant, LandlordListing owner, attachments, message deletion); seen/reaction idempotency + race safety (transactions); soft-delete semantics consistency (`isUnsent()` vs queries vs contract); re-verify JSON queries post-JSONB; signed-URL expiry + regeneration; timezone/ISO-8601 consistency (contract requires ISO-8601). Frontend: form double-submit protection + error display; async race conditions on route change (ConversationDetail); 401 redirect loops; logout state cleanup; a11y pass (focus management, aria-live toasts, keyboard nav). Regression tests for every fix.

## Phase 4 — Security

OWASP sweep; `gitleaks` config; production-safe fail-fast (APP_DEBUG=true && APP_ENV=production → refuse); Sanctum token abilities + revocation + expiration decision (documented); named rate limiters extended to all stateful endpoints; mass-assignment audit (`$fillable`; role NOT mass-assignable); raw SQL parameterization re-check; upload validation (MIME/size, stored outside webroot, original name never trusted); CORS: add FRONTEND_PREVIEW_URL to .env.example, keep no wildcards + supports_credentials=false; security headers middleware (+nginx): X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy, HSTS (prod only), Permissions-Policy, CSP (report-only first, Reverb ws:// compatible); broadcast channel auth tests; SECURITY.md (disclosure contact + threat model; note localStorage-token trade-off + httpOnly-cookie future option). Tools: composer audit, npm audit, gitleaks/semgrep/trivy if available.

## Phase 5 — Production structure

Root Makefile (`up/down/test/lint/build/migrate`); .editorconfig; .github/workflows/ci.yml (backend: composer install, pint --test, phpstan, artisan test vs Postgres service container, composer audit; frontend: npm ci, lint, build, npm audit, test:e2e:ci); PHPStan/Larastan level 5+ with baseline; pint.json explicit; .env.production.example; frontend src/ structure (components by domain, hooks/, lib/, config/); nginx/ configs (API + SPA); backend Dockerfile → multi-stage php-fpm + opcache + HEALTHCHECK (not artisan serve); Reverb as separate compose service (documented); deploy.sh marked local-demo-only; docs/DEPLOYMENT.md (target-agnostic VPS recipe); README English section; CONTRIBUTING.md; SECURITY.md; LICENSE (awaiting user choice — see Open questions). API_CONTRACT.md updated only for drift findings, marked for review.

## Phase 6 — Final verification

Full backend + frontend check matrix; docker compose smoke (health, listings, login, conversation, message send); baseline metric comparison; contract-drift confirmation; final report with residual risks + next steps (TS migration, httpOnly cookies/Sanctum SPA mode, ai-service implementation, deploy target).

---

## Open questions for the user (blocking or decision-needed)

1. **[Blocks tests] Create the test DB** (one-time):
   ```sql
   CREATE DATABASE rental_test OWNER rental;
   ```
   (`sudo -u postgres psql` or as your local Postgres admin). The suite also needs Postgres running.
2. **License** for LICENSE file (MIT? proprietary?) — not creating it until you say.
3. **Sanctum token expiry**: OK to set a finite expiration (e.g. 7–30 days) or must tokens be long-lived for the mobile/demo use case? (Documented decision either way; default: no expiry in this pass, documented.)
4. **CSP strictness**: start report-only (my default) or enforce from day one?
5. Anything off-limits besides the docs/ contracts?

## Residual risks (honest)

- Test suite has **never run in this environment**; characterization tests are unvalidated until the DB exists.
- `theme.css` split is cosmetic-risky (selector order/cascade). Mitigation: split in pure-append order, verify with the existing recolor-check Playwright script + visual smoke.
- Frontend splitting of the 4 god components risks subtle behavior drift; mitigation: characterization via Playwright scripts kept green, small commits.
- Local PHP 8.5 vs platform pin 8.3.14: artisan runs locally on 8.5 — syntax-level compatible, but CI will run 8.3.
- Bundle baseline taken from a /tmp shadow build (identical inputs); after user fixes node_modules ownership, numbers may shift by 0 bytes.
