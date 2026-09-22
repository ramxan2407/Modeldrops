# Model Drops MVP launch plan

Prepared September 22, 2026. This is an implementation plan, not a statement that the outstanding integrations have shipped.

## Starting point

The app is live at https://model-drops-ten.vercel.app under the owner's Vercel account, connected to https://github.com/ramxan2407/Modeldrops. Supabase Auth, PostgreSQL, and private Storage are connected. The owner reports login is working. Personal workspaces, super admin controls, and the manual LoRA request/delivery implementation exist. Previous automated checks and deployment builds passed; public signup, real AI, and payments still need end-to-end validation.

Generation currently returns sample artwork/storyboards. Checkout is disabled. Google login, custom SMTP, and scheduled notification delivery are unconfigured. The separate `production/` provider/payment foundation is not wired into the deployed workspace: adding API keys alone will not activate it.

This document supersedes the deployment status in older pre-Vercel planning documents. Keep their historical test results, but do not treat their D1/R2 hosting descriptions as the current live architecture.

## MVP boundary

Launch a curated, owner-operated product: email/password and Google login, a small licensed character catalog, one validated image model, one validated video model, credit purchases, private generation history/downloads, manual LoRA requests/delivery, and super admin support controls.

Prove image generation in a small beta first; enable video after its own acceptance checks. Defer third-party seller payouts, subscriptions, automated training, community publishing, and broad model selection. Delivered LoRAs are downloadable assets; using their weights inside Studio requires a separately verified compatible inference backend. Do not advertise that capability until implemented and tested.

## Ordered implementation backlog

| Order | Deliverable                       | Work                                                                                                                                                                                                                                          | Acceptance gate                                                                                                                                                                  |
| ----- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Public onboarding                 | Configure verified email sending through Resend + Supabase SMTP; configure Google OAuth; verify signup, confirmation, reset, logout, and return paths.                                                                                        | Two unrelated external email accounts can register and recover access; both remain isolated; neither can access admin routes.                                                    |
| 2     | Real image generation             | Implement the chosen provider adapter in the live workspace; validate reference inputs and model parameters; persist provider IDs and generated media.                                                                                        | A prompt and reference produce a real private image; progress survives refresh; download works; failure returns reserved credits exactly once.                                   |
| 3     | Reliable jobs and spend controls  | Deploy durable job processing/recovery, webhook verification or authenticated polling, concurrency limits, timeouts, reconciliation, and storage cleanup. Replace the automatic 1,840 demo-credit grant with an explicit capped trial policy. | Duplicate events cannot double-charge or double-refund; a worker interruption recovers; uncertain submissions are reconciled before resubmission; budget limits block new spend. |
| 4     | Paid credits and character access | Wire checkout/webhooks into the deployed schema; configure a merchant account and packages; implement refunds/dispute handling and reconciliation. Separate demo, promotional, and purchased balances.                                        | Test payment grants the exact credits/entitlement once; cancelled/failed payment grants none; webhook replay is harmless; refund policy and ledger agree.                        |
| 5     | Real video generation             | Validate one video endpoint, allowed duration/resolution, price estimates, queue lifecycle, playback, and private storage delivery.                                                                                                           | A real playable video reaches only its owner; price and failure behavior match the image workflow.                                                                               |
| 6     | Manual LoRA pilot                 | Run the full dataset-to-admin-to-delivery flow with a real operator; enable notification outbox delivery/retries; decide training pricing, turnaround, and retention.                                                                         | At least 15 valid images submit; admin previews/downloads ZIP; all status transitions notify correctly; a real trained file downloads and loads in a compatible external tool.   |
| 7     | Public paid launch                | Finish mobile/empty/error states, licensed catalog copy, support/contact and policies, monitoring, backups/restore, and staged rollout.                                                                                                       | The launch checklist below passes with no unresolved critical failures.                                                                                                          |

Run steps 1–3 before inviting the first beta cohort. Complete steps 4–7 before charging publicly. Account setup and domain verification can proceed while engineering is underway; delivery dates depend on those external prerequisites.

## Integration decisions and owner inputs

