# Model Drops flow audit — 2026-09-21

The current published application remains a private preview. This audit covers local application routes, isolated database/storage fixtures, browser interaction checks, and the production build. It does not certify unconfigured external services or a public production launch.

## Fixed

- The `/admin` page now enforces a separate super admin role on the server. Every admin API action independently checks it. Training admins cannot change users, credits, or the catalog.
- Cookie-authenticated workspace and upload writes now reject missing as well as foreign Origin headers.
- New user suspension is enforced centrally across workspace APIs and private file downloads.
- Credit adjustments have validated bounds, required reasons, atomic ledger/audit/notification writes, idempotency checks, and overdraft protection.
- Admin models, catalog controls, and credit packages persist; nonexistent records produce errors rather than false success. Superseded unaudited mutation endpoints are disabled.
- Admin tab switching no longer renders stale data from the previous section. Search and pagination reset correctly when switching sections.
- Browser back/forward restores the route and character selection and clears stale search/project filters.
- Profile settings populate when opened through any navigation entry, including direct reload.
- Temporary refresh failures retain the current workspace; authentication failures clear it.
- Disabled characters cannot be claimed or used for new generation requests. Featured status affects catalog ordering.
- The UI explicitly describes simulated video output as a storyboard preview.

## Validation

- Node suite: authentication policy, redirect handling, manual LoRA submission/status/delivery/ZIP/files/email outbox, super admin roles/mutations/search/pagination, actual current platform route ownership/idempotency/refund/suspension/payment-unavailable behavior, and separate future production service logic.
- Local HTTP checks: unauthenticated pages/APIs, forged sessions and headers, rejected origins, unavailable Supabase configuration, training protection, admin protection.
- SQLite migration/ledger checks: clean migration application, append-only credit records, stale-balance rejection, overdraft prevention, immutable license snapshots; audit updates/deletes rejected.
- Browser: super admin tab transitions, credit adjustment, model price edit, saved changes/audit log, payment-unavailable messaging, catalog controls and mobile layout; existing user and LoRA navigation.

## External flows not yet verifiable

| Flow | Current state / next requirement |
| --- | --- |
| Real email/password and Google sign-in | Supabase and Google provider are not configured. Test real registration, confirmation, login, password recovery, sign-out, and two-account isolation after configuration. |
| Super admin access for the owner | Requires the owner's confirmed Supabase user UUID in `SUPER_ADMIN_USER_IDS`. No automatic promotion or shared default password. |
| Real image/video generation | Current worker returns a sample image/storyboard. Prompt/reference/output-count settings exercise the demo request and credit workflow, not live generated media. Connect a supported provider adapter and test billing, failures, and webhook recovery. |
| Purchases/payments/refunds | Checkout deliberately returns unavailable without charging. Separate production Stripe service tests do not mean the hosted preview has live Stripe checkout. |
| Training emails | Durable outbox exists; requires Resend, a verified sender, admin recipients, and a scheduled authenticated worker. |
| Manual LoRA training | The platform collects and delivers files. Administrators train externally; automated training is intentionally not implemented. |
| Public launch | Hosting is owner-private. Public access must be explicitly enabled only after the external flows are configured and tested. |

No real user accounts, balances, payments, or external messages were changed by the local fixture checks.
