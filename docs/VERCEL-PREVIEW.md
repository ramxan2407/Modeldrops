# Vercel preview

This app supports two hosting targets. The existing Sites build still uses Vinext, D1 and R2. `npm run build:vercel` builds native Next.js for Vercel with Supabase Postgres and private S3-compatible Supabase Storage. Authentication continues to use the same verified Supabase identities. AI generation and purchases remain demonstrations.

## GitHub import

Import the repository in the intended Vercel account/workspace. `vercel.json` sets the Next.js framework, build command, install command, and Sydney function region. Choose Node 24. Vercel's first Git import typically deploys the production branch, so enter the environment variables for the deployment environment you intend to use.

For CLI previews, verify the account with `vercel whoami --global-config .vercel-auth` and always pass the isolated config flag when linking or deploying. Local account credentials and project links are excluded from Git.

## Runtime configuration

Credentials are in ignored `.env.vercel.local`, never source control. Set `DATABASE_URL` to the Supabase transaction pooler, the existing Supabase public auth URL/key, server-only `SUPER_ADMIN_USER_IDS`, S3 endpoint/region/bucket/access credentials, and `MAX_LORA_UPLOAD_BYTES`. Supabase Free currently limits stored files to 50 MB; this preview sets the LoRA limit to that value.

The database adapter validates TLS with Supabase's published root CA. Workspace tables use a separate `model_drops` schema with no access for browser roles. Ownership checks remain in server APIs. The existing SQL statements use parameter binding, and writes acquire a transaction-level advisory lock to retain D1's serialized-writer behavior. Batches are atomic; ledger and audit immutability triggers remain active.

`npm run db:migrate:vercel` creates the schema exactly once. It refuses to overwrite an existing schema. `node --env-file=.env.vercel.local scripts/import-vercel.mjs` imports the bounded, verified D1 snapshot from ignored `.env.vercel-data.json`. The import was completed with 10 records, including two workspace users and their demo balances. There were no private assets, generations or training files to copy. The source Site is unchanged; subsequent edits there do not synchronize into this preview.

## Publishing

1. Complete account/workspace setup and link the intended team with `vercel link --yes --project model-drops --scope <verified-team> --global-config .vercel-auth`.
2. Run `node --env-file=.env.vercel.local scripts/configure-vercel-env.mjs` to store secrets in the linked project's preview environment. This script passes values over stdin, not command arguments.
3. Run `vercel deploy --yes --global-config .vercel-auth` for a preview, without `--prod`.
4. Add the exact returned Vercel origin plus `/auth/complete**` to Supabase's redirect allowlist. Keep the existing Site URL/redirects so the old Site still works. `APP_ORIGIN` defaults to the deployment's `VERCEL_URL`.
5. Sign in with a confirmed Supabase account and verify the dashboard and admin controls. Google OAuth and custom SMTP remain separate configuration tasks.

## Uploads and background work

Vercel request payload limits are avoided by staging uploads directly into private storage with short-lived signed PUT URLs. The server binds reservations to the authenticated user and exact target endpoint, verifies uploaded size and content, and consumes each reservation once before accepting it into the workspace. Expired staging objects are cleaned during later uploads by the same owner; a scheduled cleanup should be added before broad public use.

LoRA weights retain resumable S3 multipart delivery and server-side safetensors validation. Download and dataset ZIP responses stream through authenticated endpoints. The demo job uses Next's `after()` and a bundled sample asset; it is not an external AI worker or real video rendering.

## Verification

Use Node 24 for tests on this machine; Node 23 hangs during embedded PGlite startup. Run `node --import tsx --test tests/*.test.ts` with that runtime, `npm run build:vercel`, and `node --env-file=.env.vercel.local --import tsx scripts/verify-vercel-storage.ts` for the temporary-object storage check. Tests exercise both SQLite and Postgres API flows, ownership, credits, training transitions, and upload reservations.
