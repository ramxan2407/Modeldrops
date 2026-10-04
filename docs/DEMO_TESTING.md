# Model Drops demo testing

The demo supports **super-admin approval → credit purchase → purchased-character selector → image/video generation → private results**. Real payment collection remains disabled.

## Run an isolated local demo

With Node 22.13+ and dependencies installed:

```sh
npm run demo:local
```

Open http://127.0.0.1:4176/marketplace. The QA bar switches between Buyer, Super admin and Second buyer. These are fictional local identities, not a Supabase login bypass in the application. The harness only listens on loopback, refuses a production/Vercel environment, and never reads a production environment file. Its in-memory database and account data reset when stopped.

1. Valentina is pre-approved for a quick demo purchase. To test approval, switch to **Super admin → Characters → Edit Isla**. A bundled test portrait is staged; choose **Approved**, enter a reason, and save.
2. Switch to **Buyer**, open Valentina, review access, accept the demo terms and buy for **300 credits**. The initial **2,000 demo credits** become **1,700**.
3. Studio opens with Valentina selected. Image and video tools attach her approved reference on the server. The selector contains only characters that this account has access to.
4. Generate an image (12 credits in the mock quote) or a 5-second silent video (120 credits). View private results and credit activity.
5. **Second buyer** has a separate wallet and library. In **Super admin → Users**, adjust a user's demo credits with an audited reason.

**All provider requests in this local harness are simulated.** Outputs reuse bundled sample media; they do not demonstrate AI output quality or character likeness. No API balance or real money is spent. The harness invokes the application's actual checkout, approval, wallet, generation and media routes against its isolated database. It is not a deployment entrypoint.

## Enable the same flow in a chosen hosted demo environment

Do not point a separate preview at production data by default. Configure its own Supabase Auth/database and private storage first.

1. Apply migrations before deploying these routes. Existing PostgreSQL workspaces with migrations 001–005 use:

   ```sh
   node --env-file=.env.demo.local scripts/migrate-demo-credits.mjs
   ```

   The operator supplies the selected demo database's `DATABASE_URL` in the ignored file. This script applies `migrations/vercel/006_demo_credits.sql` transactionally and can be rerun. Fresh workspaces use `scripts/migrate-vercel.mjs`. Cloudflare/D1 workspaces also need `drizzle/0008_demo_credits.sql` after previous migrations.

2. Set server variables:

   ```dotenv
   DEMO_MODE=true
   DEMO_WELCOME_CREDITS=2000
   WELCOME_CREDITS=0
   SUPER_ADMIN_USER_IDS=<verified-Supabase-admin-user-id>
   APP_ORIGIN=https://your-demo-host
   ```

   Keep existing Supabase and private storage settings. Demo credits are granted once per account, including existing accounts. Admin adjustments use the active demo wallet. Demo character prices default to 300 and are editable in Characters. Training admins and ordinary users cannot approve characters or adjust credits.

3. Upload a fictional adult character portrait through **Super admin → Characters**, review it, choose **Approved**, set its credit price and save. Uploading a replacement resets approval to Pending. Pending or rejected characters cannot be bought or used for live generation. Admins can preview pending portraits; normal users cannot retrieve them.
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
