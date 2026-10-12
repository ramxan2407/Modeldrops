# Model Drops production readiness

Updated 12 October 2026. This release hardens the hosted **invited demo with real generation**. Payments remain disabled at the owner's request. It is not a certification for an unrestricted or paid public launch.

## Implemented and verified locally

- Server-side Supabase identity verification, separate super-admin/training-admin permissions, account isolation, private media access and exact-origin checks remain enforced.
- Sign-in endpoints on Vercel now use an atomic database rate limit: 30 attempts per 10-minute window per address/action; signup and password-reset requests have a limit of five. Address identifiers are HMAC hashes, retained for at most approximately one hour by the scheduler. Missing rate-limit configuration fails closed. This complements, rather than replaces, [Supabase Auth limits](https://supabase.com/docs/guides/auth/rate-limits). It trusts the forwarded address only in the [Vercel runtime](https://vercel.com/docs/headers/request-headers).
- JSON and authentication request bodies are bounded while streaming, including when Content-Length is absent or false. Invalid JSON, encoding, and schema inputs return client errors without exposing internal details.
- Database connection, statement, query and transaction-lock timeouts prevent indefinitely waiting requests. Credit and checkout writes retain their atomic transaction and idempotency protections.
- Response headers prevent framing and MIME sniffing, restrict referrer disclosure, and deny unused camera/microphone/location permissions. The CSP restricts framing, base URLs, objects and form destinations; it is not a full script nonce policy. Form destinations remain self-only while Google login is disabled. When enabled, the exact configured HTTPS Supabase origin and `https://accounts.google.com` are allowlisted because [browsers may apply form restrictions to OAuth redirects](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/form-action). Authentication mutations still require the exact application origin.
- Error boundaries and a branded 404 offer recovery. Admin waits for account loading before showing authorization state.
- Admin Overview and Integrations show scheduler heartbeats, review/stalled job counts, email backlog/failures and pending file cleanup. Overlapping runs cannot overwrite a newer result. Heartbeat health only means the task ran; it does not prove email was delivered or external generation succeeded.
- The character editor lists all enabled model checks with human-readable names, existing approval evidence and missing examples. Save pending & test opens Studio with that exact character selected. Approval still requires real completed reference-conditioned results; historical approval is not fabricated into QA evidence.
- Node 24 is pinned. GitHub Actions runs lint, TypeScript, tests, a production dependency audit and the Next.js production build without production secrets. Repository branch protection is not configured by this workflow.
- Automated suite: 104 passing tests, including SQLite and PostgreSQL/PGlite; credit isolation, retries/refunds, private uploads, manual LoRA workflows, auth limits, streamed payload limits, stale/overlapping scheduler runs, portrait migration and the restricted OAuth form policy. The npm production audit reports zero known vulnerabilities. Lint has zero errors and 23 native-image optimization warnings.
- The isolated browser test verified the admin health panel, model checklist and save-pending-to-Studio selection. Simulated local output is not counted as a real provider acceptance test.

## Release and rollback

1. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm audit --omit=dev --audit-level=high`, and `npm run build:vercel` with Node 24.
2. Existing hosted databases: run `node --env-file=.env.vercel.local scripts/migrate-operations.mjs`. Migration 008 only creates operational tables and denies browser-role access. It is transactional and repeatable. It does not rewrite users, credits, portraits or media. Fresh databases use `scripts/migrate-vercel.mjs` instead.
3. Deploy using the correct Model Drops Vercel project and production environment. Keep preview credentials isolated.
4. Verify canonical login, ordinary-user denial of admin APIs, owner dashboard, private media, security headers and background health. Confirm the existing minute scheduler continues reaching `/api/jobs`.
5. If a release fails, promote the previous known-good deployment. The added tables are backward-compatible; leave them in place during rollback. Do not reverse migration 007, which protects purchased and queued portrait identity.
6. Operational response: disable the affected generation model or set `WAVESPEED_ENABLED=false` when upstream generation fails. In Integrations, inspect jobs marked for review against the provider console before resuming or refunding; never blindly resubmit an uncertain provider job. Check credit history and the immutable ledger after recovery.

`scripts/configure-supabase-scheduler.mjs` configures Supabase Cron, pg_net and Vault. It is an explicit setup action, not a deploy-time side effect. Secrets stay server-side. The scheduler performs generation recovery, email outbox work, abandoned upload cleanup and auth-limit expiration.

## Remaining launch gates

| Gate | Required action |
| --- | --- |
| Sale-ready characters | Generate and inspect Qwen, GPT Flare, GPT Sunburst and Kling results using the exact final hosted portrait. Select those examples in Super admin → Characters, then approve. Valentina/Isla currently retain historical existing-buyer access; new purchases remain gated until their review is complete. |
| Real model acceptance tests | The prior local Qwen/Kling tests succeeded. This release has not run a new paid test against all four models/current hosted portrait. Owner approval for a capped test is pending. Do not treat mocked tests or price quotes as completed media generation. |
| Email and public onboarding | Provide an owned sending domain and sender/support address. Configure custom Supabase SMTP for signup/reset mail and Resend plus `LORA_EMAIL_FROM` / `LORA_ADMIN_EMAILS` for training notifications. Complete real-inbox tests. Supabase's [default SMTP service](https://supabase.com/docs/guides/auth/auth-smtp) is not a general production mail service. |
| Google login | Configure Google OAuth in Supabase and exact redirects, enable `SUPABASE_GOOGLE_ENABLED`, and verify a real login round trip. Currently disabled. |
| Paid commerce | Intentionally deferred. Keep purchases on explicit demo credits; do not accept real money until payment, webhook, refund and reconciliation tests pass. |
| Disaster recovery | Confirm the project's backup retention and off-site storage policy, and rehearse restoring database plus private storage in an isolated project. No production data export or restore exercise was performed in this release. |
| Incident alerting and capacity | The dashboard exposes health, but external on-call alerts/error tracking and production-scale load tests are not configured/verified. Set an owner notification destination and test recovery under the intended load before broad access. |
| Public business policies | Finalize the intended domain, support channel, licensing, privacy/retention and content policies before broad public access. Current product scope is curated fictional-adult characters. |

New demo users receive zero automatic credits. Invite specific testers and grant their balance in Super admin → Users/Credits. Existing demo funds are kept separate from paid funds; real inference still spends the provider balance. Default safeguards are six requests/minute, three concurrent jobs, $2/user/day, $5/platform/day and $25 total demo reserve, all enforced at reservation time. Uncertain provider outcomes retain their reserved spend until reconciled.

Manual LoRA request collection, datasets, approval, delivery and download are supported. Automatic training, using delivered LoRA weights in these Studio models, payouts and full media editing are not part of this release. Native authenticated images remain a performance follow-up; replacing them with a public optimizer without preserving access checks would be incorrect.

## Hosted verification

- Published application commit `4a3f3d4` at [Model Drops](https://model-drops-ten.vercel.app). Production deployment: `dpl_EVDsL4f7NsURR1x5PFxAQ6BmuKhi`, `https://model-drops-pdpw7k79e-model-drops-ramxan87.vercel.app`.
- [GitHub release checks](https://github.com/ramxan2407/Modeldrops/actions/runs/38237591143) passed from a clean Linux install: lint, TypeScript, all 104 tests, production dependency audit and production build. The final narrow OAuth allowlist was deployed afterwards and the canonical login still returns 200 with self-only form destinations while Google login is disabled.
- Production migration 008 completed. The hardened pool successfully queried the real Supabase transaction pooler. Both new tables deny SELECT to anonymous/authenticated browser roles.
- Canonical welcome returned 200, the branded missing page returned 404, and the configured security headers were present with no framework disclosure header.
- Demo email/password login returned 200. The account still has 5,000 credits and no super-admin role. Anonymous admin/scheduler/workspace API calls returned 401; signed-in demo admin access returned 403.
- Malformed platform/transfer payloads returned 400 and an oversized platform request returned 413. These requests left the demo balance unchanged. A hashed auth-limit entry was recorded; no raw address was stored in its key.
- At 10:33 UTC, generation recovery, email scheduling and storage cleanup all recorded successful heartbeats. Queues were empty. Email configuration is still required; a scheduler heartbeat is not a delivered-email receipt.
- Read-only ledger aggregates: zero negative wallets, zero failed/cancelled jobs with unreturned credits, zero completed charge mismatches, zero pending/review jobs.
- The owner browser showed the new loading state, operational health, unchanged 1,400-credit balance, and Valentina's four explicit missing model-review checks. No live character, permission or credit setting was changed by these checks. Dashboard document width matched viewport width at 390px and 1,440px; no browser warning/error was recorded during these checks.
- No new paid generation was submitted. The final hosted portrait still needs those model acceptance tests and content review before new sales open. Payments remain disabled.

The previous release evidence remains in `RELEASE-AUDIT-2026-10-12.md`.