| Service                                              | Purpose                                             | Required next input/action                                                                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel + Supabase                                    | Existing hosting, identity, database, private files | Choose ongoing capacity/plans; review the automatically started Vercel trial; provision isolated staging before real billing.                                                 |
| Resend                                               | Auth SMTP and LoRA notification email               | Verify an owned sending domain; set SMTP/API credentials, sender, admin recipients, and authenticated delivery schedule.                                                      |
| Google Cloud / Supabase Google provider              | Google login                                        | Configure OAuth client, consent audience, and exact production redirects.                                                                                                     |
| WaveSpeed API                                        | Image and video generation                          | Provide a server-side API key and funded balance; see [WaveSpeed operations](WAVESPEED.md).                                                                                   |
| OpenRouter, alternative candidate                    | Model-specific image/video APIs                     | Provide server-side key and selected model IDs if chosen instead; validate current API contracts and replace the existing unverified adapter assumptions.                     |
| Stripe Checkout, conditional on merchant eligibility | Credit packs and character payments                 | Confirm business country/account eligibility, currency, package prices, refund rules, and account access. Use test mode first; select an eligible alternative if unavailable. |
| Domain/DNS provider                                  | Branded website and verified sender                 | Choose an owned domain and support address. Configure app, auth, and payment return URLs together.                                                                            |

Credentials belong in the service dashboards or ignored local environment files, never chat or Git. No new service account, paid plan, or billable test is created by this plan.

WaveSpeed replaces the previous provider for Qwen Image Edit and GPT Image 2.5 images and Kling Standard video. Character consistency and custom LoRA conditioning still need a separate evaluation with owned or licensed assets.

## Engineering requirements that matter before charging

- Integrate against the live `model_drops` schema. Review the separate `production/` schema and services for reuse; do not apply a parallel baseline over the existing database or create a second source of truth for credits.
- Preserve the current atomic ledger, ownership checks, and audit history. Explicitly classify existing demo balances and demo character claims; they must not silently become purchased credits or commercial licenses.
- Keep provider credentials server-side. Restrict fetching provider output URLs to validated destinations; bound output type/size and copy files into private storage before marking delivery complete.
- Deploy a durable recovery mechanism for generations and an authenticated email schedule. The current `after()` demo work and unscheduled email outbox are insufficient as the sole recovery path for paid jobs.
- Add per-user request/concurrency quotas, an overall provider spending cap, and an admin emergency switch for generation/checkout. Show the quoted credit price before submission and record the pricing version.
- Extend existing super admin controls with real payment/refund records, stuck jobs, provider errors/costs, and failed notification visibility. Keep credit adjustments reasoned and audited.
- The deployment currently sets `MAX_LORA_UPLOAD_BYTES=52428800` (50 MB). Test representative real LoRAs; if too large, select compatible storage capacity and update backend/UI limits before offering delivery. Old documentation mentioning 2 GB is not the deployed limit.
- Schedule abandoned upload/dataset cleanup according to a published retention policy. Test backup restoration and record support procedures for stuck jobs and missing deliveries.

## Release acceptance checklist

- [ ] External email signup, confirmation, password reset, and Google login pass on desktop and mobile.
- [ ] Two independent users cannot read or mutate each other's balances, jobs, datasets, LoRAs, or private downloads; ordinary users cannot invoke admin actions.
- [ ] Real image and video jobs survive reload and worker interruption; invalid inputs, provider failures, timeouts, and duplicate callbacks behave correctly.
- [ ] Trial/promotional credits are bounded; provider cost and user credit deductions reconcile for every beta job.
- [ ] Test checkout, payment failure, duplicate webhook, entitlement granting, and refund/reversal handling pass; a controlled live payment is verified before public promotion.
- [ ] A real manual LoRA request completes through delivery, including email notifications and a realistic file size.
- [ ] Catalog assets have documented usage rights; product copy accurately states character consistency, commercial usage, LoRA compatibility, price, and turnaround.
- [ ] Error alerts, backups/restore, account suspension, support contact, and generation/checkout pause controls work.
- [ ] Terms, privacy, content/consent rules, refund policy, and dataset retention/deletion behavior are published for the actual offering.
- [ ] Production has the intended domain, redirects, credentials, spending limits, and hosting capacity; staging uses separate test credentials and data.

## Rollout and measurement

Start with 5–10 invited testers and a fixed total spend cap. Observe signup → first successful generation → download, completion/failure rate, job latency, cost per output, refund accuracy, and support issues. Expand only after the critical checklist passes and failures can be diagnosed and recovered. Publish only the capabilities that passed their own gate.

The first implementation milestone is **external signup + one real image generation + private download + correct credits**. It proves the core value before adding more catalog models or paid acquisition.

## Official integration references

- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp): the built-in sender is restricted and is not intended for production signup delivery.
- [Resend with Supabase](https://resend.com/docs/send-with-supabase-smtp): requires API credentials and a verified domain.
- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google): OAuth client and redirect setup.
- [WaveSpeed API](https://wavespeed.ai/docs): asynchronous image/video requests and output retention; persist delivered media in our storage.
- [OpenRouter video generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation): asynchronous video endpoints; this is provider capability, not current app functionality.
- [Stripe Checkout](https://docs.stripe.com/payments/checkout/quickstarts): hosted checkout implementation reference.
