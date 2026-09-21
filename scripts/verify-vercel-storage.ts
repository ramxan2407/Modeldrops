import assert from "node:assert/strict";
import { privateBucket } from "../lib/vercel/storage";
const bucket = privateBucket();
if (!bucket) throw new Error("Storage settings missing");
const key = "migration-check/" + crypto.randomUUID();
try {
  const data = new TextEncoder().encode("Model Drops private storage check");
  const url = await bucket.signedUpload(key, data.length);
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });
  assert.equal(response.ok, true, `Signed upload returned ${response.status}`);
  assert.equal((await bucket.head(key))?.size, data.length);
  const object = await bucket.get(key);
  assert(object);
  assert.equal(
    await new Response(object.body).text(),
    new TextDecoder().decode(data),
  );
  const anonymous = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.STORAGE_BUCKET}/${key}`,
  );
  assert.equal(anonymous.ok, false, "Storage must remain private");
  const preflight = await fetch(url, {
    method: "OPTIONS",
    headers: {
      Origin: "https://model-drops-preview.vercel.app",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert(
    preflight.headers.get("access-control-allow-origin"),
    "Storage must accept browser uploads",
  );
  console.log(
    "Private storage: signed upload, download, size, browser CORS, anonymous denial passed",
  );
} finally {
  await bucket.delete(key);
}
