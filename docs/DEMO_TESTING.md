# Model Drops demo testing

The demo supports **super-admin approval → credit purchase → purchased-character selector → image/video generation → private results**. Real payment collection remains disabled.

## Run an isolated local demo

With Node 22.13+ and dependencies installed:

```sh
npm run demo:local
```

Open http://127.0.0.1:4176/marketplace. The QA bar switches between Buyer, Super admin and Second buyer. These are fictional local identities, not a Supabase login bypass in the application. The harness only listens on loopback, refuses a production/Vercel environment, and never reads a production environment file. Its in-memory database and account data reset when stopped.

1. Valentina is pre-approved for a quick demo purchase. To test approval, switch to **Super admin → Characters → Edit Isla**. A bundled test portrait is staged; save Pending, generate an example using every offered engine in Studio as the super admin, inspect each output, then select those examples and approve. Local samples exercise the workflow only.
2. Switch to **Buyer**, open Valentina, review access, accept the demo terms and buy for **300 credits**. The harness-assigned **2,000 demo credits** become **1,700**.
3. Studio opens with Valentina selected. Image and video tools attach her approved reference on the server. The selector contains only characters that this account has access to.
4. Generate an image (12 credits in the mock quote) or a 5-second silent video (120 credits). View private results and credit activity.
5. **Second buyer** has a separate wallet and library. In **Super admin → Users**, adjust a user's demo credits with an audited reason.

**All provider requests in this local harness are simulated.** Outputs reuse bundled sample media; they do not demonstrate AI output quality or character likeness. No API balance or real money is spent. The harness invokes the application's actual checkout, approval, wallet, generation and media routes against its isolated database. It is not a deployment entrypoint.

## Local testing with real generation

`npm run demo:live` starts a second workspace at **http://127.0.0.1:4177/studio?character=valentina**. It uses the real application routes and WaveSpeed API. The original port 4176 remains simulated.

Before the first start, save the desired portrait in the simulated demo's Valentina slot (renaming her is supported). The live workspace imports that saved candidate once. Later portrait edits should be made in the live workspace's own admin dashboard; restarting never overwrites its character or grants another 5,000 credits.

The ignored `.env.vercel.local` supplies `WAVESPEED_API_KEY` and the `STORAGE_*` credentials. Production `DATABASE_URL`, Supabase sessions and email credentials are excluded from this runtime. Its single local super-admin identity is for loopback QA only. Do not deploy or expose this server through a tunnel.

The banner distinguishes real generation from simulated output. The admin receives **5,000 demo credits**, while actual API requests spend the configured provider balance. The server enforces a **$1 cumulative reservation cap**, with the same daily and user limits. The fixed cap is intentionally separate from production environment settings.

Jobs, credits and request IDs persist in ignored `work/local-live/workspace.sqlite`. Objects are private and prefixed with a unique `local-live/<workspace-id>/` path. Keep this directory to retain paid-job history and the cap across restarts; deleting it is not a supported budget reset. Background polling resumes existing jobs and never blindly repeats an uncertain submission. Stop with Ctrl+C, restart with the same command.

Imported candidates stay Pending. Real super-admin examples can be reviewed for approval; synthetic QA examples from port 4176 are not copied. This runtime verifies generation and delivery, not production Supabase sign-in or buyer authentication.

## Enable the same flow in a chosen hosted demo environment

Do not point a separate preview at production data by default. Configure its own Supabase Auth/database and private storage first.

1. Apply migrations before deploying these routes. Existing PostgreSQL workspaces with migrations 001–005 use:

   ```sh
   node --env-file=.env.demo.local scripts/migrate-demo-credits.mjs
   ```

   Then apply `node --env-file=.env.demo.local scripts/migrate-demo-readiness.mjs` (Postgres migration 007). D1 also requires `drizzle/0009_demo_readiness.sql`.

   The operator supplies the selected demo database's `DATABASE_URL` in the ignored file. This script applies `migrations/vercel/006_demo_credits.sql` transactionally and can be rerun. Fresh workspaces use `scripts/migrate-vercel.mjs`. Cloudflare/D1 workspaces also need `drizzle/0008_demo_credits.sql` after previous migrations.

