import test from "node:test";
import assert from "node:assert/strict";
import { demoSignupAllowed, demoAccessAllowed } from "../lib/demo-access";
import { fixture } from "./helpers/lora-fixture";
import { postgresFixture } from "./helpers/postgres-fixture";
import { inviteFixture } from "./helpers/character-fixture";

for (const backend of ["sqlite", "postgres"]) {
  test(`${backend}: beta registration requires an active invitation and fails closed`, async () => {
    const f =
      backend === "postgres"
        ? await postgresFixture()
        : { ...fixture(), close: async () => {} };
    try {
      const db = f.env.DB;
      const env = { DEMO_MODE: "true", SUPER_ADMIN_USER_IDS: "admin" };
      assert.equal(
        await demoSignupAllowed(undefined, env, "new@example.test"),
        false,
      );
      assert.equal(await demoSignupAllowed(db, env, undefined), false);
      assert.equal(await demoSignupAllowed(db, env, "new@example.test"), false);
      // An existing user's display name / email must not grant administrator registration bypass.
      assert.equal(
        await demoSignupAllowed(db, env, "admin@example.test"),
        false,
      );
      assert.equal(
        await demoAccessAllowed(db, env, {
          userId: "admin",
          email: "admin@example.test",
        }),
        true,
      );
      await inviteFixture(db, "new@example.test");
      assert.equal(
        await demoSignupAllowed(db, env, " New@Example.Test "),
        true,
      );
      assert.equal(
        await demoAccessAllowed(db, env, {
          userId: "new",
          email: "new@example.test",
        }),
        true,
      );
      await db
        .prepare("UPDATE demo_testers SET enabled=0 WHERE email=?")
        .bind("new@example.test")
        .run();
      assert.equal(await demoSignupAllowed(db, env, "new@example.test"), false);
      assert.equal(
        await demoAccessAllowed(db, env, {
          userId: "new",
          email: "new@example.test",
        }),
        false,
      );
      assert.equal(
        await demoSignupAllowed(
          undefined,
          { DEMO_MODE: "false" },
          "public@example.test",
        ),
        true,
      );
    } finally {
      await f.close();
    }
  });
}
