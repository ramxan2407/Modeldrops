import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openLocalDatabase } from "../scripts/local-live/database.mjs";

test("local live state and migrations survive reopening the database", async () => {
  const directory = mkdtempSync(join(tmpdir(), "modeldrops-live-"));
  const path = join(directory, "workspace.sqlite");
  let database = openLocalDatabase(path);
  try {
    await database.DB.prepare("INSERT INTO users(id,name,email) VALUES(?,?,?)")
      .bind("local", "Local user", "local@example.test")
      .run();
    const migrations = database.sql
      .prepare("SELECT COUNT(*) n FROM local_migrations")
      .get().n;
    database.sql.close();
    database = openLocalDatabase(path);
    assert.equal(
      (
        await database.DB.prepare("SELECT name FROM users WHERE id=?")
          .bind("local")
          .first()
      ).name,
      "Local user",
    );
    assert.equal(
      database.sql.prepare("SELECT COUNT(*) n FROM local_migrations").get().n,
      migrations,
    );
  } finally {
    database.sql.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("local live batches roll back all writes when a later statement fails", async () => {
  const { sql, DB } = openLocalDatabase(":memory:");
  try {
    const statement = DB.prepare(
      "INSERT INTO users(id,name,email) VALUES(?,?,?)",
    );
    await assert.rejects(
      DB.batch([
        statement.bind("same", "First", "first@example.test"),
        statement.bind("same", "Duplicate", "duplicate@example.test"),
      ]),
    );
    assert.equal(
      (await DB.prepare("SELECT COUNT(*) n FROM users").first()).n,
      0,
    );
  } finally {
    sql.close();
  }
});
