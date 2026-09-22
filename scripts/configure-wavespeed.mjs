import { spawnSync } from "node:child_process";
const key = process.env.WAVESPEED_API_KEY?.trim();
if (!key || /\s/.test(key))
  throw new Error(
    "Save WAVESPEED_API_KEY in the ignored .env.vercel.local file first.",
  );
const target = process.argv[2] || "preview";
if (!["preview", "production"].includes(target))
  throw new Error("Choose preview or production.");
// Validate authentication without starting a paid generation.
const check = await fetch("https://api.wavespeed.ai/api/v3/balance", {
  headers: { Authorization: `Bearer ${key}` },
  redirect: "error",
  signal: AbortSignal.timeout(20000),
});
if (!check.ok)
  throw new Error(
    `WaveSpeed key verification failed (HTTP ${check.status}). No deployment settings were changed.`,
  );
const body = await check.json();
if (body.code !== 200 || typeof body.data?.balance !== "number")
  throw new Error("WaveSpeed returned an unexpected balance response.");
console.log(
  `WaveSpeed authenticated. Available provider balance: $${body.data.balance.toFixed(4)}`,
);
const values = {
  WAVESPEED_API_KEY: key,
  WAVESPEED_ENABLED: "true",
  WAVESPEED_DAILY_LIMIT_USD: process.env.WAVESPEED_DAILY_LIMIT_USD || "5",
  WELCOME_CREDITS: "0",
  CRON_SECRET: process.env.CRON_SECRET,
};
if (!values.CRON_SECRET || values.CRON_SECRET.length < 32)
  throw new Error("Set a random CRON_SECRET of at least 32 characters.");
const limit = Number(values.WAVESPEED_DAILY_LIMIT_USD);
if (!Number.isFinite(limit) || limit <= 0 || limit > 10000)
  throw new Error("Invalid provider daily limit.");
if (process.env.WAVESPEED_OUTPUT_HOSTS)
  values.WAVESPEED_OUTPUT_HOSTS = process.env.WAVESPEED_OUTPUT_HOSTS;
for (const [name, value] of Object.entries(values)) {
  const result = spawnSync(
    "vercel",
    [
      "env",
      "add",
      name,
      target,
      "--force",
      "--yes",
      "--sensitive",
      "--global-config",
      ".vercel-auth",
      "--scope",
      "model-drops-ramxan87",
    ],
    { input: value, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`Could not save ${name}.`);
  console.log(`Saved ${name}`);
}
