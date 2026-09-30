# Character access → native reference Studio

The character is an identity reference, not a separately trained generation model. Buyers choose an unlocked character and then a supported generation engine. Qwen Image Edit and the two GPT Image 2.5 variants receive the approved portrait as their edit input. Kling 3.0 Standard uses its image-to-video endpoint with that portrait as the first frame. Video framing comes from the portrait. Outputs can vary; reference conditioning does not guarantee exact likeness or provide a trained LoRA.

## Admin preparation

Super Admin → Characters → Edit → Approved reference portrait. Upload an approved fictional adult JPG, PNG or WebP (up to 8 MB), review the preview and save the profile. The server only accepts the admin's own uploaded image or the character's existing approved asset. The file remains in private storage. Authenticated users with catalog viewing permission can see the portrait through the character reference route; generation receives a signed storage URL after access checks.

## Checkout and ownership

Character details → Review character access → license and price review → checkout → Studio with the character selected. Generation credits are separate from the character license. Character orders and entitlements are separate from the old `demo-1` preview claims. Those old claims cannot unlock live generation. Approved references are required before checkout.

Payments are intentionally disconnected. The checkout reports this without taking payment or granting paid access. For a **separate local/test database**, set `CHARACTER_TEST_CHECKOUT=true`. This enables clearly labeled test checkout, stores `test_completed` orders and test entitlements, and never charges money. Test checkout and test entitlements are rejected when `VERCEL_ENV=production`. Do not connect preview credentials to production; the user selected isolated preview environments. If a test environment explicitly has live generation configured, its generation still uses real API balance and user credits.

A future payment adapter must create payment-mode orders and entitlements only after validating provider payment status, ownership, amount, currency and unique provider event IDs. No public API currently creates paid orders or trusts a browser success redirect.

## Enforcement

- A character is required to submit generation or request an image quote.
- The server checks availability, user permissions and an active paid/test entitlement.
- Client-provided identity images are replaced by the approved character reference.
- Workers recheck ownership, permission, account suspension and availability before paid submission; rejected queued jobs refund reserved credits.
- Every new request records the approved reference identity. If that reference changes or is removed before submission, the job fails with one credit refund and no provider spend. Signed URLs are refreshed for the same reference immediately before submission. Already-submitted jobs continue polling without being resubmitted.
- Revoked entitlements cannot fall back to older paid receipts. Checkout retries do not reactivate revoked access.
- Character access, uploaded references and outputs are user-scoped; reference administration is super-admin-only.
- Existing credit reservation, polling, private output storage and idempotent refunds remain in use.

The dashboard separates usable models from historical license and preview records. Retired character links show an unavailable notice in Studio. Checkout can refresh a stale price or recover from a failed library refresh without charging or creating another order.

## Deployment

New database installations include migrations `004_character_checkout.sql` and `005_character_reference_snapshot.sql`. Existing environments run `node --env-file=<isolated-env-file> scripts/migrate-character-checkout.mjs` after the character-management and provider-job migrations. The command applies both additive migrations. Ready jobs created before reference snapshots were introduced are cancelled with a refund; already-submitted jobs retain their original delivery flow. No production migration or configuration is applied as part of this development change. The five launch profiles still require approved portraits. Test data and mocked generation fixtures are not production assets or output validation.

Video API specification: https://wavespeed.ai/docs/docs-api/kwaivgi/kwaivgi-kling-v3.0-std-image-to-video
Pricing reference: https://wavespeed.ai/models/kwaivgi/kling-v3.0-std/image-to-video
The published reservation remains $0.084/second, or $0.126/second with sound. User charges retain the existing credit schedule: 120 credits per five seconds, 1.5× with sound.
