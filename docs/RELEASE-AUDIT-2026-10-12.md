# Live demo release audit — 12 October 2026

This is a demo release with real generation, not a paid marketplace launch. The owner requested publication of all accumulated changes and a list of remaining problems.

## Release changes and checks

- Character administration, private portrait uploads, immutable purchased portrait versions, explicit version upgrades, and evidence-based approval.
- Demo credit purchases, invitation controls, audited grants, price-consent checks, per-user and shared provider budgets, and recovery without duplicate paid submissions.
- Manual LoRA requests, private datasets and ZIP export, administrator delivery, durable in-app/email outbox handling, and storage cleanup through the existing jobs scheduler.
- Public catalog follows approved character records, with responsive navigation, reduced-motion support, improved transitions, and clearer Studio candidate-reference labels.
- Separate persistent local live-testing workspace; its local admin identity and test database are not production authentication.
- Production migration 007 was applied transactionally. It preserves operator-funded demo accounts and existing demo buyers, as well as purchased/queued portrait identities. Automatic welcome grants alone do not add a tester invitation.
- Deployment uncovered a Vercel Hobby limitation: once-per-minute Vercel cron jobs are rejected. Background scheduling now uses Supabase Cron, pg_net and a Vault-held request secret instead of a Vercel cron declaration.
- 98 automated tests passed across SQLite and isolated PostgreSQL/PGlite. TypeScript and the optimized Next.js build passed. Lint has zero errors and 24 existing native-image optimization warnings.
- Security patches: sharp 0.35.5 and source-map-js 1.2.2. The production npm audit reports zero known vulnerabilities after patching. References: [sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
- Real local generation on 6 October completed with the exact uploaded Nika portrait: Qwen Image Edit (768×1024) and Kling 3.0 (five seconds, 720×1280). Both outputs were saved privately, retrieved and inspected. Total provider spend was $0.44; 132 demo credits were deducted once. Request replay, budget rejection, and restart persistence passed. These were local live-service checks, not new paid tests of this hosted release.

## Known remaining blockers and limitations

| Priority | Feature | Current limitation | Required next step |
| --- | --- | --- | --- |
| High | New character purchases and public catalog | The two existing hosted portraits have historical approval but no complete reviewed-model evidence. Migration preserves existing buyers; it does not fabricate QA. New sales/public listing stay closed until the character passes the new review gate. | Super admin must generate, inspect and select examples from every enabled image/video model, then approve the character. |
| High | Nika portrait on the hosted site | Nika and her two QA results were saved in the isolated local live workspace. A code deployment does not copy that local database into production. Hosted Valentina and Isla records remain intact. | Upload the intended final portrait in the live character editor and complete its live QA review before publishing. |
| High for paid launch | Payments, paid credit top-ups, refunds and seller payouts | No payment processor is connected to the running app. This remains intentional per the owner's instruction to use demo credits. | Connect and validate a payment provider before accepting money. |
| Medium | Google login | Google login is disabled in the saved service configuration; no live Google OAuth round trip was verified. | Configure the Google provider/client and allowed redirects, then enable and test it. |
| Medium | LoRA email notifications | Production environment has no Resend key, sender or admin-recipient configuration. In-app notifications and the durable outbox work; emails cannot be delivered. | Configure a verified sender and admin recipients, then test real delivery. |
| Medium | New tester onboarding | This is an invited demo. New accounts receive zero automatic credits and need a super-admin invitation and explicit credit grant. | Invite each tester in Super admin → Users and allocate demo credits. |
| Medium | Using delivered LoRA weights in Studio | Manual training requests, delivery and downloads exist. Loading delivered `.safetensors` into Qwen/GPT/Kling inference is not implemented. | Add a compatible inference backend and validated weight-loading workflow. |
| Medium | Supabase signup/reset email and Google OAuth | These flows have automated coverage but a real inbox/OAuth completion was not exercised for this release. The random demo email has no inbox. | Test with controlled real email addresses; an administrator must reset the synthetic demo account if needed. |
| Medium | Automated training, seller payouts, social/community features, media editing | These are not fully implemented production services. Manual training and curated character generation are the supported demo scope. | Implement separately; do not describe them as live capabilities. |
| Low | Image performance | 24 `next/no-img-element` warnings remain; no lint errors. | Optimize suitable public images while preserving authenticated media access. |

## Evidence boundaries

Automated tests cover account isolation, permissions, credit ledger invariants, duplicate requests, failed/uncertain provider jobs, character checkout and upgrades, LoRA validation/delivery/ZIP, email retry behavior, and cleanup. They do not prove every physical device, load level, provider model, email inbox, or payment integration works. The real local image/video tests cover Qwen and Kling; both GPT variants still need their own real output/identity review.

No production table export was performed. A proposed full local backup was rejected by automatic approval review; the rollout used limited read-only aggregate checks and an atomic migration instead. Credentials, local QA databases, output files and account passwords remain ignored and are not part of the GitHub/Vercel source upload.
