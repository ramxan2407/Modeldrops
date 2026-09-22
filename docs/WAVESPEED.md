# WaveSpeed content generation

The live workspace uses WaveSpeed for **Qwen Image Edit**, **GPT Image 2.5 Flare**, **GPT Image 2.5 Sunburst**, and **Kling 3.0 Standard** video. All other image models are excluded by a server-side allowlist. Credentials stay on the server. The durable queue, ledger, private storage, notifications and cron recovery are shared in `lib/generation`.

## Supported controls and costs

| Model                  | Controls                                                                                                                | Retail credits                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Qwen Image Edit        | Required reference image and edit instruction, optional dimensions and seed, JPEG/PNG/WEBP                              | 12 per edit at the current $0.02 rate                                      |
| GPT Image 2.5 Flare    | Text generation or up to 16 reference images for editing, 15 aspect ratios, 1K/2K/4K, five quality tiers, PNG/JPEG/WEBP | Live quote; medium text generation currently 15 credits at 1K and 42 at 4K |
| GPT Image 2.5 Sunburst | Same controls, detail-focused variant                                                                                   | Live quote; medium text generation currently 15 credits at 1K and 42 at 4K |
| Kling 3.0 Standard     | 1:1/16:9/9:16, 3–15 seconds, sound, guidance, negative prompt, automatic storyboard or up to six custom shots           | 120 per five seconds; sound multiplies credits by 1.5                      |

Image controls come from the selected models' authenticated API schemas. `scripts/sync-wavespeed-catalog.mjs` refreshes only the five approved image endpoints (Qwen edit and both GPT generation/edit variants). Review and deploy schema changes explicitly. GPT switches to its `/edit` endpoint only when references are present; an empty reference list is omitted from text-to-image requests.

Image price previews call WaveSpeed's free `/model/price` endpoint with the actual validated inputs. The server re-quotes before enqueueing, refuses increases above the user's displayed amount, and never substitutes a base price when quoting fails. Retail cost is `max(1, ceil(published USD price × 600))`, preserving the established Qwen rate. Daily provider reservations use the quoted discounted amount. WaveSpeed recalculates final provider charges at submission; reservations are estimates, not a billing guarantee. Kling reserves $0.084/second without sound or $0.126/second with sound.

References upload into private storage using the existing owner-bound upload flow. Only owner-validated asset IDs receive temporary signed download URLs for provider access. The URL is never sent back in price quotes. External HTTPS image URLs are also supported. Images and prompts go to WaveSpeed for generation. Purchased-character and custom LoRA conditioning remain unconnected to these selected endpoints.

Kling manages its native resolution. Shot durations must total the video duration. Custom shots replace the main prompt; automatic storyboard uses the main prompt. Sync and base64 output stay disabled. Each selected image endpoint returns one image; historical multi-output creations retain delivery and download support.

## Activation and deployment

1. Save `WAVESPEED_API_KEY` in ignored `.env.vercel.local`. Obtain it from [WaveSpeed access keys](https://wavespeed.ai/accesskey). Fund the separate provider balance.
2. Keep `WAVESPEED_ENABLED=true`, `WAVESPEED_DAILY_LIMIT_USD=5`, `WELCOME_CREDITS=0`, and the existing random `CRON_SECRET`.
3. Run `node --env-file=.env.vercel.local scripts/configure-wavespeed.mjs production`. This verifies authentication via the free balance endpoint, then securely writes environment variables to the Model Drops Vercel project. It submits no generations.
4. Run `node --env-file=.env.vercel.local scripts/retire-higgsfield.mjs`. It refuses retirement if any old generation is queued or processing, and disables old models without deleting history, output files or credit entries.
5. Push to the connected GitHub repository to deploy. Remove the retired HF/HIGGSFIELD credentials from Vercel and the local environment after successful cutover. Do not revoke the provider account's keys or delete its account as part of this application migration.

`WAVESPEED_ENABLED=true` without a valid key shows disabled WaveSpeed models and rejects new jobs; it never silently supplies demo outputs. Missing credentials do not refund or abandon already-submitted WaveSpeed work: queued work can resume once configuration is repaired. Disabling a model blocks new work while existing submissions can still finish.

The existing `002_higgsfield.sql` migration name is intentionally retained as schema history. Its `provider_requests` table is provider-neutral. Fresh installations use the existing full migration script; `scripts/migrate-generation.mjs` installs the provider table on an existing workspace. No destructive schema migration is required.

## Reliability and retirement behavior

Job creation, credit reservation and daily provider budget reservation commit in one transaction. The worker claims a lease before submitting and persists intent before the paid POST. Network timeouts, 5xx, unreadable responses and ambiguous outcomes require review; they never trigger an automatic second paid submission. Explicit rejection, including HTTP 402 for insufficient provider funds, returns credits once with a useful error. Provider `failed`, `cancelled`, `timeout`, and `deleted` outcomes are terminal.

The authenticated `/api/jobs` cron and owner dashboard polling resume saved provider IDs. Files are copied into private account storage, one output per invocation; interrupted delivery resumes without regenerating. A batch completes only after all expected outputs are stored. Owner and generation checks protect every output. HTTPS host allowlists, no redirects, 45 MB limits and media signatures constrain ingestion. Default CDN hosts are `static.wavespeed.ai`, `cloudflare-static.wavespeed.ai`, and the provider-confirmed `d2h7xmz5gqybh9.cloudfront.net`; add exact verified hosts through `WAVESPEED_OUTPUT_HOSTS` only if necessary.

Retired provider jobs never go through WaveSpeed. A job definitively not submitted (`ready`, no request ID) is cancelled and refunded. Already-submitted or uncertain old jobs are held for administrator reconciliation, retaining their original provider identity and credits until the outcome is known. Historical outputs keep their original provider label. Remixing one selects the current equivalent media model and asks the user to review its settings.

## Verification

`tests/generation.test.ts` runs real API and worker code against SQLite and embedded PostgreSQL with mocked provider responses. It covers single submission, private media, batch delivery/retry, refunds, daily budget rollback, retired jobs, missing credentials, terminal status mapping, and model-specific parameters. `tests/image-catalog.test.ts` verifies the allowlist, reference routing, schema constraints and live-quote handling. Paid output tests must be explicitly authorized separately.

Official sources:

- [Qwen Image Edit](https://wavespeed.ai/models/wavespeed-ai/qwen-image/edit)
- [GPT Image 2.5 Flare](https://wavespeed.ai/models/openai/gpt-image-2.5-flare/text-to-image)
- [GPT Image 2.5 Sunburst](https://wavespeed.ai/models/openai/gpt-image-2.5-sunburst/text-to-image)
- [Input-specific pricing](https://wavespeed.ai/docs/pricing-api)
- [Kling Standard schema and sound pricing](https://wavespeed.ai/docs/docs-api/kwaivgi/kwaivgi-kling-v3.0-std-text-to-video)
- [Prediction status](https://wavespeed.ai/docs/get-result)
- [Balance API](https://wavespeed.ai/docs/check-balance)
