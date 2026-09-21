# Model Drops super admin

Open `/admin` with a confirmed Supabase account whose stable application user ID is explicitly listed in the server-only `SUPER_ADMIN_USER_IDS` setting. The value is a comma-separated list of `supabase:<Supabase Auth user UUID>` entries. Email addresses, user-editable metadata, client cookies, and the legacy database role column cannot grant access.

`ADMIN_USER_IDS` grants training administration only. Super admins also have training administration access. Existing training admins are not automatically promoted. No administrator credentials or test accounts are shipped.

## Available controls

- Overview: users, suspended accounts, outstanding demo credits, generations, failures, training queue, reports, submissions.
- Users: searchable, paginated accounts; suspend/restore ordinary users; grant/deduct demo credits with a required reason. Privileged accounts cannot be suspended through this screen.
- Credits: append-only ledger with account, amount, reason, resulting balance, and timestamp. Repeated requests cannot double-apply adjustments; deductions cannot overdraw.
- Payments: edit existing displayed credit packages and inspect demo character access history. Checkout, real payment receipts, and cash refunds remain unavailable until the live payment backend is integrated.
- Models: enable/disable existing generation models and edit their base credit costs.
- Characters: publish/hide existing catalog entries, set featured status and displayed sample price. Disabled entries are blocked server-side for new claims and generations. Existing user records are retained.
- Moderation: review creator concepts and resolve/dismiss reports. Approved concepts do not automatically publish assets or sell weights.
- Activity: searchable, paginated, append-only audit records. Every administrative mutation requires a reason.
- Integrations: actual configuration and implementation status, without exposing secrets.
- Training: linked admin workflow for private datasets, approvals, external manual training, delivery, and notifications.

## Activation

1. Complete `docs/SUPABASE-SETUP.md`, create and confirm the intended operator account, and obtain its UUID from Supabase Auth.
2. Configure `SUPER_ADMIN_USER_IDS=supabase:<operator UUID>` in hosted server settings, then publish/restart to apply it. Keep administrator access configuration outside client code.
3. Sign in and open More tools → Super admin, or `/admin` directly.
4. Configure and test payment/generation/email providers separately before accepting real users or money. Adding provider keys alone does not wire the live generation or payment backend into this preview.

Suspension is enforced centrally on authenticated workspace APIs, including private media and training file access. Existing sessions cannot bypass the suspension. Signed-in page chrome may still render, but its API requests are denied. Suspended users can sign out normally.
