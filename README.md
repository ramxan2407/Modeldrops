# Model Drops

An original dark-first character marketplace and AI creation studio. This repository includes a working private preview and a separate PostgreSQL production foundation. **It is not a production-ready paid marketplace yet.**

## Run the preview

Requires Node 22.13+ (Node 24 LTS recommended).

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_optimal_george_stacy.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_ledger_guards.sql
npm run dev -- --port 5173
```

Open http://localhost:5173. Local Sites sign-in creates a test-only identity. Hosted identity is supplied by the trusted Sites dispatcher. Do not expose this development server to the public internet. Apply each migration once per database. No private credentials are committed.

## Working preview

- Dedicated ChatGPT sign-in and sign-out, protected routes, safe return destinations, and a personal dashboard for each authenticated user.
- Dashboard with owned characters, saved license receipts, credits, projects, recent creations, and one-click continuation in the image/video studio.
- Discover, searchable/filterable marketplace, character details, favorites, persistent ownership, immutable demo license snapshots.
- Image and video workflow controls, prompt enhancement, references, server-calculated credits, queued background **simulations**, protected R2 output, refunds, retries, cancellation, and remix.
- Projects and media assignment, history, notifications, profile/privacy preferences.
- Creator concept submissions, rights attestation, reporting, role-gated model pricing and moderation tools.
- Credit package preview and append-only credit ledger. Checkout deliberately returns unavailable; **no money is charged**.
- Responsive shadcn/Radix interface and a validated WebMCP character search tool.

Demo output uses the Nova sample image regardless of prompt, selected character, resolution, or output count. Video mode returns a labeled storyboard preview, not an actual video. References are stored privately but are not submitted to any AI provider. The interface displays these workflows as simulations.

For administration, configure the server-side `ADMIN_USER_IDS` allowlist with trusted Sites user IDs. No user can promote themselves through the browser. `POST /api/jobs` accepts only the configured `JOB_RUNNER_SECRET`; a scheduler can use it to recover interrupted demo jobs.

## Production foundation

`production/migrations/001_platform.sql` contains a normalized PostgreSQL baseline with UUIDs, foreign keys, indexes, private character versions/bindings, financial snapshots, moderation, social, payout and project entities. It is **separate from the preview database**.

`production/services` contains transactional generation reservation, a PostgreSQL `SKIP LOCKED` queue consumer, Stripe Checkout creation and signed webhook fulfillment, immutable wallet writes, pricing, and seller split calculations. `production/providers` contains server-only WaveSpeed and OpenRouter adapters. These are tested building blocks, not connected to the preview routes or live credentials.

See [architecture](docs/ARCHITECTURE.md), [scope and launch work](docs/IMPLEMENTATION-STATUS.md), and [artwork sources](docs/ASSET-SOURCES.md).

## Validate

```sh
npm run typecheck
npm test
python3 tests/ledger-invariants.py
python3 tests/preview-api.py  # needs the local development server and migrations
npm run build
# Optional: with the built worker running locally on port 8787:
python3 tests/user-isolation.py
```

The integration test writes clearly named sample records into the local demo database. Never point it at a production service. PostgreSQL tests run in an isolated, in-memory PGlite instance and make no external API calls.
