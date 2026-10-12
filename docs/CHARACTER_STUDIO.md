# Character access → native reference Studio

The character is an identity reference, not a separately trained generation model. Purchases pin an immutable portrait version. Buyers choose an unlocked character and then a supported generation engine. Qwen Image Edit and the two GPT Image 2.5 variants receive the approved portrait as their edit input. Kling 3.0 Standard uses its image-to-video endpoint with that portrait as the first frame. Video framing comes from the portrait. Outputs can vary; reference conditioning does not guarantee exact likeness or provide a trained LoRA.

## Admin preparation

Super Admin → Characters → Edit. Upload an original fictional adult JPG, PNG or WebP (up to 8 MB) and save Pending. Super-admin Studio requests are candidate QA and still consume credits/provider budget. Complete and inspect examples using every offered image/video engine, select them in the editor, and approve. Evidence must be completed provider output using the exact portrait. Approval publishes a public portrait preview from private storage; private datasets and user generations are never published with it.

## Checkout and ownership

Character details → Review character access → license and price review → checkout → Studio with the character selected. Generation credits are separate from the character license. Character orders and entitlements are separate from the old `demo-1` preview claims. Those old claims cannot unlock live generation. Approved references are required before checkout.

Payments are intentionally disconnected. With `DEMO_MODE=true`, approved testers purchase characters using assigned demo credits. New accounts receive zero credits. Checkout verifies generation permission, exact portrait version, price and license acceptance before charging atomically. Legacy free preview claims grant no generation access. See [demo setup](DEMO_TESTING.md).

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

The dashboard separates usable models from historical license and preview records. Studio starts with a purchased-character selector sourced only from server-verified access. It preserves a valid selection and otherwise defaults to the newest ready, permitted purchase, falling back to a pending owned character with a readiness notice. Disabled, hidden and unowned characters are absent from the selector. Retired or unowned character links show a notice when a replacement is selected. The URL follows the selected character, and image/video switching preserves it. Empty libraries show a browse action and cannot generate. Checkout can refresh a stale price or recover from a failed library refresh without charging or creating another order.

## Deployment

New database installations include migrations `004_character_checkout.sql` and `005_character_reference_snapshot.sql`. Existing environments run `node --env-file=<isolated-env-file> scripts/migrate-character-checkout.mjs` after the character-management and provider-job migrations. The command applies both additive migrations. Ready jobs created before reference snapshots were introduced are cancelled with a refund; already-submitted jobs retain their original delivery flow. No production migration or configuration is applied as part of this development change. The five launch profiles still require approved portraits. Test data and mocked generation fixtures are not production assets or output validation.

Video API specification: https://wavespeed.ai/docs/docs-api/kwaivgi/kwaivgi-kling-v3.0-std-image-to-video
Pricing reference: https://wavespeed.ai/models/kwaivgi/kling-v3.0-std/image-to-video
The published reservation remains $0.084/second, or $0.126/second with sound. User charges retain the existing credit schedule: 120 credits per five seconds, 1.5× with sound.
