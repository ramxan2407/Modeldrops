import { spawnSync } from "node:child_process";
const target = process.argv[2] || "preview";
if (!["preview", "production"].includes(target))
  throw new Error("Choose preview or production");
const keys = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_GOOGLE_ENABLED",
  "SUPER_ADMIN_USER_IDS",
  "STORAGE_ENDPOINT",
  "STORAGE_REGION",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "MAX_LORA_UPLOAD_BYTES",
];
for (const key of keys) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
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
    { input: value, encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(`Could not save ${key}; CLI exit ${r.status}.`);
    process.exit(1);
  }
  console.log(`Saved ${key}`);
}
