import { spawnSync } from "node:child_process";
import { credentialsFor } from "../lib/higgsfield/credentials.mjs";
const credentials = credentialsFor(process.env);
if (!credentials)
  throw new Error(
    "Save the entire copied Higgsfield API key in HF_CREDENTIALS (ID:secret).",
  );
process.env.HF_CREDENTIALS = credentials;
const target = process.argv[2] || "preview";
if (!["preview", "production"].includes(target))
  throw new Error("Choose preview or production");
const keys = [
  "HF_CREDENTIALS",
  "HIGGSFIELD_ENABLED",
  "HIGGSFIELD_DAILY_LIMIT_USD",
  "CRON_SECRET",
  "WELCOME_CREDITS",
];
for (const key of keys)
  if (!process.env[key])
    throw new Error(`Set ${key} in the ignored environment file.`);
if (process.env.HIGGSFIELD_ENABLED !== "true")
  throw new Error("Set HIGGSFIELD_ENABLED=true to activate.");
if (process.env.CRON_SECRET.length < 32)
  throw new Error("Use a random CRON_SECRET of at least 32 characters.");
for (const key of [
  ...keys,
  ...(process.env.HIGGSFIELD_OUTPUT_HOSTS ? ["HIGGSFIELD_OUTPUT_HOSTS"] : []),
]) {
  const r = spawnSync(
    "vercel",
    [
      "env",
      "add",
      key,
      target,
      "--force",
      "--yes",
      "--sensitive",
      "--global-config",
      ".vercel-auth",
    ],
    { input: process.env[key], encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(`Could not save ${key}.`);
    process.exit(1);
  }
  console.log(`Saved ${key}`);
}
