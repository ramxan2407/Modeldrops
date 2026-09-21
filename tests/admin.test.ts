import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/lora-fixture";
import { AdminService, AdminError, catalogFor } from "../lib/admin/service";
import { roleFor, sameOrigin } from "../lib/admin/policy";
import { models, packages } from "../lib/catalog";
import { LoraService } from "../lib/lora/service";
function setup() {
  const f = fixture();
  for (const m of models)
    f.sql
      .prepare(
        "INSERT INTO ai_models(id,name,provider,type,credits,enabled,config) VALUES(?,?,?,?,?,1,?)",
      )
      .run(m.id, m.name, m.provider, m.type, m.credits, JSON.stringify(m));
  for (const p of packages)
    f.sql
      .prepare(
        "INSERT INTO credit_packages(id,name,price,credits) VALUES(?,?,?,?)",
      )
      .run(p.id, p.name, p.price, p.credits);
  const roles = { SUPER_ADMIN_USER_IDS: "admin", ADMIN_USER_IDS: "bob" };
  return {
    ...f,
    superadmin: new AdminService(f.env.DB, roles, "admin"),
    ordinary: new AdminService(f.env.DB, roles, "alice"),
    staff: new AdminService(f.env.DB, roles, "bob"),
  };
}
const rejected = (p: Promise<unknown>, status: number) =>
  assert.rejects(p, (e: any) => e instanceof AdminError && e.status === status);