2. Set server variables:

   ```dotenv
   DEMO_MODE=true
   DEMO_WELCOME_CREDITS=0
   GENERATION_USER_DAILY_LIMIT_USD=2
   DEMO_TOTAL_LIMIT_USD=25
   GENERATION_REQUESTS_PER_MINUTE=6
   WELCOME_CREDITS=0
   SUPER_ADMIN_USER_IDS=<verified-Supabase-admin-user-id>
   APP_ORIGIN=https://your-demo-host
   ```

   Keep existing Supabase and private storage settings. New accounts receive no automatic demo credits, even if an old welcome-credit variable remains configured. In Super admin → Users approve the tester email first; after their first sign-in, assign credits with an audited reason. Existing balances remain intact. Admin adjustments use the active demo wallet. Demo character prices default to 300 and are editable in Characters. Training admins and ordinary users cannot approve characters or adjust credits.

3. Save a fictional adult portrait as Pending in **Super admin → Characters**. Open Studio as the super admin and generate one example with every enabled image and video engine. Review the outputs, select the corresponding examples in the character editor, confirm the fictional-adult declaration, and approve. This publishes a public portrait preview; datasets and generated customer media remain private. Candidates cannot be purchased. Existing buyers keep their approved version while a replacement is being tested. Explicit rejection of a version or disabling the character stops its new generation requests.
4. For actual image/video output, configure the existing `WAVESPEED_API_KEY`, `WAVESPEED_ENABLED=true` and an appropriate `WAVESPEED_DAILY_LIMIT_USD`. Provider credentials stay on the server. **Real generation in a hosted demo spends API balance even though the user's credits are demo credits.** Without a connected provider the app uses its explicitly labeled sample-generation tools.

Demo balances have a separate `wallet='demo'` ledger. Existing balances remain `standard`. Purchases record the actual demo credits spent and grant a non-payment test entitlement atomically. Failed or concurrent insufficient-balance purchases leave no partial order. Repeated checkout keys cannot double charge. Generation records its wallet so failures refund the same wallet even after demo mode changes. Turning off demo mode hides that balance and disables demo-purchased access; it does not convert either into paid credits or a paid license.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build:vercel
```

`tests/demo-credits.test.ts` runs the full server flow against SQLite and isolated PostgreSQL (PGlite), with mocked provider submissions/output. It covers approval permissions, missing portraits, price tampering, duplicate checkout, demo top-ups, account isolation, approved reference routing for image/video, private media, approval withdrawal, concurrent purchases and generation reservations, first-login top-ups, disabling demo mode and exactly-once refunds to the original wallet. The broader suite covers authentication, jobs, LoRA training, storage and existing credit behavior.

## Versions, recovery and budgets

Orders freeze the purchased portrait version. The library offers an explicit free portrait upgrade after the replacement passes review. Already queued requests retain their original version. Historical purchases had no portrait snapshot: migration 007 preserves the currently associated approved portrait, without claiming it reconstructs the historical purchase. These migrated versions can serve existing buyers, but new sales require reviewed examples.

Default limits are $5 shared estimated daily provider reservations, $2 per user daily, $25 cumulative demo reservations, six requests per user per minute, and three concurrent jobs. Outstanding reservations survive UTC midnight. Limits are server-side and atomic; provider billing remains authoritative. Increasing the total demo cap is an explicit operator decision. Each hosted QA generation also spends provider funds.

Super admin → Integrations lists jobs requiring review first. Check the provider console and record findings. Resume validates the saved or recovered request ID and polls it without another paid submission. Close/refund returns credits to the original wallet exactly once while preserving uncertain provider spend in the budget. Unknown outcomes are never automatically resubmitted.

The authenticated jobs cron retries training-email delivery in bounded batches and private-object cleanup after metadata deletion. Storage failures retain a retry record. The same cron sweeps expired signed-upload staging objects for every account after a five-minute processing grace period, including claimed URLs that were replayed. Active uploads are preserved. It does not discover unrelated historical orphan files or impose a new dataset retention period. Verify the cron and email sender in the selected deployed environment before inviting testers.

### Local regression fixes

The local demo registers the same transfer, training file, and ZIP routes as the app. Submit at least 15 local sample images, verify Pending Review in My LoRAs, then use Super admin to preview/download the dataset. Generated video thumbnails use video elements with stored MIME metadata. No provider traffic leaves this harness.

Reference uploads are limited to 50 per rolling 24 hours, not 50 for an account's lifetime. Historical and purchased portraits remain intact. Marketplace price ordering and free filtering use the active wallet's displayed character price.

Apply the readiness migration before deploying this code (PostgreSQL `007_demo_readiness.sql`, or D1 `0009_demo_readiness.sql`). It preserves each existing generation's recorded portrait asset, including older assets replaced in the current catalog. If an original asset cannot be recovered, the worker holds the job for administrator review without resubmission or an automatic refund. These local changes have not migrated a hosted database.
