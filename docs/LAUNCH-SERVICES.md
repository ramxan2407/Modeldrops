# Model Drops: services for a real-user launch

Prepared September 21, 2026. This is a proposed launch stack, not a claim that these services are already connected. The current app is a private preview: billing and generation remain simulations.

| Service                         | Purpose                                                                 | What is needed                                                                  | Current state                                                          |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Supabase Auth**               | Email/password, signup confirmation, Google sessions, password recovery | Project URL, publishable key, redirect URLs                                     | Integration implemented; project not connected                         |
| **Google Cloud Console**        | OAuth credentials for Continue with Google                              | OAuth web client, consent screen; credentials stored in Supabase                | Not configured                                                         |
| **Resend**                      | Signup and password reset emails through Supabase SMTP                  | Verified sending domain, SMTP credentials                                       | Not configured                                                         |
| **Higgsfield API**              | Real image/video generation                                             | Funded API account, key ID and key secret, chosen model endpoints               | Evaluated; no live adapter or credentials yet                          |
| **Stripe Checkout**             | Character purchases and generation credits                              | Merchant account, test/live keys, signed webhook endpoint                       | Separate tested service foundation; preview checkout disabled          |
| **Stripe Connect**              | Creator onboarding and payouts                                          | Connect platform setup and eligible seller accounts                             | Needed only if third-party creators are paid                           |
| **Supabase PostgreSQL**         | Production purchases, entitlements, credits, jobs and accounting        | Staging/production databases, migrations, least-privilege roles and backups     | Production schema exists; app still uses D1                            |
| **Cloudflare R2**               | Private reference uploads and generated image/video storage             | Private buckets and signed, short-lived access                                  | Preview has R2; production asset lifecycle still needed                |
| **Cloudflare Workers + Queues** | Application hosting and durable generation processing                   | Production deployment, queue consumer, retries/dead-letter handling, domain/DNS | Sites currently hosts the Worker; standalone queues are not configured |
| **Cloudflare Turnstile**        | Signup/reset abuse protection                                           | Site/secret keys and server verification or Supabase integration                | Not wired                                                              |
| **Sentry**                      | Error reporting and operational alerts                                  | Project DSN, redaction rules and alerts                                         | Optional for the first internal test; recommended before paid launch   |

A custom domain is also needed for the final Model Drops brand and verified email sending. Keep the existing Sites address for review until activation. Public access must be enabled deliberately; the existing preview remains owner-private.

## Higgsfield suitability

Higgsfield's official API is intended for embedding image/video generation in applications. It supports asynchronous jobs, status polling and completion webhooks. It is separate from the consumer website subscription: website credits and Unlimited plans do not fund API calls. Use an API account and its own prepaid balance.

The API authenticates with a **key ID plus key secret**, sent server-side as `Authorization: Key ID:SECRET`. The Model Drops browser must never receive either credential. No purchases or paid test generations have been performed.

Provider outputs are only guaranteed to remain available for at least **seven days**. Download successful outputs into private R2 storage before marking a job complete in the customer's dashboard. Handle duplicate completion events and partial downloads safely.

For the purchased-character workflow, evaluate a small set of image-reference/video-reference models against the actual licensed character assets. For example, the documented Kling Omni image-reference endpoint accepts `image_urls` and `elements`. This does **not** establish that arbitrary customer LoRAs, private model weights, or Higgsfield website Soul ID assets can be deployed through the API. Check the exact selected model's API capabilities and licensing before offering those products.

## Integration flow

1. A verified Supabase user selects a model they own.
2. The server checks the purchase/license, validates settings, calculates a price, and reserves credits transactionally.
3. A durable worker submits the Higgsfield request and stores the provider request ID. An ambiguous timeout must not trigger an automatic duplicate paid submission.
4. A verified completion webhook or status poll advances the same job once.
5. Copy successful files into private R2 storage, finalize the ledger, and show the assets only to their owner. Failed work refunds the reservation exactly once.
6. Stripe webhook fulfillment grants purchased characters/credits. Never grant access from a success-page redirect alone.

Connecting accounts is necessary but not sufficient for a paid launch. The production database, payment routes, durable worker, content policy, provider adapter, private media delivery, refund/dispute processing and live end-to-end tests still need implementation/wiring. Sites does not support raw TCP database clients, so the existing PostgreSQL service layer needs transactional Supabase RPC/HTTP adapters on this host, or a compatible dedicated worker host; do not drop the current `pg` code into the Sites runtime unchanged.

## Activation order

1. Connect Supabase, Google OAuth and Resend; verify account isolation with two real test accounts.
2. Connect Higgsfield and private storage; validate one image and one video model, consistency, pricing, failures and replay handling.
3. Deploy durable processing and production database functions; connect Stripe in test mode and verify purchases, credit usage and refunds.
4. Configure the final domain, monitoring, rate limits and public access. Enable live billing only after the entire purchase-to-generation workflow passes.

## Official references

- [Supabase authentication](https://supabase.com/docs/guides/auth/passwords) and [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp) and [Resend setup](https://resend.com/docs/send-with-supabase-smtp)
- [Higgsfield API overview](https://docs.higgsfield.ai/docs) and [API billing / retention](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api)
- [Kling Omni reference inputs](https://open.higgsfield.ai/models/kling-video/omni/image-reference/api-reference)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout) and [Connect](https://docs.stripe.com/connect)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database/overview)
- [Cloudflare R2](https://developers.cloudflare.com/r2/), [Queues](https://developers.cloudflare.com/queues/) and [Turnstile](https://developers.cloudflare.com/turnstile/)
