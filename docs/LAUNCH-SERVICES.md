# Model Drops: services for a real-user launch

Prepared September 21, 2026. This is a proposed launch stack, not a claim that these services are already connected. The current app is a private preview: billing and generation remain simulations.

| Service                         | Purpose                                                                 | What is needed                                                                  | Current state                                                          |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Supabase Auth**               | Email/password, signup confirmation, Google sessions, password recovery | Project URL, publishable key, redirect URLs                                     | Integration implemented; project not connected                         |
| **Google Cloud Console**        | OAuth credentials for Continue with Google                              | OAuth web client, consent screen; credentials stored in Supabase                | Not configured                                                         |
| **Resend**                      | Signup and password reset emails through Supabase SMTP                  | Verified sending domain, SMTP credentials                                       | Not configured                                                         |
| **WaveSpeed API**               | Real image/video generation                                             | Funded API account and server-side WAVESPEED_API_KEY                            | Live adapter supports Qwen Image Edit, GPT Image 2.5 Flare/Sunburst and Kling 3.0 Standard              |
| **Stripe Checkout**             | Character purchases and generation credits                              | Merchant account, test/live keys, signed webhook endpoint                       | Separate tested service foundation; preview checkout disabled          |
| **Stripe Connect**              | Creator onboarding and payouts                                          | Connect platform setup and eligible seller accounts                             | Needed only if third-party creators are paid                           |
| **Supabase PostgreSQL**         | Production purchases, entitlements, credits, jobs and accounting        | Staging/production databases, migrations, least-privilege roles and backups     | Production schema exists; app still uses D1                            |
| **Cloudflare R2**               | Private reference uploads and generated image/video storage             | Private buckets and signed, short-lived access                                  | Preview has R2; production asset lifecycle still needed                |
| **Cloudflare Workers + Queues** | Application hosting and durable generation processing                   | Production deployment, queue consumer, retries/dead-letter handling, domain/DNS | Sites currently hosts the Worker; standalone queues are not configured |
| **Cloudflare Turnstile**        | Signup/reset abuse protection                                           | Site/secret keys and server verification or Supabase integration                | Not wired                                                              |
| **Sentry**                      | Error reporting and operational alerts                                  | Project DSN, redaction rules and alerts                                         | Optional for the first internal test; recommended before paid launch   |

A custom domain is also needed for the final Model Drops brand and verified email sending. Keep the existing Sites address for review until activation. Public access must be enabled deliberately; the existing preview remains owner-private.

## WaveSpeed generation

WaveSpeed provides Qwen Image Edit and GPT Image 2.5 images and Kling 3.0 Standard videos. See [WaveSpeed operations](WAVESPEED.md) for setup, supported controls, cost reservations, retries and private delivery. Its API balance is separate from the app's user credits. Reference editing is supported; custom LoRA weights and purchased-character conditioning are not wired into these endpoints.

## Integration flow

1. A verified Supabase user selects a model they own.
2. The server checks the purchase/license, validates settings, calculates a price, and reserves credits transactionally.
3. A durable worker submits the WaveSpeed request and stores the provider request ID. An ambiguous timeout must not trigger an automatic duplicate paid submission.
4. A verified completion webhook or status poll advances the same job once.
5. Copy successful files into private R2 storage, finalize the ledger, and show the assets only to their owner. Failed work refunds the reservation exactly once.
6. Stripe webhook fulfillment grants purchased characters/credits. Never grant access from a success-page redirect alone.

Connecting accounts is necessary but not sufficient for a paid launch. The production database, payment routes, durable worker, content policy, provider adapter, private media delivery, refund/dispute processing and live end-to-end tests still need implementation/wiring. Sites does not support raw TCP database clients, so the existing PostgreSQL service layer needs transactional Supabase RPC/HTTP adapters on this host, or a compatible dedicated worker host; do not drop the current `pg` code into the Sites runtime unchanged.

## Activation order

1. Connect Supabase, Google OAuth and Resend; verify account isolation with two real test accounts.
2. Connect WaveSpeed and private storage; validate one image and one video model, consistency, pricing, failures and replay handling.
3. Deploy durable processing and production database functions; connect Stripe in test mode and verify purchases, credit usage and refunds.
4. Configure the final domain, monitoring, rate limits and public access. Enable live billing only after the entire purchase-to-generation workflow passes.

## Official references

- [Supabase authentication](https://supabase.com/docs/guides/auth/passwords) and [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp) and [Resend setup](https://resend.com/docs/send-with-supabase-smtp)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout) and [Connect](https://docs.stripe.com/connect)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database/overview)
- [Cloudflare R2](https://developers.cloudflare.com/r2/), [Queues](https://developers.cloudflare.com/queues/) and [Turnstile](https://developers.cloudflare.com/turnstile/)

- [WaveSpeed API](https://wavespeed.ai/docs) and [Kling model pricing](https://wavespeed.ai/docs/docs-api/kwaivgi/kwaivgi-kling-v3.0-std-text-to-video)
