# Model Drops

A light-themed character marketplace and AI creation studio. This repository includes a working private preview and a separate PostgreSQL production foundation. **It is not a production-ready paid marketplace yet.**

## Deploy with Vercel

Import this GitHub repository into Vercel and select Next.js. The checked-in `vercel.json` selects `npm run build:vercel` automatically. Use Node 24 and configure the Supabase database, authentication, and private storage environment variables in Vercel before deploying. Secrets are intentionally excluded from this repository.

See [Vercel deployment and migration](docs/VERCEL-PREVIEW.md) for the complete setup, database migration commands, and authentication redirects. The Vercel backend uses Supabase Postgres and private S3-compatible storage; the original Sites preview continues to use D1/R2.

## Run the Sites preview

Requires Node 22.13+ (Node 24 LTS recommended).

```sh
npm ci
npm run build
for migration in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$migration"
done
npm run dev -- --port 5173
```

Open http://localhost:5173. Configure Supabase using [the activation guide](docs/SUPABASE-SETUP.md). Without configuration, sign-in is visibly unavailable and protected routes reject all identities. The old local mock login and ChatGPT identity headers no longer grant application access. Apply each migration once per database. No private credentials are committed.

## Working preview

- Supabase email/password signup and sign-in, Google OAuth, email confirmation, password reset, HttpOnly session refresh, sign-out, protected routes and a personal dashboard. Provider setup is required before live use.
- Dashboard with owned characters, saved license receipts, credits, projects, recent creations, and one-click continuation in the image/video studio.
- Discover, searchable/filterable marketplace, character details, favorites, persistent ownership, immutable demo license snapshots.
- Real image/video generation through server-side provider adapters, native character references, server-calculated credits, durable jobs, private outputs, refunds, and administrator recovery. Local QA explicitly mocks provider calls.
- Projects and media assignment, history, notifications, profile/privacy preferences.
- Creator concept submissions, rights attestation, reporting, role-gated model pricing and moderation tools.
- Credit package preview, an append-only ledger, and demo-credit character purchases for invited testers. Real payment processing remains deferred; **no money is charged**.
- Responsive shadcn/Radix interface and a validated WebMCP character search tool.

Hosted demos can spend real generation API balance. The isolated `npm run demo:local` harness uses bundled sample media and never contacts a provider. Character generation attaches the purchased portrait version through a temporary signed URL. Uploading a new portrait does not replace an existing buyer's version.

Configure `SUPER_ADMIN_USER_IDS` with verified application user IDs. Super administrators approve tester emails, allocate demo credits, review character image/video examples, and recover uncertain generation requests. New demo accounts receive zero automatic credits. The checked-in `/api/jobs` cron accepts `CRON_SECRET` or `JOB_RUNNER_SECRET` and processes generation recovery, training-email retries, and storage cleanup. See [demo setup and migration](docs/DEMO_TESTING.md).

## Production foundation

`production/migrations/001_platform.sql` contains a normalized PostgreSQL baseline with UUIDs, foreign keys, indexes, private character versions/bindings, financial snapshots, moderation, social, payout and project entities. It is **separate from the preview database**.

`production/services` contains transactional generation reservation, a PostgreSQL `SKIP LOCKED` queue consumer, Stripe Checkout creation and signed webhook fulfillment, immutable wallet writes, pricing, and seller split calculations. `production/providers` contains server-only WaveSpeed and OpenRouter adapters. These are tested building blocks, not connected to the preview routes or live credentials.

See [Supabase activation](docs/SUPABASE-SETUP.md), [launch services](docs/LAUNCH-SERVICES.md), [architecture](docs/ARCHITECTURE.md), [scope and launch work](docs/IMPLEMENTATION-STATUS.md), and [artwork sources](docs/ASSET-SOURCES.md).

## Validate

```sh
npm run typecheck
npm test
python3 tests/ledger-invariants.py
python3 tests/auth-boundary.py  # built local server on port 8787; Supabase intentionally unconfigured
npm run build
# Optional: with the built worker running locally on port 8787:
python3 tests/user-isolation.py # requires two confirmed Supabase test users; see script
```

The integration test writes clearly named sample records into the local demo database. Never point it at a production service. PostgreSQL tests run in an isolated, in-memory PGlite instance and make no external API calls.

## Manual LoRA training

Train LoRA, My LoRAs, and administrator training operations are implemented. See [LoRA workflow and setup](docs/LORA-TRAINING.md) for admin access, private uploads, manual delivery, email notification configuration, and future training adapters.
