# Local production audit — 2026-10-05

The local audit is complete and the reproducible defects below are fixed in the working tree. No deployment, production account changes, paid generations, or production database/storage writes were performed. This is not a certification that the paid marketplace is ready to launch.

## Fixes

| Finding | Change | Verification |
| --- | --- | --- |
| Valid browser requests could receive HTTP 403 when Next's internal URL used `localhost` but the browser used `127.0.0.1` or a canonical public hostname. Sign-out could redirect to the internal hostname. | Authentication, workspace mutations, reference uploads, and LoRA uploads now share an exact origin check using trusted `APP_ORIGIN`. Forwarded headers cannot override it. Sign-out uses the already-validated browser origin. | New origin regression tests; authenticated route fixtures with deliberately different internal and public hostnames; actual `next start` HTTP checks. |
| Missing `WELCOME_CREDITS` silently awarded 1,840 persisted credits while generation was disabled. Those credits could later become spendable on a real provider. | The default is now zero regardless of provider configuration. Promotions require an explicit value, and existing welcome grants remain idempotent. | New SQLite and PostgreSQL tests cover missing configuration, provider activation, explicit promotions, and repeat initialization. |
| The sign-in form allowed switching to password reset while an authentication request was pending, allowing the old request to finish in the wrong form. | Mode changes, Forgot password, and Back to sign in are disabled while submitting. | Reproduced with a delayed local mock response; verified both directions are blocked and controls recover after an error. |
| Scheduler endpoints accessed database configuration before checking the scheduler secret, producing storage errors for unauthenticated callers. | Generation recovery and training-email endpoints authenticate before resolving storage bindings. | Production HTTP checks return 401 with no credentials, even when storage is unconfigured. |

Added `npm run start:vercel` so the optimized Next build can be served locally without starting the Cloudflare development runtime.

## Dependency findings

The user approved sending package names and versions to npm's official vulnerability registry. The initial `npm audit --omit=dev` returned one critical and two moderate findings. Compatible updates were applied with the lockfile retained:

| Package | Before | After |
| --- | --- | --- |
| Next.js / eslint-config-next | 16.3.4 | 16.3.8 |
| baseline-browser-mapping | 2.10.30 | 2.11.27 |
| fast-uri | 3.1.7 | 3.1.8 |

The Next.js advisory concerns attacker-controlled SVG data passed to Node.js `next/og` ImageResponse. No `next/og` or ImageResponse usage was found in the application source; an exploitable application path was not established. The vulnerable package was nevertheless upgraded. [Next.js advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j).

The two moderate findings concern invalid-input termination in baseline-browser-mapping and host normalization in fast-uri. [baseline-browser-mapping advisory](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv), [fast-uri advisory](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj).

The final production dependency audit reports **zero known vulnerabilities**. This result is limited to the registry's current advisories and the production dependency graph; it does not prove absence of application vulnerabilities.

## Verification results

| Check | Result |
| --- | --- |
| Optimized Next.js 16.3.8 build, `npm run build:vercel` | Passed, including TypeScript and all prerendered pages |
| `npm run typecheck` | Passed |
| `npm test` | 89 tests passed, zero failures (including demo wallet regressions) |
| Production HTTP authentication/origin script | 39 checks passed |
| Ledger invariant script | 5 checks passed |
| Local HTTP smoke | 13 public pages, 15 protected redirects, two 404 routes, character handoff, private cache policy, and 26 referenced static assets passed |
| Lint for changed runtime files and new origin tests | Passed |
| Repository lint, excluding build outputs and ignored `work/` test artifacts | Passed: zero errors. 23 existing image-optimization warnings remain. |
| `git diff --check` | Passed |
| `npm audit --omit=dev` after patching | Zero known vulnerabilities |

The automated route tests use isolated in-memory SQLite and PostgreSQL/PGlite databases. They exercise account isolation, suspension, super-admin versus training-admin permissions, character permissions, production-disabled test checkout, server-owned character references, duplicate submission prevention, credit reservation/refunds, uncertain provider submissions, failed output storage, generation recovery, private media access, LoRA dataset validation, manual delivery, ZIP downloads, and email outbox retries. External generation, storage and email responses are mocked. Tests for the separate `production/` service foundation do not mean those payment services are wired into the running app.

Browser checks covered desktop and mobile public navigation, empty model search and character details, prompt presets, mobile menu dismissal with Escape, character-specific login return paths, workflow tabs, light/dark mode, and reduced motion. No horizontal document overflow was observed at 320px or 390px, and no console errors were observed in the public-page checks. This was browser viewport testing, not testing on physical iOS/Android devices or load testing.

A separate, ignored UI harness exercised the actual Studio and login components with fictional accounts. Studio selected the latest ready purchased character by default, excluded a preview-only claim, retained a selected character across image/video modes, displayed the image quote, changed a five-second video from 120 to 180 credits with sound, blocked incomplete shot plans, blocked generation without purchased characters, and recovered after an intentional mock submission failure. The fixture's displayed prices are UI test values; live provider prices were not fetched. This harness is not an authentication bypass in the application.

## Remaining release gates

1. Lint failures are fixed in the follow-up demo work without suppressing application rules. Existing native image elements still produce 23 optimization warnings. See [Demo testing](DEMO_TESTING.md) for the local runner and explicit demo-wallet configuration.
2. Real payment checkout is still disconnected. The explicit `DEMO_MODE` flow purchases approved characters with a separate demo wallet; these are not paid entitlements. Legacy free test checkout remains blocked in Vercel production. Do not open paid sales until processor checkout, fulfillment, refunds and reconciliation are verified.
3. The five launch characters still require approved portraits and reviewed output examples. Placeholder public cards are intentional; they do not demonstrate production identity consistency.
4. No real Supabase sign-in/Google OAuth, paid image/video generation, storage integration, SMTP delivery or deployed scheduler execution was tested in this local run. Validate these with isolated test accounts and services before release. A separate email recovery scheduler is not declared in `vercel.json`; confirm an authenticated external invocation of `/api/lora/email` before relying on automatic outbox retries.
5. Historical balances were not inspected or changed. Before enabling real spending for a previously demo-backed database, review any earlier automatic 1,840-credit grants. Use audited ledger adjustments if corrections are required.
6. Keep `APP_ORIGIN` set to the intended browser-facing origin. This update deliberately does not trust arbitrary Host or forwarded-host headers. Configure preview services and origins separately from production.

The local build was run with live service credentials excluded. Disabled login on that local build is the expected configuration state, not evidence of a production sign-in failure.

## Repeating the local checks

Use Node.js 22.13 or newer. Do not load `.env.vercel.local` or point fixture scripts at live services.

```sh
npm test
npm run typecheck
npm run build:vercel
APP_ORIGIN=http://127.0.0.1:4175 npm run start:vercel -- --hostname 127.0.0.1 --port 4175
```

In a second terminal, with Supabase intentionally unconfigured on the local server:

```sh
MODEL_DROPS_TEST_ORIGIN=http://127.0.0.1:4175 python3 tests/auth-boundary.py
python3 tests/ledger-invariants.py
```

Local logs, the extra HTTP smoke script, the UI fixture and the mobile screenshot are in ignored `work/local-audit/`. These artifacts contain test-only identities and are not part of the deployed application.