test("super admin and training admin permissions are separate and fail closed", async () => {
  const f = setup();
  assert.equal(roleFor({}, "admin"), "user");
  assert.equal(roleFor({ ADMIN_USER_IDS: "admin" }, "admin"), "training_admin");
  await rejected(f.ordinary.state("users"), 403);
  await rejected(f.staff.state("users"), 403);
  await rejected(
    f.staff.mutate("credits", {
      id: "alice",
      amount: 10,
      key: crypto.randomUUID(),
      reason: "Attempt credit grant",
    }),
    403,
  );
  assert.equal(((await f.superadmin.state("users")) as any).rows.length, 3);
  const service = new LoraService(
    { ...f.env, ADMIN_USER_IDS: "", SUPER_ADMIN_USER_IDS: "admin" },
    { userId: "admin", email: "admin@example.test" },
  );
  assert.equal(service.admin, true);
});
test("credit adjustments are atomic, append-only, replay safe and cannot overdraw", async () => {
  const f = setup();
  const d = {
    id: "alice",
    amount: 100,
    key: crypto.randomUUID(),
    reason: "Test account allocation",
  };
  await Promise.all([
    f.superadmin.mutate("credits", d),
    f.superadmin.mutate("credits", d),
  ]);
  assert.equal(
    f.sql
      .prepare(
        "SELECT SUM(amount) total FROM credit_transactions WHERE user_id=?",
      )
      .get("alice")!.total,
    100,
  );
  assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM audit_logs").get()!.n, 1);
  assert.equal(
    f.sql.prepare("SELECT COUNT(*) n FROM notifications").get()!.n,
    1,
  );
  await rejected(f.superadmin.mutate("credits", { ...d, amount: 200 }), 409);
  await rejected(f.superadmin.mutate("credits", { ...d, id: "bob" }), 409);
  await rejected(
    f.superadmin.mutate("credits", {
      ...d,
      amount: -101,
      key: crypto.randomUUID(),
    }),
    409,
  );
  assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM audit_logs").get()!.n, 1);
  await f.superadmin.mutate("credits", {
    ...d,
    amount: -100,
    key: crypto.randomUUID(),
  });
  assert.equal(
    f.sql
      .prepare(
        "SELECT SUM(amount) total FROM credit_transactions WHERE user_id=?",
      )
      .get("alice")!.total,
    0,
  );
  assert.throws(
    () => f.sql.exec("UPDATE audit_logs SET action='forged'"),
    /append-only/,
  );
  assert.throws(() => f.sql.exec("DELETE FROM audit_logs"), /append-only/);
  assert.throws(
    () => f.sql.exec("UPDATE credit_transactions SET amount=99"),
    /append-only/,
  );
});
test("user suspension is reversible and cannot lock out privileged operators", async () => {
  const f = setup();
  await f.superadmin.mutate("user", {
    id: "alice",
    suspended: true,
    reason: "Investigating abuse report",
  });
  assert.equal(
    f.sql.prepare("SELECT suspended FROM users WHERE id=?").get("alice")!
      .suspended,
    1,
  );
  await f.superadmin.mutate("user", {
    id: "alice",
    suspended: false,
    reason: "Investigation completed",
  });
  assert.equal(
    f.sql.prepare("SELECT suspended FROM users WHERE id=?").get("alice")!
      .suspended,
    0,
  );
  for (const id of ["admin", "bob"])
    await rejected(
      f.superadmin.mutate("user", {
        id,
        suspended: true,
        reason: "Invalid operator change",
      }),
      409,
    );
});
test("catalog and model changes persist with audit records and validated bounds", async () => {
  const f = setup();
  await f.superadmin.mutate("character", {
    id: "nova",
    price: 42,
    enabled: false,
    featured: true,
    reason: "Temporarily withdraw listing",
  });
  assert.equal(
    (await catalogFor(f.env.DB)).find((c) => c.id === "nova")!.enabled,
    false,
  );
  assert.equal(
    (await catalogFor(f.env.DB)).find((c) => c.id === "nova")!.price,
    42,
  );
  await f.superadmin.mutate("model", {
    id: models[0].id,
    credits: 75,
    enabled: false,
    reason: "Model maintenance window",
  });
  assert.equal(
    f.sql.prepare("SELECT enabled FROM ai_models WHERE id=?").get(models[0].id)!
      .enabled,
    0,
  );
  await rejected(
    f.superadmin.mutate("model", {
      id: models[0].id,
      credits: 0,
      enabled: true,
      reason: "Invalid credit pricing",
    }),
    400,
  );
  await rejected(
    f.superadmin.mutate("model", {
      id: "absent",
      credits: 10,
      enabled: true,
      reason: "Missing model record",
    }),
    404,
  );
  await f.superadmin.mutate("package", {
    ...packages[0],
    enabled: false,
    reason: "Retire old credit offer",
  });
  assert.equal(
    f.sql
      .prepare("SELECT enabled FROM credit_packages WHERE id=?")
      .get(packages[0].id)!.enabled,
    0,
  );
  assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM audit_logs").get()!.n, 3);
});
test("moderation saves decisions and user notifications", async () => {
  const f = setup(),
    id = crypto.randomUUID();
  f.sql
    .prepare(
      "INSERT INTO creator_listings(id,user_id,name,description,rights_confirmed) VALUES(?,?,?,?,1)",
    )
    .run(id, "alice", "Concept", "A test concept submission");
  await f.superadmin.mutate("listing", {
    id,
    status: "approved",
    reason: "Rights and quality reviewed",
  });
  assert.equal(
    f.sql.prepare("SELECT status FROM creator_listings WHERE id=?").get(id)!
      .status,
    "approved",
  );
  assert.equal(
    f.sql
      .prepare("SELECT COUNT(*) n FROM notifications WHERE user_id=?")
      .get("alice")!.n,
    1,
  );
  const r = crypto.randomUUID();
  f.sql
    .prepare(
      "INSERT INTO reports(id,user_id,character_id,reason) VALUES(?,?,?,?)",
    )
    .run(r, "alice", "nova", "Review this listing");
  await f.superadmin.mutate("report", {
    id: r,
    status: "resolved",
    reason: "Listing issue corrected",
  });
  assert.equal(
    ((await f.superadmin.state("moderation")) as any).reports.length,
    0,
  );
});
test("every admin view loads, pagination is bounded and search escapes wildcards", async () => {
  const f = setup();
  for (const s of [
    "overview",
    "users",
    "credits",
    "payments",
    "models",
    "characters",
    "moderation",
    "activity",
    "integrations",
  ] as const)
    await f.superadmin.state(s);
  for (let i = 0; i < 30; i++)
    f.sql
      .prepare("INSERT INTO users(id,name,email) VALUES(?,?,?)")
      .run("test-" + i, "Person", "person" + i + "@example.test");
  const first: any = await f.superadmin.state("users", "person", 0),
    second: any = await f.superadmin.state("users", "person", 1);
  assert.equal(first.rows.length, 25);
  assert.equal(first.hasMore, true);
  assert.equal(second.rows.length, 5);
  assert.equal(second.hasMore, false);
  assert.equal(
    ((await f.superadmin.state("users", "%")) as any).rows.length,
    0,
  );
  await rejected(f.superadmin.state("users", "", -1), 400);
});
test("all cookie-authenticated writes require the exact origin", () => {
  for (const origin of [undefined, "https://evil.test", "null"])
    assert.equal(
      sameOrigin(
        new Request("https://modeldrops.test/api/admin", {
          method: "POST",
          headers: origin ? { origin } : {},
        }),
      ),
      false,
    );
  assert.equal(
    sameOrigin(
      new Request("https://modeldrops.test/api/admin", {
        method: "POST",
        headers: { origin: "https://modeldrops.test" },
      }),
    ),
    true,
  );
});
