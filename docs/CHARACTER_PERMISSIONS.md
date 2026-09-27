# Character administration

Super administrators (the server's `SUPER_ADMIN_USER_IDS` allowlist) manage the five launch characters in Super Admin → Characters: name, adult age, category, description, displayed price, availability and featured placement. Disabled characters cannot be claimed or used for new generations. Existing purchases and generation history are retained.

Super Admin → Users → Permissions controls catalog viewing and generation for all characters or one character. Both scopes must allow an action. Allowing generation never grants ownership, bypasses paid-license checks, or makes an unfinished portrait ready. Training administrators and ordinary users cannot access these management APIs. Every successful change requires a reason and is recorded in the activity log.

Viewing restrictions apply to the authenticated catalog and model library; they are not a privacy mechanism for public promotional artwork or previously generated outputs. The public welcome page remains a static launch teaser. Super admins can upload and approve a replacement reference portrait in the profile editor. The panel does not create additional launch characters. See CHARACTER_STUDIO.md for checkout and reference delivery.

Apply `node --env-file=.env.vercel.local scripts/migrate-characters.mjs` before deploying. The additive migration preserves existing data and is safe to rerun. New installations apply it through `scripts/migrate-vercel.mjs`.
