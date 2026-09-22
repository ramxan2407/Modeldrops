# Higgsfield content generation

The live workspace supports Soul 2 images and Kling 3.0 Standard silent videos through Higgsfield's server-side API. Initial support is one output per job, text prompts, three aspect ratios, 720p/1080p Soul images, and 5/10 second Standard video. The video endpoint controls its native resolution; the UI labels it Standard. Negative prompts, image references, character catalog conditioning, and custom LoRA weights are intentionally rejected instead of silently ignored.

## Activation

1. Sign in to [Higgsfield API keys](https://open.higgsfield.ai/api-keys), create credentials, and save `HF_API_KEY_ID` and `HF_API_KEY_SECRET` in ignored `.env.vercel.local`. The API account needs available funds; a consumer website subscription is separate.
2. Set `HIGGSFIELD_ENABLED=true`, `HIGGSFIELD_DAILY_LIMIT_USD=5` (or an explicitly chosen cap), `WELCOME_CREDITS=0`, and a random `CRON_SECRET` of at least 32 characters. Never put these values in browser bundles or Git.
3. Run `node --env-file=.env.vercel.local scripts/migrate-higgsfield.mjs`. This is an additive, repeatable migration of the existing workspace schema.
4. Run `node --env-file=.env.vercel.local scripts/configure-higgsfield.mjs production` using the intended isolated Vercel account. Deploy the code afterward. The minute schedule in `vercel.json` requires a Vercel plan that supports that frequency; check the current workspace plan before activation.
5. Validate one real image and video using a bounded approved API test budget. Confirm actual output hostnames, sizes, playback, provider charges, and credit balances. Account/model access and output delivery are not established by mock tests.

When active, Studio shows the two live models instead of sample generators. Existing account balances are retained, as requested for users with credits. New accounts receive zero automatic credits; grant beta credits through super admin. Checkout remains disabled. Model credit prices can be adjusted through the existing admin controls.

The daily reservation cap uses conservative published provider rates, measured in integer micro-USD, across submitted jobs created that UTC day. It includes successful and unresolved requests; explicitly failed/rejected jobs release their reservation. This is an estimate-based application limit, not a guaranteed provider billing limit. Revalidate rates before promotion or pricing changes. Disable `HIGGSFIELD_ENABLED` to pause the integration.

## Job behavior

Credit reservation, job creation, and provider budget reservation commit atomically. Workers claim a lease and record submission intent before making the paid POST. A successfully recorded request ID is polled; generation is never resubmitted to recover a poll or storage failure. Unknown submission outcomes become `needs_review` and keep credits reserved. Provider-reported failure/NSFW/cancellation returns credits once. User cancellation of live requests is disabled to prevent refunding work still running at the provider.

The authenticated `/api/jobs` cron recovers pending work every minute. Active dashboard polling also advances the owner's jobs, with a 15-second lease delay between checks. `CRON_SECRET` and the legacy `JOB_RUNNER_SECRET` are accepted only as bearer headers. Jobs that still have no terminal result after 24 hours require operator review.

Outputs are copied into private account storage before completion. Downloads require the owning user's session; video MIME types and extensions are preserved. Downloads reject redirects, non-HTTPS URLs, unknown hosts, unexpected formats, signature mismatches, and files above 45 MB. If Higgsfield returns another legitimate CDN hostname, verify it against the account's request output, then add that exact host to `HIGGSFIELD_OUTPUT_HOSTS`; do not allow arbitrary suffixes or IP addresses.

## Operator recovery

Recent jobs and provider IDs are visible in Super admin → Integrations. Use the generation ID to inspect `provider_requests`, `generation_jobs`, and the generation error; do not expose provider payloads or credentials to the browser. Compare the saved request ID with the Higgsfield request history.

- If submission acceptance is unknown, verify the matching prompt/model/time in the provider console. Never blindly repeat the paid POST.
- Once the matching provider request ID is confirmed, restore `provider_requests.request_id`/`state='polling'` and `generation_jobs.status='processing'` with an expired lease, recording the action in the audit log. Do not change the generation ID or its credit charge. Support should perform this as a reviewed database operation; no automated reassignment is provided.
- For a known request with a download failure, resolve the verified CDN allowlist or storage issue, then resume polling of that same request. Do not refund an output that may still be delivered.
- If the provider confirms rejection/failure, resume polling to apply the normal idempotent refund. Missing request IDs require manual reconciliation of provider billing before any credit adjustment.

## Sources and verification

- [Soul 2 model schema](https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/standard/api-reference)
- [Kling 3.0 Standard model schema](https://open.higgsfield.ai/models/kling-video/v3.0/std/text-to-video/api-reference)
- [Status API](https://docs.higgsfield.ai/docs/api-reference/requests/get-request-status)
- [Higgsfield retry rules](https://docs.higgsfield.ai/docs/concepts/errors)

`tests/higgsfield.test.ts` exercises the real workspace APIs/worker against SQLite and embedded PostgreSQL with mocked provider responses: ownership, single submission, delayed file delivery, refunds, uncertain outcomes, budget rollback, and invalid media. These checks do not spend provider funds or prove live account access.
