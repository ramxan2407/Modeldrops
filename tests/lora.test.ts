import test from "node:test";
import assert from "node:assert/strict";
import { fixture, png } from "./helpers/lora-fixture";
import { spawnSync } from "node:child_process";
import { deliverTrainingEmails } from "../lib/lora/email";
import { LoraError, PART_SIZE, validateSafetensors } from "../lib/lora/types";
import { zipFiles } from "../lib/lora/zip";
const draft = {
  characterName: "Nova",
  characterType: "Human",
  triggerWord: "nova_person",
  notes: "Keep freckles",
};
const rejects = (promise: Promise<unknown>, status: number) =>
  assert.rejects(
    promise,
    (e: any) => e instanceof LoraError && e.status === status,
  );
async function submitted(f: ReturnType<typeof fixture>) {
  const r = await f.alice.createDraft(draft);
  for (let i = 0; i < 15; i++)
    await f.alice.uploadImage(r.id, "dataset", i + ".png", png);
  await f.alice.submit(r.id);
  return r.id;
}
async function advance(f: ReturnType<typeof fixture>, id: string, status: any) {
  const r = await f.admin.request(id);
  return f.admin.transition(id, r.revision, status);
}
function weights(size = 256) {
  const header = new TextEncoder().encode(
    JSON.stringify({
      tensor: { dtype: "F32", shape: [1], data_offsets: [0, 4] },
    }),
  );
  const data = new Uint8Array(size);
  new DataView(data.buffer).setBigUint64(0, BigInt(header.length), true);
  data.set(header, 8);
  return data;
}
test("dataset validation, private ownership, immutable submissions, durable notifications", async () => {
  const f = fixture();
  await rejects(f.alice.createDraft({ ...draft, characterName: " " }), 400);
  await rejects(
    f.alice.createDraft({ ...draft, characterType: "invalid" }),
    400,
  );
  const { id } = await f.alice.createDraft(draft);
  await rejects(f.alice.submit(id), 400);
  await rejects(f.bob.request(id), 404);
  await rejects(f.bob.state(true), 403);
  await rejects(
    f.alice.uploadImage(
      id,
      "dataset",
      "fake.png",
      new TextEncoder().encode("<svg/>"),
    ),
    400,
  );
  await rejects(f.alice.uploadImage(id, "dataset", "x.svg", png), 400);
  const image = await f.alice.uploadImage(id, "dataset", "first.png", png);
  await rejects(f.bob.file(image.id), 404);
  await rejects(f.bob.removeFile(image.id), 404);
  for (let i = 1; i < 15; i++)
    await f.alice.uploadImage(id, "dataset", i + ".png", png);
  assert.equal(f.objects.size, 15);
  await f.alice.submit(id);
  assert.equal((await f.alice.request(id)).status, "pending");
  assert.equal((await f.bob.state()).requests.length, 0);
  assert.equal((await f.admin.state(true)).requests.length, 1);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM training_events").get()!.n,
    1,
  );
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM training_emails").get()!.n,
    3,
  );
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM notifications").get()!.n,
    2,
  );
  await f.alice.submit(id);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM training_emails").get()!.n,
    3,
  );
  await rejects(f.alice.uploadImage(id, "dataset", "late.png", png), 409);
  await rejects(f.alice.removeFile(image.id), 409);
  await rejects(f.alice.deleteDraft(id), 409);
  await rejects(f.alice.transition(id, 1, "approved"), 403);
});
test("admin settings are enforced on server and drafts can be removed", async () => {
  const f = fixture();
  await rejects(f.alice.setSettings({ maxImageMb: 1 }), 403);
  await rejects(f.admin.setSettings({ maxImageMb: 26 }), 400);
  await f.admin.setSettings({ maxImageMb: 1 });
  const { id } = await f.alice.createDraft(draft);
  await rejects(
    f.alice.uploadImage(id, "dataset", "big.png", new Uint8Array(1048577)),
    413,
  );
  await f.alice.uploadImage(id, "dataset", "one.png", png);
  await f.alice.deleteDraft(id);
  assert.equal(f.objects.size, 0);
  await rejects(f.alice.request(id), 404);
});
test("status transitions reject skipping, stale edits, and duplicate concurrent notifications", async () => {
  const f = fixture(),
    id = await submitted(f);
  const r = await f.admin.request(id);
  await rejects(f.admin.transition(id, r.revision, "completed"), 409);
  const results = await Promise.allSettled([
    f.admin.transition(id, r.revision, "approved"),
    f.admin.transition(id, r.revision, "approved"),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    f.sql
      .prepare("SELECT COUNT(*) n FROM training_events WHERE status='approved'")
      .get()!.n,
    1,
  );
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM training_emails").get()!.n,
    4,
  );
  await rejects(f.admin.transition(id, r.revision, "training"), 409);
  await rejects(
    f.admin.transition(id, (await f.admin.request(id)).revision, "rejected"),
    400,
  );
  await f.admin.transition(
    id,
    (await f.admin.request(id)).revision,
    "rejected",
    "Please provide sharper images.",
  );
  assert.equal(
    (await f.alice.request(id)).rejection_reason,
    "Please provide sharper images.",
  );
  await rejects(advance(f, id, "approved"), 409);
});
test("missing objects cannot be submitted", async () => {
  const f = fixture(),
    r = await f.alice.createDraft(draft);
  for (let i = 0; i < 15; i++)
    await f.alice.uploadImage(r.id, "dataset", i + ".png", png);
  f.objects.delete(f.objects.keys().next().value!);
  await rejects(f.alice.submit(r.id), 409);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM training_events").get()!.n,
    0,
  );
});
test("manual delivery supports chunk retries, gated completion, isolation, and user deletion", async () => {
  const f = fixture(),
    id = await submitted(f);
  await advance(f, id, "approved");
  await advance(f, id, "training");
  await advance(f, id, "quality_check");
  const r = await f.admin.request(id);
  await rejects(f.admin.transition(id, r.revision, "completed", "", {}), 400);
  await rejects(f.alice.startWeights(id, "model.safetensors", 256), 403);
  await rejects(f.admin.startWeights(id, "model.pt", 256), 400);
  const data = weights(PART_SIZE + 128);
  const file = await f.admin.startWeights(id, "nova.safetensors", data.length);
  await rejects(f.admin.completeWeights(file.id), 400);
  await rejects(f.admin.uploadPart(file.id, 1, new Uint8Array(PART_SIZE)), 400);
  await f.admin.uploadPart(file.id, 1, data.slice(0, PART_SIZE));
  await f.admin.uploadPart(file.id, 1, data.slice(0, PART_SIZE));
  assert.deepEqual((await f.admin.uploadProgress(file.id)).parts, [1]);
  await f.admin.uploadPart(file.id, 2, data.slice(PART_SIZE));
  await f.admin.completeWeights(file.id);
  await f.admin.completeWeights(file.id);
  await rejects(f.alice.file(file.id), 404);
  const cover = await f.admin.uploadImage(id, "cover", "cover.png", png);
  await f.admin.transition(id, r.revision, "completed", "", {
    fileId: file.id,
    coverId: cover.id,
    triggerWord: "nova_person",
    recommendedPrompt: "Portrait of nova_person",
    version: "1.0",
    description: "Use strength 0.8",
  });
  assert.equal((await f.alice.state()).loras.length, 1);
  assert.equal((await f.bob.state()).loras.length, 0);
  const lora = (await f.alice.state()).loras[0];
  await f.alice.file(file.id);
  await rejects(f.bob.file(file.id), 404);
  await rejects(f.bob.deleteLora(lora.id), 404);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM training_events").get()!.n,
    5,
  );
  await f.alice.deleteLora(lora.id);
  assert.equal((await f.alice.state()).loras.length, 0);
  await rejects(f.alice.file(file.id), 404);
  assert.equal((await f.alice.request(id)).status, "completed");
  assert.equal(f.objects.size, 15);
});
test("outbox retains unconfigured mail, leases concurrency, retries failures with stable idempotency keys", async () => {
  const f = fixture();
  await submitted(f);
  assert.deepEqual(await deliverTrainingEmails(f.env), {
    configured: false,
    sent: 0,
  });
  f.env.RESEND_API_KEY = "test";
  f.env.LORA_EMAIL_FROM = "test@example.test";
  const sent: string[] = [];
  const fetcher = (async (_url: any, init: any) => {
    sent.push(init.headers["Idempotency-Key"]);
    return Response.json({ id: "receipt" });
  }) as typeof fetch;
  await Promise.all([
    deliverTrainingEmails(f.env, fetcher),
    deliverTrainingEmails(f.env, fetcher),
  ]);
  assert.equal(sent.length, 3);
  assert.equal(new Set(sent).size, 3);
  await deliverTrainingEmails(f.env, fetcher);
  assert.equal(sent.length, 3);
  await advance(f, (await f.alice.state()).requests[0].id, "approved");
  const failFetch = (async () =>
    new Response("", { status: 429 })) as typeof fetch;
  await deliverTrainingEmails(f.env, failFetch);
  const row = f.sql
    .prepare("SELECT * FROM training_emails WHERE status='pending'")
    .get()!;
  assert.equal(row.attempts, 1);
  f.sql
    .prepare("UPDATE training_emails SET lease_until=0 WHERE id=?")
    .run(row.id!);
  await deliverTrainingEmails(f.env, fetcher);
  assert(sent.includes("lora-email/" + row.id));
});
test("ZIP opens in a standard reader with correct names, sizes, CRCs and bytes", async () => {
  const files = [
    { name: "images/001-nova.png", open: async () => new Blob([png]).stream() },
    {
      name: "images/002-portrait.png",
      open: async () => new Blob([png]).stream(),
    },
  ];
  const chunks = [];
  for await (const bytes of zipFiles(files)) chunks.push(bytes);
  const zip = Buffer.concat(chunks);
  const result = spawnSync(
    "python3",
    [
      "-c",
      'import zipfile,io,sys; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; assert len(z.namelist())==2; assert z.read(z.namelist()[0]).startswith(b"\\x89PNG"); print("valid")',
    ],
    { input: zip },
  );
  assert.equal(result.status, 0, result.stderr.toString());
  assert.match(result.stdout.toString(), /valid/);
});
test("safetensors validation rejects executable formats and invalid offsets", () => {
  assert.throws(
    () => validateSafetensors(new Uint8Array([0x80, 0x04, 0x95]), 100),
    LoraError,
  );
  const valid = weights();
  assert.doesNotThrow(() => validateSafetensors(valid, valid.length));
  assert.throws(() => validateSafetensors(valid, 50), LoraError);
});
