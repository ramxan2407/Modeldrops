import test from "node:test";
import assert from "node:assert/strict";
import config from "../next.config";

test("form destinations remain restricted and allow only the configured Google OAuth chain", async () => {
  const previous = {
    url: process.env.SUPABASE_URL,
    google: process.env.SUPABASE_GOOGLE_ENABLED,
  };
  const csp = async () =>
    (await config.headers!())[0].headers.find(
      (h) => h.key === "Content-Security-Policy",
    )!.value;
  try {
    process.env.SUPABASE_GOOGLE_ENABLED = "false";
    process.env.SUPABASE_URL = "https://auth.example.test";
    assert((await csp()).endsWith("form-action 'self'"));
    process.env.SUPABASE_GOOGLE_ENABLED = "true";
    assert(
      (await csp()).endsWith(
        "form-action 'self' https://auth.example.test https://accounts.google.com",
      ),
    );
    assert((await csp()).includes("frame-ancestors 'none'"));
    for (const invalid of [
      "",
      "http://auth.example.test",
      "https://user:secret@auth.example.test",
    ]) {
      process.env.SUPABASE_URL = invalid;
      await assert.rejects(csp());
    }
  } finally {
    if (previous.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previous.url;
    if (previous.google === undefined)
      delete process.env.SUPABASE_GOOGLE_ENABLED;
    else process.env.SUPABASE_GOOGLE_ENABLED = previous.google;
  }
});
