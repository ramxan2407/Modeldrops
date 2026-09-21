# Model Drops authentication activation

Email/password and Google are the only application login methods. Supabase verifies sessions on the server; ChatGPT headers and the former local test cookie do not grant access. Signup, email confirmation, password recovery, session refresh, and sign-out are implemented. Live provider configuration is still required.

## Connect the project

Connect the Supabase plugin in Codex, or provide the project's URL and **publishable** key from the Supabase Connect dialog. Do not provide a service-role key. Set these production runtime values through Sites (and matching local values in an ignored environment file):

| Variable                   | Value                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `SUPABASE_URL`             | Your project's HTTPS URL                                                             |
| `SUPABASE_PUBLISHABLE_KEY` | Your `sb_publishable_…` key                                                          |
| `APP_ORIGIN`               | `https://forma-creation-studio.ramzan87.chatgpt.site` (replace when changing domain) |
| `SUPABASE_GOOGLE_ENABLED`  | `true` after configuring the Google provider; otherwise `false`                      |

No database secret, SMTP password, or Google client secret belongs in frontend code. Google credentials and SMTP credentials are configured in Supabase itself.

## Supabase dashboard

1. Enable email/password authentication and **Confirm email**. Set the minimum password length to 12. Keep secure email-change verification enabled.
2. Set Site URL to the exact `APP_ORIGIN`. Allow `https://forma-creation-studio.ramzan87.chatgpt.site/auth/complete**` as an additional redirect URL; the query string carries a random browser-bound flow identifier. Restrict this to your exact app origin and callback path. Add a localhost equivalent only to a development project.
3. Keep signup and recovery templates using Supabase's `{{ .ConfirmationURL }}`. The app uses PKCE: email links must be opened in the same browser that requested them. Starting another email/OAuth flow invalidates the previous browser verifier; the UI asks users to restart when this happens.
4. Configure custom SMTP through **Resend** with a verified sending domain. Supabase's default sender is for restricted testing and cannot deliver production account emails to arbitrary users.
5. In **Google Cloud Console**, create an OAuth web client, configure the consent screen, and use the Supabase callback URL shown by the Google provider settings. Enter the client ID and secret in Supabase, enable the provider, and set `SUPABASE_GOOGLE_ENABLED=true` in the app runtime.
6. Before opening public registration, configure rate limits and bot protection for signup/reset endpoints. CAPTCHA token forwarding and a Turnstile widget are follow-up work; do not enable CAPTCHA at Supabase until the client is wired for it.

## Hosting and existing records

The existing Site has an owner-only access policy, which requires ChatGPT at the hosting layer even though the app itself no longer uses ChatGPT. Opening the app to real customers requires an explicit public access change after the new authentication has been configured and tested. All dashboard/API routes remain Supabase-authenticated when the login page is public.

Existing demo records remain in D1. Supabase users get stable IDs of the form `supabase:<user UUID>`. The app deliberately does not merge accounts using an email address or client-supplied ID. If old demo records should move to a new account, perform an explicit, ownership-verified migration. The 49-table PostgreSQL production schema is separate; choosing Supabase Auth does not silently migrate the application's database.

## Verification before activation

Use two confirmed test users in an isolated Supabase development project. Verify signup/confirmation, incorrect passwords, Google return, expired callbacks, password reset, refresh, logout, and cross-account access to purchases/projects/media. Confirm session cookies are Secure, HttpOnly and SameSite=Lax and that auth responses are not cached. The automated SDK tests use a mock provider and are not evidence of a live Google or SMTP connection.

Sources: [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [server-side sessions](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [Resend SMTP](https://resend.com/docs/send-with-supabase-smtp).
