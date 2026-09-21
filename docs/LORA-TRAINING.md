# Manual LoRA training

The application now includes `/train-lora`, `/my-loras`, and `/admin-training`. Training runs externally, performed by your team. The platform does not start GPU jobs, bill for training, or connect delivered weights to the existing image/video generation providers automatically.

## Enable for real users

1. Complete [Supabase setup](SUPABASE-SETUP.md) for email/password and Google login. Confirmed accounts receive separate private workspaces. No ChatGPT login is used by application authentication; the current private hosting audience is a separate gate.
2. Set `ADMIN_USER_IDS` to your admin Supabase identities, using `supabase:<UUID>` for each, separated by commas. Never put email addresses or browser-controlled profile roles here. Each admin should sign in once to create their user record; new-request in-app notifications then reach their account. The admin queue itself includes all submitted requests immediately.
3. Configure `RESEND_API_KEY`, `LORA_EMAIL_FROM` (a sender on your verified Resend domain), `LORA_ADMIN_EMAILS` (comma-separated recipients), and `APP_ORIGIN` (the exact hosted HTTPS origin). Secrets are server-only runtime values. No real emails are sent by the test suite.
4. Set a strong `JOB_RUNNER_SECRET`. Use your existing scheduler to POST to `/api/lora/email` every minute with `Authorization: Bearer <JOB_RUNNER_SECRET>`. For this currently owner-private Site, the scheduler must also be able to pass the Sites hosting access gate. When you enable public hosting for customers, application authentication and this secret still protect the endpoints. The scheduler has not been provisioned automatically.
5. Confirm two-user isolation and perform a complete live submission/delivery after Supabase is configured. The automated suite uses SQLite and a simulated private R2 bucket, so it does not substitute for a live credential smoke test.

D1 migrations provision the new tables during deployment. The existing private R2 binding stores datasets and delivered files; a second storage provider is unnecessary. Keep R2 public access disabled. Configure an R2 lifecycle rule to abort incomplete multipart uploads after several days through your storage administration controls where available.

## User workflow

Enter the character name/type, optional description, trigger word, notes, instructions, and reference prompt. Choose or drag in JPG, PNG, or WEBP images. At least 15 images are required, 20–50 are recommended, and 100 is the hard cap. The admin image-size setting defaults to 10 MB and accepts 1–25 MB per image.

Submission creates a private draft, uploads each file with progress, and then submits only after all selected uploads succeed. On a network failure, already uploaded files remain in the draft. Retry in the same page or reopen the draft from My LoRAs. Selected but not yet uploaded files must be selected again after a page reload. Drafts can be discarded. Submitted datasets are immutable.

Requests progress through Pending Review → Approved → Training In Progress → Quality Check → Completed, or Rejected with a reason. Users can review their request timeline and dataset. The dashboard refreshes every 30 seconds; a manual refresh is also available. Up to 500 most recent requests and models are shown in each view.

## Administrator workflow

Open Training requests from the admin sidebar. Search/filter the queue, inspect references, download the whole dataset as a streaming ZIP, and approve or reject. Train manually on your infrastructure, then mark Training Started and Quality Check. You can return from Quality Check to Training if the output needs more work.

In Quality Check, upload the `.safetensors` file (up to 2 GB, in 8 MB chunks) and a cover image. Add a trigger word, recommended prompt, version, and optional delivery notes, then select Mark Completed & Deliver. The server will not complete a request without ready files. Completed delivery creates a private library model and notifies the user.

Chunks retry automatically. After a connection error, Resume model upload continues the same selected file using the server's recorded chunks. A full page reload loses the local File object: select the file again to start a new upload and remove the earlier incomplete upload. The app accepts safetensors containers with a valid bounded header and data offsets; it does not guarantee model quality or architecture compatibility. Administrators must validate those during Quality Check.

User deletion removes the delivered model and cover and hides the library entry; request history and dataset remain. Keep an external model backup if redelivery may be needed. There is one delivered LoRA per request; the version is delivery metadata, not a multi-version archive. Dataset retention remains manual until a retention policy is chosen. Failed object cleanup after a storage outage requires operator reconciliation; access is revoked before physical deletion.

## Notifications and delivery reliability

Each status update atomically writes the request state, an activity event, in-app notifications, an email outbox record, and an audit entry. Optimistic revisions prevent conflicting admin changes. Admin submission notifications include user identity, request ID, character, image count, byte size, and timestamp.

The server attempts queued mail after submission/status updates. A scheduler processes retries with backoff; the admin settings panel can also process eligible queued messages. Without Resend configuration, the queue is retained and the panel reports setup required. Provider failures do not undo a training request.

Messages use stable [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys) and a two-minute delivery lease. Ambiguous messages stop retrying after 23 hours, within Resend's 24-hour deduplication window. The admin sees the failed count. Inspect `training_emails.last_error`, `provider_id`, and provider logs before any operator resend to avoid duplicate messages. A provider receipt means accepted by Resend, not guaranteed inbox delivery; configure domain authentication and monitor bounces in Resend.

## Architecture and access

- `training_requests`: user identity, character, instructions, dataset counts/path, lifecycle, revision.
- `training_files` / `training_parts`: private objects, upload readiness, durable multipart receipts.
- `trained_loras`: request-linked delivery metadata and deletion tombstone.
- `training_events`: status history.
- `training_emails`: durable transactional outbox.
- `training_settings`: admin-controlled per-image maximum.
- Existing `notifications` and `audit_logs`: in-app inbox and administrator audit history.

R2 paths are `datasets/<userId>/<requestId>/images/<fileId>` and `loras/<userId>/<requestId>/<fileId>`. URLs expose file IDs, never public bucket URLs. Each read revalidates the Supabase session, user ownership or admin role, and delivery visibility. ZIP access is administrator-only. The ZIP response and individual downloads stream bytes with private/no-store caching. Mutation endpoints check Origin; APIs never trust a supplied user ID or email.

The `TrainingProvider` interface reserves an adapter boundary for RunPod, Modal, ComfyUI, and Ostris AI Toolkit, and Flux/SDXL/WAN capability flags. Only `manual` requests are created today. No provider keys or automatic training jobs are used. [R2 multipart uploads](https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/) keep large model uploads under Worker request-body limits.

## Verification

`npm test` includes SQLite-backed lifecycle, cross-user isolation, upload validation, concurrency, idempotency, delivery, deletion, email outbox retries, and real ZIP extraction tests. `npm run typecheck` validates source types. `python3 tests/auth-boundary.py` checks the built worker's anonymous/forged-session rejection including the LoRA routes.
